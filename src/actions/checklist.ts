'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { mkdir, writeFile, unlink } from 'fs/promises';
import path from 'path';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'default-secret-change-me-in-prod'
);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function updateChecklistItem(prevState: any, formData: FormData) {
    // 1. Authenticate
    const session = cookies().get('session')?.value;
    if (!session) return { message: 'Não autenticado.' };

    let technicianId = '';
    try {
        const { payload } = await jwtVerify(session, JWT_SECRET);
        technicianId = payload.sub as string;
    } catch {
        return { message: 'Sessão inválida.' };
    }

    // 2. Extract Data
    const osId = formData.get('osId') as string;
    const itemId = formData.get('itemId') as string;
    const done = formData.get('done') === 'true'; // Status toggle
    const power = formData.get('power') as string;
    const files = formData.getAll('photos') as File[];

    if (!osId || !itemId) {
        return { message: 'Dados incompletos.' };
    }

    try {
        // 3. Find or Create Execution (Lazy creation)
        let execution = await prisma.serviceExecution.findFirst({
            where: { osId }
        });

        if (!execution) {
            execution = await prisma.serviceExecution.create({
                data: {
                    osId,
                    technicianId,
                    status: 'PENDING',
                    obs: 'Iniciado via checklist',
                }
            });
        }

        // 4. Update or Create Checklist Item
        // We handle this manually because we don't have a unique constraint on [executionId, itemId]

        // CORRECTION: The above upsert logic is flawed because 'id' is uuid and we don't know it.
        // Let's do findFirst -> Update OR Create properly.

        const existingItem = await prisma.checklist.findFirst({
            where: { executionId: execution.id, itemId }
        });

        let savedItemId = existingItem?.id;

        if (existingItem) {
            await prisma.checklist.update({
                where: { id: existingItem.id },
                data: { done, power: done ? power : null }
            });
        } else {
            const newItem = await prisma.checklist.create({
                data: {
                    executionId: execution.id,
                    itemId,
                    done,
                    power: done ? power : null
                }
            });
            savedItemId = newItem.id;
        }

        // 5. Handle File Uploads (Only if Done)
        if (done && files.length > 0 && files[0].size > 0 && savedItemId) {
            // Fetch OS to get Protocolo
            const { getOSById } = await import('@/lib/excel');
            const osData = await getOSById(osId);
            const protocol = osData?.protocolo || 'SEM_PROTOCOLO';

            const baseUploadDir = 'C:\\Programas\\PROJETOS\\fotos';
            const uploadDir = path.join(baseUploadDir, protocol);

            await mkdir(uploadDir, { recursive: true });

            for (const file of files) {
                if (file.size > MAX_FILE_SIZE) continue;
                if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) continue;

                const buffer = Buffer.from(await file.arrayBuffer());

                // Sanitize and Unique Filename
                const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1000)}`;
                const fileName = `${uniqueSuffix}-${safeName}`;

                const filePath = path.join(uploadDir, fileName);

                await writeFile(filePath, buffer);

                // Save photo record linked to checklist
                await prisma.photo.create({
                    data: {
                        executionId: execution.id,
                        checklistId: savedItemId,
                        path: `/api/images/${protocol}/${fileName}`
                    }
                });
            }
        }

        revalidatePath(`/os/${osId}`);

        // Create Notification if marked as done
        if (done) {
            const { createNotification } = await import('@/actions/notification');
            const { getOSById: getOS } = await import('@/lib/excel');
            const osInfo = await getOS(osId);
            const proto = osInfo?.protocolo || osId;
            // Resolve CTO name from Excel items
            const ctoItem = osInfo?.items?.find((item: any) => String(item.id) === itemId);
            const ctoName = ctoItem?.cto || itemId;
            // Get technician name
            const tech = await prisma.technician.findUnique({ where: { id: execution.technicianId }, select: { name: true, fullName: true } });
            const techName = tech?.fullName || tech?.name || 'Técnico';
            await createNotification({
                type: 'CHECKLIST',
                title: 'Caixa Verificada',
                message: `${techName} marcou CTO ${ctoName} na OS ${proto}`,
                technicianId: execution.technicianId,
                osId
            });
        }

        return { success: true, message: 'Item atualizado!' };

    } catch (error) {
        console.error('Error updating checklist:', error);
        return { message: 'Erro ao atualizar item.' };
    }
}

export async function deleteChecklistPhoto(photoId: string, osId: string) {
    const session = cookies().get('session')?.value;
    if (!session) return { message: 'Não autenticado.' };

    try {
        await jwtVerify(session, JWT_SECRET);
    } catch {
        return { message: 'Sessão inválida.' };
    }

    try {
        const photo = await prisma.photo.findUnique({ where: { id: photoId } });
        if (!photo) return { message: 'Foto não encontrada.' };

        // 1. Remove file
        let absolutePath = '';
        if (photo.path.startsWith('/api/images/')) {
            // New path format: /api/images/PROTOCOL/FILENAME
            const relativePath = photo.path.replace('/api/images/', '');
            absolutePath = path.join('C:\\Programas\\PROJETOS\\fotos', relativePath);
        } else {
            // Old path format (fallback)
            absolutePath = path.join(process.cwd(), 'public', photo.path);
        }

        try {
            await unlink(absolutePath);
        } catch (e) {
            console.error('Error deleting file (might be missing):', e);
        }

        // 2. Remove record
        await prisma.photo.delete({ where: { id: photoId } });

        revalidatePath(`/os/${osId}`);
        return { success: true, message: 'Foto removida.' };
    } catch (error) {
        console.error('Error deleting photo:', error);
        return { message: 'Erro ao remover foto.' };
    }
}

export async function resetChecklistItem(osId: string, itemId: string) {
    const session = cookies().get('session')?.value;
    if (!session) return { message: 'Não autenticado.' };

    try {
        await jwtVerify(session, JWT_SECRET);
    } catch {
        return { message: 'Sessão inválida.' };
    }

    try {
        const execution = await prisma.serviceExecution.findFirst({
            where: { osId }
        });

        if (!execution) return { message: 'Execução não encontrada.' };

        const checklistItem = await prisma.checklist.findFirst({
            where: { executionId: execution.id, itemId },
            include: { photos: true }
        });

        if (!checklistItem) return { message: 'Item não encontrado.' };

        // Delete associated photos (files + records)
        for (const photo of checklistItem.photos) {
            try {
                let absolutePath = '';
                if (photo.path.startsWith('/api/images/')) {
                    const relativePath = photo.path.replace('/api/images/', '');
                    absolutePath = path.join('C:\\Programas\\PROJETOS\\fotos', relativePath);
                } else {
                    absolutePath = path.join(process.cwd(), 'public', photo.path);
                }
                await unlink(absolutePath);
            } catch (e) {
                console.error('Error deleting photo file:', e);
            }
            await prisma.photo.delete({ where: { id: photo.id } });
        }

        // Delete checklist item
        await prisma.checklist.delete({ where: { id: checklistItem.id } });

        revalidatePath(`/os/${osId}`);
        return { success: true, message: 'Item desmarcado.' };
    } catch (error) {
        console.error('Error resetting checklist item:', error);
        return { message: 'Erro ao desmarcar item.' };
    }
}
