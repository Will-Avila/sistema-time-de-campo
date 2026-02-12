'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { mkdir, writeFile, unlink } from 'fs/promises';
import path from 'path';
import type { ActionResult } from '@/lib/types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const checklistSchema = z.object({
    osId: z.string().min(1, 'osId obrigatório'),
    itemId: z.string().min(1, 'itemId obrigatório'),
    done: z.preprocess((v) => v ?? 'false', z.enum(['true', 'false'])),
    power: z.preprocess((v) => v || undefined, z.string().optional()),
});

export async function updateChecklistItem(prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
    // 1. Authenticate (centralized)
    const session = await requireAuth().catch(() => null);
    if (!session) return { success: false, message: 'Não autenticado.' };

    const technicianId = session.id;

    // 2. Validate input
    const parsed = checklistSchema.safeParse({
        osId: formData.get('osId'),
        itemId: formData.get('itemId'),
        done: formData.get('done'),
        power: formData.get('power'),
    });

    if (!parsed.success) {
        return { success: false, message: 'Dados inválidos: ' + parsed.error.issues.map(i => i.message).join(', ') };
    }

    const { osId, itemId, power } = parsed.data;
    const done = parsed.data.done === 'true';
    const files = formData.getAll('photos') as File[];

    try {
        // 3. Find or Create Execution (Lazy creation)
        let execution = await prisma.serviceExecution.findFirst({
            where: { osId }
        });

        // Get tech name for archival
        const tech = await prisma.technician.findUnique({ where: { id: technicianId }, select: { name: true, fullName: true } });
        const techName = tech?.fullName || tech?.name || 'Técnico';

        if (!execution) {
            execution = await prisma.serviceExecution.create({
                data: {
                    osId,
                    technicianId,
                    technicianName: techName,
                    status: 'PENDING',
                    obs: 'Iniciado via checklist',
                }
            });
        } else if (!execution.technicianName) {
            // Update existing execution with name if it was missing
            execution = await prisma.serviceExecution.update({
                where: { id: execution.id },
                data: { technicianName: techName }
            });
        }

        // 4. Update or Create Checklist Item
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

        // Update OS status if item is marked as done
        if (done) {
            await prisma.orderOfService.update({
                where: { id: osId },
                data: { status: 'Em execução' }
            });
        }

        // 5. Handle File Uploads (Only if Done)
        if (done && files.length > 0 && files[0].size > 0 && savedItemId) {
            const { getOSById } = await import('@/lib/excel');
            const osData = await getOSById(osId);
            const protocol = osData?.protocolo || 'SEM_PROTOCOLO';

            const baseUploadDir = process.env.PHOTOS_PATH || 'C:\\Programas\\PROJETOS\\fotos';
            const uploadDir = path.join(baseUploadDir, protocol);

            await mkdir(uploadDir, { recursive: true });

            for (const file of files) {
                if (file.size > MAX_FILE_SIZE) continue;
                if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) continue;

                const buffer = Buffer.from(await file.arrayBuffer());

                const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1000)}`;
                const fileName = `${uniqueSuffix}-${safeName}`;

                const filePath = path.join(uploadDir, fileName);

                await writeFile(filePath, buffer);

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
            const ctoItem = osInfo?.items?.find((item) => String(item.id) === itemId);
            const ctoName = ctoItem?.cto || itemId;

            await createNotification({
                type: 'CHECKLIST',
                title: 'Caixa Verificada',
                message: `${techName} marcou CTO ${ctoName} na OS ${proto}`,
                technicianId: execution.technicianId || undefined,
                technicianName: techName,
                osId: proto // Use 'proto' here to avoid potential confusion/shadowing with the outer 'osId' if 'proto' is the intended display value.
            });
        }

        return { success: true, message: 'Item atualizado!' };

    } catch (error) {
        logger.error('Error updating checklist', { error: String(error) });
        return { success: false, message: 'Erro ao atualizar item.' };
    }
}

export async function deleteChecklistPhoto(photoId: string, osId: string) {
    const session = await requireAuth().catch(() => null);
    if (!session) return { success: false, message: 'Não autenticado.' };

    try {
        const photo = await prisma.photo.findUnique({ where: { id: photoId } });
        if (!photo) return { success: false, message: 'Foto não encontrada.' };

        // 1. Remove file
        let absolutePath = '';
        if (photo.path.startsWith('/api/images/')) {
            const relativePath = photo.path.replace('/api/images/', '');
            absolutePath = path.join(process.env.PHOTOS_PATH || 'C:\\Programas\\PROJETOS\\fotos', relativePath);
        } else {
            absolutePath = path.join(process.cwd(), 'public', photo.path);
        }

        try {
            await unlink(absolutePath);
        } catch (e) {
            logger.warn('Error deleting file (might be missing)', { error: String(e) });
        }

        // 2. Remove record
        await prisma.photo.delete({ where: { id: photoId } });

        revalidatePath(`/os/${osId}`);
        return { success: true, message: 'Foto removida.' };
    } catch (error) {
        logger.error('Error deleting photo', { error: String(error) });
        return { success: false, message: 'Erro ao remover foto.' };
    }
}

export async function resetChecklistItem(osId: string, itemId: string) {
    const session = await requireAuth().catch(() => null);
    if (!session) return { success: false, message: 'Não autenticado.' };

    try {
        const execution = await prisma.serviceExecution.findFirst({
            where: { osId }
        });

        if (!execution) return { success: false, message: 'Execução não encontrada.' };

        const checklistItem = await prisma.checklist.findFirst({
            where: { executionId: execution.id, itemId },
            include: { photos: true }
        });

        if (!checklistItem) return { success: false, message: 'Item não encontrado.' };

        // Delete associated photos (files + records)
        for (const photo of checklistItem.photos) {
            try {
                let absolutePath = '';
                if (photo.path.startsWith('/api/images/')) {
                    const relativePath = photo.path.replace('/api/images/', '');
                    absolutePath = path.join(process.env.PHOTOS_PATH || 'C:\\Programas\\PROJETOS\\fotos', relativePath);
                } else {
                    absolutePath = path.join(process.cwd(), 'public', photo.path);
                }
                await unlink(absolutePath);
            } catch (e) {
                logger.warn('Error deleting photo file', { error: String(e) });
            }
            await prisma.photo.delete({ where: { id: photo.id } });
        }

        // Delete checklist item
        await prisma.checklist.delete({ where: { id: checklistItem.id } });

        revalidatePath(`/os/${osId}`);
        return { success: true, message: 'Item desmarcado.' };
    } catch (error) {
        logger.error('Error resetting checklist', { error: String(error) });
        return { success: false, message: 'Erro ao desmarcar item.' };
    }
}

export async function uploadChecklistPhotos(formData: FormData): Promise<ActionResult> {
    const session = await requireAuth().catch(() => null);
    if (!session) return { success: false, message: 'Não autenticado.' };

    const osId = formData.get('osId') as string;
    const itemId = formData.get('itemId') as string;
    const files = formData.getAll('photos') as File[];

    if (!osId || !itemId || files.length === 0) {
        return { success: false, message: 'Dados incompletos.' };
    }

    try {
        // 1. Find or Create Execution
        let execution = await prisma.serviceExecution.findFirst({
            where: { osId }
        });

        const tech = await prisma.technician.findUnique({ where: { id: session.id }, select: { name: true, fullName: true } });
        const techName = tech?.fullName || tech?.name || 'Técnico';

        if (!execution) {
            execution = await prisma.serviceExecution.create({
                data: {
                    osId,
                    technicianId: session.id,
                    technicianName: techName,
                    status: 'PENDING',
                    obs: 'Iniciado via upload de fotos',
                }
            });
        } else if (!execution.technicianName) {
            execution = await prisma.serviceExecution.update({
                where: { id: execution.id },
                data: { technicianName: techName }
            });
        }

        // 2. Find or Create Checklist Item
        let checklistItem = await prisma.checklist.findFirst({
            where: { executionId: execution.id, itemId }
        });

        if (!checklistItem) {
            checklistItem = await prisma.checklist.create({
                data: {
                    executionId: execution.id,
                    itemId,
                    done: false, // Default to false if just adding photos? Or keep it as is.
                }
            });
        }

        // 3. Process Files
        const { getOSById } = await import('@/lib/excel');
        const osData = await getOSById(osId);
        const protocol = osData?.protocolo || 'SEM_PROTOCOLO';

        const baseUploadDir = process.env.PHOTOS_PATH || 'C:\\Programas\\PROJETOS\\fotos';
        const uploadDir = path.join(baseUploadDir, protocol);

        await mkdir(uploadDir, { recursive: true });

        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) continue;
            if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) continue;

            const buffer = Buffer.from(await file.arrayBuffer());
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1000)}`;
            const fileName = `${uniqueSuffix}-${safeName}`;
            const filePath = path.join(uploadDir, fileName);

            await writeFile(filePath, buffer);

            await prisma.photo.create({
                data: {
                    executionId: execution.id,
                    checklistId: checklistItem.id,
                    path: `/api/images/${protocol}/${fileName}`
                }
            });
        }

        revalidatePath(`/os/${osId}`);
        return { success: true, message: 'Fotos adicionadas.' };
    } catch (error) {
        logger.error('Error uploading photos', { error: String(error) });
        return { success: false, message: 'Erro ao salvar fotos.' };
    }
}
