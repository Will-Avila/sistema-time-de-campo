'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getSession, requireAdmin } from '@/lib/auth';
import { logger } from '@/lib/logger';

type NotificationType = 'CHECKLIST' | 'OS_CLOSE';

export async function createNotification(data: {
    type: NotificationType;
    title: string;
    message: string;
    technicianId?: string;
    osId?: string;
}) {
    try {
        logger.info('Creating notification', { type: data.type, title: data.title });
        await prisma.notification.create({
            data: {
                ...data,
                read: false,
            }
        });
        return { success: true };
    } catch (error) {
        logger.error('Error creating notification', { error: String(error) });
        return { success: false };
    }
}

export async function getUnreadNotifications() {
    const session = await getSession();
    if (!session) return [];
    if (!session.isAdmin) return [];

    try {
        const notifications = await prisma.notification.findMany({
            where: { read: false },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { technician: { select: { name: true, fullName: true } } }
        });
        return notifications;
    } catch (error) {
        logger.error('Error fetching notifications', { error: String(error) });
        return [];
    }
}

export async function markAsRead(id: string) {
    // Auth guard: only admins can manage notifications
    try {
        await requireAdmin();
    } catch {
        return { success: false, message: 'Não autorizado.' };
    }

    try {
        await prisma.notification.update({
            where: { id },
            data: { read: true }
        });
        revalidatePath('/admin');
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Erro ao marcar notificação.' };
    }
}

export async function markAllAsRead() {
    // Auth guard: only admins can manage notifications
    try {
        await requireAdmin();
    } catch {
        return { success: false, message: 'Não autorizado.' };
    }

    try {
        await prisma.notification.updateMany({
            where: { read: false },
            data: { read: true }
        });
        revalidatePath('/admin');
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Erro ao marcar notificações.' };
    }
}
