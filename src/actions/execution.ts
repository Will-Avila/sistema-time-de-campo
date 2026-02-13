'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import type { ActionResult } from '@/lib/types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const closeOSSchema = z.object({
    osId: z.preprocess((v) => v ?? '', z.string().min(1, 'osId obrigatório')),
    status: z.preprocess((v) => v ?? '', z.enum(['Concluída', 'Sem Execução'], { errorMap: () => ({ message: 'Status inválido' }) })),
    obs: z.preprocess((v) => v ?? '', z.string().default('')),
});

export async function closeOS(prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
    // 1. Authenticate (centralized)
    const session = await requireAuth().catch(() => null);
    if (!session) return { success: false, message: 'Não autenticado.' };

    const equipeId = session.id;

    // 2. Validate input
    const parsed = closeOSSchema.safeParse({
        osId: formData.get('osId'),
        status: formData.get('status'),
        obs: formData.get('obs'),
    });

    if (!parsed.success) {
        return { success: false, message: 'Dados inválidos: ' + parsed.error.issues.map(i => i.message).join(', ') };
    }

    const { osId, status, obs } = parsed.data;
    const files = formData.getAll('photos') as File[];

    try {
        // Get tech name for archival
        const equipe = await prisma.equipe.findUnique({ where: { id: equipeId }, select: { name: true, fullName: true, nomeEquipe: true } });
        const techName = equipe?.fullName || equipe?.nomeEquipe || equipe?.name || 'Equipe';

        // 3. Save to DB (Handle existing execution from checklist)
        let execution = await prisma.serviceExecution.findFirst({
            where: { osId }
        });

        if (execution) {
            execution = await prisma.serviceExecution.update({
                where: { id: execution.id },
                data: {
                    equipeId,
                    technicianName: techName,
                    status: 'DONE',
                    obs: `Status: ${status}\n${obs}`,
                }
            });
        } else {
            execution = await prisma.serviceExecution.create({
                data: {
                    osId,
                    equipeId,
                    technicianName: techName,
                    status: 'DONE',
                    power: '',
                    obs: `Status: ${status}\n${obs}`,
                }
            });
        }

        // 4. Handle File Uploads
        if (files.length > 0 && files[0].size > 0) {
            const { getOSById } = await import('@/lib/excel');
            const osData = await getOSById(osId);
            const protocol = osData?.protocolo || 'SEM_PROTOCOLO';

            const baseUploadDir = process.env.PHOTOS_PATH || 'C:\\Programas\\PROJETOS\\anexos';
            const uploadDir = path.join(baseUploadDir, protocol);

            await mkdir(uploadDir, { recursive: true });

            for (const file of files) {
                if (file.size > MAX_FILE_SIZE) continue;
                if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) continue;

                const buffer = Buffer.from(await file.arrayBuffer());
                const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const fileName = `${Date.now()}-${safeName}`;
                const filePath = path.join(uploadDir, fileName);

                await writeFile(filePath, buffer);

                await prisma.photo.create({
                    data: {
                        executionId: execution.id,
                        path: `/api/images/${protocol}/${fileName}`
                    }
                });
            }
        }

        revalidatePath(`/os/${osId}`);
        revalidatePath('/os');
        revalidatePath('/admin/dashboard');

        // Create Notification
        const { createNotification } = await import('@/actions/notification');
        const { getOSById: getOS } = await import('@/lib/excel');
        const osInfo = await getOS(osId);
        const proto = osInfo?.protocolo || osId;

        await createNotification({
            type: 'OS_CLOSE',
            title: 'OS Encerrada',
            message: `${techName} encerrou a OS ${proto}. Status: ${status}`,
            equipeId,
            technicianName: techName, // Pass to notification too
            osId
        });

        return { success: true, message: 'OS encerrada com sucesso!' };

    } catch (error) {
        logger.error('Error closing OS', { error: String(error) });
        return { success: false, message: 'Erro ao salvar OS. Tente novamente.' };
    }
}

export async function deleteExecutionPhoto(photoId: string, osId: string) {
    const session = await requireAuth().catch(() => null);
    if (!session) return { success: false, message: 'Não autenticado.' };

    try {
        const photo = await prisma.photo.findUnique({ where: { id: photoId } });
        if (!photo) return { success: false, message: 'Foto não encontrada.' };

        // 1. Remove file
        let absolutePath = '';
        if (photo.path.startsWith('/api/images/')) {
            const relativePath = photo.path.replace('/api/images/', '');
            absolutePath = path.join(process.env.PHOTOS_PATH || 'C:\\Programas\\PROJETOS\\anexos', relativePath);
        } else {
            absolutePath = path.join(process.cwd(), 'public', photo.path);
        }

        try {
            await import('fs/promises').then(fs => fs.unlink(absolutePath));
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
