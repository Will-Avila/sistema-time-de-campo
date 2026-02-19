'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getSession, requireAdmin } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { getAllOS } from '@/lib/excel';

type NotificationType = 'CHECKLIST' | 'OS_CLOSE' | 'NEW_OS';

// In-memory debounce to prevent spamming Excel reads on every notification check
let lastSyncTime = 0;
const SYNC_INTERVAL = 60 * 1000; // 1 minute

export async function createNotification(data: {
    type: NotificationType;
    title: string;
    message: string;
    equipeId?: string;
    technicianName?: string;
    osId?: string;
}) {
    try {
        logger.info('Creating notification', { type: data.type, title: data.title });
        await prisma.notification.create({
            data: {
                ...data,
                read: false,
                type: data.type as string,
            }
        });
        return { success: true };
    } catch (error) {
        logger.error('Error creating notification', { error: String(error) });
        return { success: false };
    }
}

export async function cleanupOldNotifications() {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const result = await prisma.notification.deleteMany({
            where: {
                OR: [
                    { read: true },
                    { archived: true }
                ],
                createdAt: { lt: sevenDaysAgo }
            }
        });

        logger.info(`Cleaned up ${result.count} old notifications.`);
        return { success: true, count: result.count };
    } catch (error) {
        logger.error('Error cleaning up notifications', { error: String(error) });
        return { success: false };
    }
}

export async function syncNewOSNotifications() {
    try {
        // 1. Get all OS from Excel
        const allOS = await getAllOS();
        if (allOS.length === 0) return;

        // 2. Identify new OSs by checking NEW_OS notifications
        const notifiedDir = await prisma.notification.findMany({
            where: { type: 'NEW_OS', osId: { not: null } },
            select: { osId: true },
            distinct: ['osId']
        });
        const notifiedOSIds = new Set(notifiedDir.map(n => n.osId));
        const newOSs = allOS.filter(os => !notifiedOSIds.has(os.id));

        if (newOSs.length === 0) return;

        logger.info(`Found ${newOSs.length} new OSs to notify.`);

        // 3. Get all active equipes
        const equipes = await prisma.equipe.findMany({
            select: { id: true, isAdmin: true }
        });

        const admins = equipes.filter(e => e.isAdmin);
        const techs = equipes.filter(e => !e.isAdmin);

        // 4. Logic for Creating Notifications
        if (newOSs.length <= 5) {
            // Few OSs: Individual notifications for everyone
            for (const os of newOSs) {
                const osDisplay = os.protocolo || os.id;
                const message = `A OS ${osDisplay} foi adicionada em ${os.uf}, prazo ${os.dataPrevExec}`;

                await prisma.notification.createMany({
                    data: equipes.map(eq => ({
                        type: 'NEW_OS',
                        title: 'Nova Ordem de Serviço',
                        message: message,
                        read: false,
                        osId: os.id,
                        equipeId: eq.id
                    }))
                });
            }
        } else {
            // Many OSs: Individual for Admins (first 10), Aggregated for Techs
            // Create individual for admins (limit to 10 to avoid noise)
            const limitedNewOSs = newOSs.slice(0, 10);
            for (const os of limitedNewOSs) {
                await prisma.notification.createMany({
                    data: admins.map(admin => ({
                        type: 'NEW_OS',
                        title: 'Nova Ordem de Serviço',
                        message: `A OS ${os.protocolo || os.id} foi adicionada.`,
                        read: false,
                        osId: os.id,
                        equipeId: admin.id
                    }))
                });
            }

            // Aggregated notification for Techs
            const summaryMessage = `Existem ${newOSs.length} novas Ordens de Serviço disponíveis no sistema.`;
            await prisma.notification.createMany({
                data: techs.map(tech => ({
                    type: 'NEW_OS',
                    title: 'Novas OS Disponíveis',
                    message: summaryMessage,
                    read: false,
                    equipeId: tech.id
                }))
            });

            // Mark the remaining OSs as "notified" even if they didn't get individual notifications
            // We do this by creating a ghost notification or just knowing the limit.
            // Actually, to keep tracking correct, we should create a record that these OSs are 'processed'.
            // Let's create a single entry for the first Admin for each un-notified OS just to block them in notifiedOSIds.
            if (admins.length > 0) {
                const restOSs = newOSs.slice(10);
                for (const os of restOSs) {
                    await prisma.notification.create({
                        data: {
                            type: 'NEW_OS',
                            title: 'Nova OS (Processada)',
                            message: `OS ${os.protocolo || os.id} processada em lote.`,
                            read: true,
                            archived: true,
                            osId: os.id,
                            equipeId: admins[0].id
                        }
                    });
                }
            }
        }

    } catch (error) {
        logger.error('Error syncing new OS notifications', { error: String(error) });
    }
}

export async function getUnreadNotifications() {
    const session = await getSession();
    if (!session) return [];

    // Trigger sync removed from polling to avoid overhead.
    // Sync will now happen on explicit Data Sync/Upload.

    try {
        let whereClause: any = { archived: false };

        const isManagement = session.isAdmin || session.role === 'SUPERVISOR';

        if (isManagement) {
            // Management (Admin/Gestor) sees:
            // 1. All system events (CHECKLIST, OS_CLOSE)
            // 2. Their own 'NEW_OS' notifications
            whereClause.OR = [
                { type: { in: ['CHECKLIST', 'OS_CLOSE'] } },
                { type: 'NEW_OS', equipeId: session.id }
            ];
        } else {
            // Tech sees:
            // 1. Only their own 'NEW_OS' notifications
            whereClause.type = 'NEW_OS';
            whereClause.equipeId = session.id;
        }

        const notifications = await prisma.notification.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { equipe: { select: { name: true, fullName: true, nomeEquipe: true } } }
        });
        return notifications;
    } catch (error) {
        logger.error('Error fetching notifications', { error: String(error) });
        return [];
    }
}

export async function markAsRead(id: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Não autorizado.' };

    try {
        const notification = await prisma.notification.findUnique({ where: { id } });
        if (!notification) return { success: false, message: 'Não encontrada.' };

        // Authorization Logic:
        // 1. If it's targeted (NEW_OS), only recipient can read.
        // 2. If it's system (CHECKLIST/OS_CLOSE), any Admin can read.
        const isManagement = session.isAdmin || session.role === 'SUPERVISOR';

        if (isSystemNotif) {
            if (!isManagement) return { success: false, message: 'Não autorizado.' };
        } else {
            // Targeted (NEW_OS)
            if (!isRecipient) return { success: false, message: 'Não autorizado.' };
        }

        await prisma.notification.update({
            where: { id },
            data: { read: true }
        });

        revalidatePath('/admin');
        revalidatePath('/os'); // Refresh for tech too

        return { success: true };
    } catch (error) {
        return { success: false, message: 'Erro ao marcar notificação.' };
    }
}

export async function archiveAllNotifications() {
    const session = await getSession();
    if (!session) return { success: false, message: 'Não autorizado.' };

    try {
        let whereClause: any = { archived: false };

        const isManagement = session.isAdmin || session.role === 'SUPERVISOR';

        if (isManagement) {
            whereClause.OR = [
                { type: { in: ['CHECKLIST', 'OS_CLOSE'] } },
                { type: 'NEW_OS', equipeId: session.id }
            ];
        } else {
            whereClause.type = 'NEW_OS';
            whereClause.equipeId = session.id;
        }

        await prisma.notification.updateMany({
            where: whereClause,
            data: { archived: true, read: true } as any
        });

        revalidatePath('/admin');
        revalidatePath('/os');

        return { success: true };
    } catch (error) {
        return { success: false, message: 'Erro ao marcar notificações.' };
    }
}
