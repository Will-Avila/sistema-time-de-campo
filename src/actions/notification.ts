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

async function syncNewOSNotifications() {
    const now = Date.now();
    if (now - lastSyncTime < SYNC_INTERVAL) {
        return;
    }
    lastSyncTime = now;

    try {
        // 1. Get all OS from Excel
        const allOS = await getAllOS();
        if (allOS.length === 0) return;

        // 2. Get all OS IDs that we already notified about (global check)
        // We look for 'NEW_OS' type notifications. 
        // We use distinct osId to get the list of OSs we already know about.
        const notifiedDir = await prisma.notification.findMany({
            where: { type: 'NEW_OS', osId: { not: null } },
            select: { osId: true },
            distinct: ['osId']
        });
        const notifiedOSIds = new Set(notifiedDir.map(n => n.osId));

        // 3. Identify new OSs
        const newOSs = allOS.filter(os => !notifiedOSIds.has(os.id));

        if (newOSs.length === 0) return;

        logger.info(`Found ${newOSs.length} new OSs to notify.`);

        // 4. Get all active equipes (inc. admins) to broadcast to
        const equipes = await prisma.equipe.findMany({
            select: { id: true }
        });

        // 5. Create notifications in bulk
        // For each New OS, create a notification for EACH technician
        // This might be heavy if many new OS + many techs, but typically it's incremental.

        // Limit to preventing explosion:
        // If > 50 new OSs, maybe just notify generic "X novas OSs"?
        // But user asked for specific "OS [Num] added...".
        // Let's limit to processing top 10 newest to avoid timeouts if first run?
        // Or just let it run.

        for (const os of newOSs) {
            // Use Protocol as requested (fallback to ID if empty)
            const osDisplay = os.protocolo || os.id;
            const message = `A OS ${osDisplay} foi adicionada em ${os.uf}, prazo ${os.dataPrevExec}`;

            // We use createMany for efficiency if possible, but Prisma w/ SQLite createMany is supported.
            const notificationsData = equipes.map(eq => ({
                type: 'NEW_OS',
                title: 'Nova Ordem de Serviço',
                message: message,
                read: false,
                osId: os.id,
                equipeId: eq.id,
                createdAt: new Date()
            }));

            await prisma.notification.createMany({
                data: notificationsData
            });
        }

    } catch (error) {
        logger.error('Error syncing new OS notifications', { error: String(error) });
    }
}

export async function getUnreadNotifications() {
    const session = await getSession();
    if (!session) return [];

    // Trigger sync (debounced)
    await syncNewOSNotifications();

    try {
        let whereClause: any = { read: false };

        if (session.isAdmin) {
            // Admin sees:
            // 1. All system events (CHECKLIST, OS_CLOSE) - effectively a shared inbox for admins
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
        const isSystemNotif = ['CHECKLIST', 'OS_CLOSE'].includes(notification.type);
        const isRecipient = notification.equipeId === session.id;

        if (isSystemNotif) {
            if (!session.isAdmin) return { success: false, message: 'Não autorizado.' };
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

export async function markAllAsRead() {
    const session = await getSession();
    if (!session) return { success: false, message: 'Não autorizado.' };

    try {
        let whereClause: any = { read: false };

        if (session.isAdmin) {
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
            data: { read: true }
        });

        revalidatePath('/admin');
        revalidatePath('/os');

        return { success: true };
    } catch (error) {
        return { success: false, message: 'Erro ao marcar notificações.' };
    }
}
