'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'default-secret-change-me-in-prod'
);

export async function createNotification(data: {
    type: string;
    title: string;
    message: string;
    technicianId?: string;
    osId?: string;
}) {
    try {
        console.log('[NOTIF] Creating notification:', JSON.stringify(data));
        const created = await prisma.notification.create({
            data: {
                ...data,
                read: false,
            }
        });
        console.log('[NOTIF] Created successfully:', created.id);
        return { success: true };
    } catch (error) {
        console.error('[NOTIF] Error creating notification:', error);
        return { success: false };
    }
}

export async function getUnreadNotifications() {
    const session = cookies().get('session')?.value;
    if (!session) {
        console.log('[NOTIF] No session found');
        return [];
    }

    try {
        const { payload } = await jwtVerify(session, JWT_SECRET);
        console.log('[NOTIF] JWT payload:', JSON.stringify(payload));
        if (!payload.isAdmin) {
            console.log('[NOTIF] User is not admin, skipping notifications');
            return [];
        }
    } catch (e) {
        console.error('[NOTIF] JWT verification failed:', e);
        return [];
    }

    try {
        const notifications = await prisma.notification.findMany({
            where: { read: false },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { technician: true }
        });
        console.log('[NOTIF] Found', notifications.length, 'unread notifications');
        return notifications;
    } catch (error) {
        console.error('[NOTIF] Error fetching notifications:', error);
        return [];
    }
}

export async function markAsRead(id: string) {
    try {
        await prisma.notification.update({
            where: { id },
            data: { read: true }
        });
        revalidatePath('/admin');
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

export async function markAllAsRead() {
    try {
        await prisma.notification.updateMany({
            where: { read: false },
            data: { read: true }
        });
        revalidatePath('/admin');
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}
