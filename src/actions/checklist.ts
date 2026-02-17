'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { getTodaySP } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { mkdir, writeFile, unlink } from 'fs/promises';
import path from 'path';
import type { ActionResult } from '@/lib/types';
import { getUploadDir, resolvePhotoPath } from '@/lib/constants';
import { optimizeImage } from '@/lib/images';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const checklistSchema = z.object({
    osId: z.string().min(1, 'osId obrigatório'),
    itemId: z.string().min(1, 'itemId obrigatório'),
    done: z.preprocess((v) => v ?? 'false', z.enum(['true', 'false'])),
    power: z.preprocess((v) => v || undefined, z.string().optional()),
    obs: z.preprocess((v) => v || undefined, z.string().optional()),
    certified: z.preprocess((v) => v === 'true' || v === 'on', z.boolean().default(false)),
});

export async function updateChecklistItem(prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
    // 1. Authenticate (centralized)
    const session = await requireAuth().catch(() => null);
    if (!session) return { success: false, message: 'Não autenticado.' };

    const equipeId = session.id;

    // 2. Validate input
    const parsed = checklistSchema.safeParse({
        osId: formData.get('osId'),
        itemId: formData.get('itemId'),
        done: formData.get('done'),
        power: formData.get('power'),
        obs: formData.get('obs'),
        certified: formData.get('certified'),
    });

    if (!parsed.success) {
        return { success: false, message: 'Dados inválidos: ' + parsed.error.issues.map(i => i.message).join(', ') };
    }

    const { osId, itemId, power, obs, certified } = parsed.data;
    const done = parsed.data.done === 'true';
    const files = formData.getAll('photos') as File[];

    try {
        // Validation: Check current status to determine ownership update
        const currentBox = await prisma.caixaAlare.findUnique({
            where: { id: itemId },
            select: { status: true, equipe: true }
        });
        // 3. Find or Create Execution (Lazy creation)
        let execution = await prisma.serviceExecution.findFirst({
            where: { osId }
        });

        // Get equipe name for archival
        const equipe = await prisma.equipe.findUnique({ where: { id: equipeId }, select: { name: true, fullName: true, nomeEquipe: true } });
        const techName = equipe?.fullName || equipe?.nomeEquipe || equipe?.name || 'Equipe';

        if (!execution) {
            execution = await prisma.serviceExecution.create({
                data: {
                    osId,
                    equipeId,
                    technicianName: techName,
                    status: 'PENDING',
                    obs: 'Trabalho de campo iniciado',
                }
            });
        } else if (!execution.technicianName) {
            // Update existing execution with name if it was missing
            execution = await prisma.serviceExecution.update({
                where: { id: execution.id },
                data: { technicianName: techName }
            });
        }

        // 4. Update Box status, Ownership and Technician Name
        const boxStatus = done ? 'OK' : 'NOK';

        // Prepare data for CaixaAlare update
        const boxUpdateData: any = {
            status: boxStatus,
            potencia: power || '',
            certified: certified,
            obs: obs || ''
        };

        // Only update ownership if the box was NOT already completed (OK)
        // This preserves the original technician's credit while allowing edits
        if (currentBox?.status !== 'OK') {
            boxUpdateData.equipe = equipeId;
            boxUpdateData.nomeEquipe = techName;
            // Record today's date if it's being marked as OK for the first time or re-verified
            if (boxStatus === 'OK') {
                boxUpdateData.data = getTodaySP();
            }
        }

        await prisma.caixaAlare.update({
            where: { id: itemId },
            data: boxUpdateData
        });

        if (done) {
            await prisma.orderOfService.update({
                where: { id: osId },
                data: { status: 'Em execução' }
            });
        }

        // 5. Handle File Uploads (Only if Done)
        // Using itemId as designated caixaId
        if (done && files.length > 0 && files[0].size > 0) {
            const { getOSById } = await import('@/lib/excel');
            const osData = await getOSById(osId);
            const protocol = osData?.protocolo || 'SEM_PROTOCOLO';
            const uploadDir = getUploadDir(protocol);

            await mkdir(uploadDir, { recursive: true });

            for (const file of files) {
                if (file.size > MAX_FILE_SIZE) continue;
                if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) continue;

                const buffer = await optimizeImage(Buffer.from(await file.arrayBuffer()));

                const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, "") + ".jpg";
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1000)}`;
                const fileName = `${uniqueSuffix}-${safeName}`;

                const filePath = path.join(uploadDir, fileName);

                await writeFile(filePath, buffer);

                await prisma.photo.create({
                    data: {
                        executionId: execution.id,
                        caixaId: itemId,
                        equipeId: equipeId,
                        path: `/api/images/${protocol}/${fileName}`
                    }
                });
            }
        }

        revalidatePath('/os/[id]', 'page');
        revalidatePath('/os/[id]/execution', 'page');
        revalidatePath('/admin/dashboard');
        revalidatePath('/os');

        // Create Notification if marked as done OR not verified
        const { createNotification } = await import('@/actions/notification');
        const { getOSById: getOS } = await import('@/lib/excel');
        const osInfo = await getOS(osId);
        const proto = osInfo?.protocolo || osId;
        const ctoItem = osInfo?.items?.find((item) => String(item.id) === itemId);
        const ctoName = ctoItem?.cto || itemId;

        if (done) {
            await createNotification({
                type: 'CHECKLIST' as any,
                title: 'Caixa Concluída',
                message: `${techName} concluiu CTO ${ctoName} na OS ${proto}${certified ? ' (Certificada)' : ''}${obs ? ` (Obs: ${obs})` : ''}`,
                equipeId: execution.equipeId || undefined,
                technicianName: techName,
                osId: osId
            });

            if (files.length > 0 && files[0].size > 0) {
                await createNotification({
                    type: 'CHECKLIST' as any,
                    title: 'Fotos Anexadas',
                    message: `${techName} enviou ${files.length} foto(s) da CTO ${ctoName} na OS ${proto}`,
                    equipeId: execution.equipeId || undefined,
                    technicianName: techName,
                    osId: osId
                });
            }
        } else {
            // Marked as NOT Verified
            await createNotification({
                type: 'CHECKLIST' as any,
                title: 'Caixa NÃO Concluída',
                message: `${techName} marcou CTO ${ctoName} como não concluída na OS ${proto}${obs ? ` (Alerta: ${obs})` : ''}`,
                equipeId: execution.equipeId || undefined,
                technicianName: techName,
                osId: osId
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
        const photo = await prisma.photo.findUnique({
            where: { id: photoId }
        });

        if (!photo) return { success: false, message: 'Foto não encontrada.' };

        // Ownership check: Only owner or admin
        if (photo.equipeId !== session.id && !session.isAdmin) {
            return { success: false, message: 'Não autorizado. Você só pode excluir fotos que você mesmo enviou.' };
        }

        try {
            await unlink(resolvePhotoPath(photo.path)).catch(() => { });
        } catch { }
        await prisma.photo.delete({ where: { id: photoId } });

        revalidatePath('/os/[id]', 'page');
        revalidatePath('/os/[id]/execution', 'page');
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
        // Ownership Check: Only owner or Admin can reset
        const box = await prisma.caixaAlare.findUnique({
            where: { id: itemId },
            select: { equipe: true, status: true }
        });

        if (!box) return { success: false, message: 'Caixa não encontrada.' };

        // If it's not the owner and not an admin, block
        if (box.equipe !== session.id && !session.isAdmin) {
            return { success: false, message: 'Não autorizado. Apenas o técnico que realizou a caixa ou um administrador podem desmarcar.' };
        }

        // Find all photos associated with this box (caixaId = itemId)
        const photos = await prisma.photo.findMany({
            where: { caixaId: itemId }
        });

        // Delete associated photos (files + records)
        for (const photo of photos) {
            try {
                await unlink(resolvePhotoPath(photo.path));
            } catch (e) {
                logger.warn('Error deleting photo file', { error: String(e) });
            }
            await prisma.photo.delete({ where: { id: photo.id } });
        }

        // Always Reset Box status in CaixaAlare
        await prisma.caixaAlare.update({
            where: { id: itemId },
            data: {
                status: 'Pendente',
                equipe: '',
                nomeEquipe: '',
                potencia: '',
                certified: false,
                obs: ''
            }
        });

        revalidatePath('/os/[id]', 'page');
        revalidatePath('/os/[id]/execution', 'page');

        // Create notification for reset
        const { createNotification } = await import('@/actions/notification');
        const { getOSById: getOS } = await import('@/lib/excel');
        const osInfo = await getOS(osId);
        const proto = osInfo?.protocolo || osId;
        const ctoItem = osInfo?.items?.find((item) => String(item.id) === itemId);
        const ctoName = ctoItem?.cto || itemId;

        const resetEquipe = await prisma.equipe.findUnique({ where: { id: session.id }, select: { name: true, fullName: true, nomeEquipe: true } });
        const resetTechName = resetEquipe?.fullName || resetEquipe?.nomeEquipe || resetEquipe?.name || 'Equipe';

        await createNotification({
            type: 'CHECKLIST' as any,
            title: 'Caixa Desmarcada',
            message: `${resetTechName} desmarcou a CTO ${ctoName} na OS ${proto} (fotos removidas)`,
            equipeId: session.id,
            technicianName: resetTechName,
            osId: osId
        });

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
    // power/obs/certified are handled via updateChecklistItem usually, but here we just upload photos mainly.
    // If we wanted to update status via upload, we would need those. But usually upload is supplemental or separate?
    // The original logic created a checklist item. Here we assume the box manages state.

    const files = formData.getAll('photos') as File[];

    if (!osId || !itemId || files.length === 0) {
        return { success: false, message: 'Dados incompletos.' };
    }

    try {
        // 1. Find or Create Execution
        let execution = await prisma.serviceExecution.findFirst({
            where: { osId }
        });

        const equipe = await prisma.equipe.findUnique({ where: { id: session.id }, select: { name: true, fullName: true, nomeEquipe: true } });
        const techName = equipe?.fullName || equipe?.nomeEquipe || equipe?.name || 'Equipe';

        if (!execution) {
            execution = await prisma.serviceExecution.create({
                data: {
                    osId,
                    equipeId: session.id,
                    technicianName: techName,
                    status: 'PENDING',
                    obs: 'Trabalho de campo iniciado',
                }
            });
        } else if (!execution.technicianName) {
            execution = await prisma.serviceExecution.update({
                where: { id: execution.id },
                data: { technicianName: techName }
            });
        }

        // 3. Process Files
        const { getOSById } = await import('@/lib/excel');
        const osData = await getOSById(osId);
        const protocol = osData?.protocolo || 'SEM_PROTOCOLO';
        const uploadDir = getUploadDir(protocol);

        await mkdir(uploadDir, { recursive: true });

        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) continue;
            if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) continue;

            const buffer = await optimizeImage(Buffer.from(await file.arrayBuffer()));
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, "") + ".jpg";
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1000)}`;
            const fileName = `${uniqueSuffix}-${safeName}`;
            const filePath = path.join(uploadDir, fileName);

            await writeFile(filePath, buffer);

            await prisma.photo.create({
                data: {
                    executionId: execution.id,
                    caixaId: itemId,
                    equipeId: session.id,
                    path: `/api/images/${protocol}/${fileName}`
                }
            });
            logger.info('Photo record created in DB', { caixaId: itemId, path: fileName });
        }

        revalidatePath('/os/[id]', 'page');
        revalidatePath('/os/[id]/execution', 'page');

        // Create notification for photos upload
        const { createNotification } = await import('@/actions/notification');
        const { getOSById: getOS } = await import('@/lib/excel');
        const osInfo = await getOS(osId);
        const proto = osInfo?.protocolo || osId;
        const ctoItem = osInfo?.items?.find((item) => String(item.id) === itemId);
        const ctoName = ctoItem?.cto || itemId;

        await createNotification({
            type: 'CHECKLIST' as any,
            title: 'Novas Fotos Anexadas',
            message: `${techName} enviou ${files.length} novas foto(s) da CTO ${ctoName} na OS ${proto}`,
            equipeId: session.id,
            technicianName: techName,
            osId: osId
        });

        return { success: true, message: 'Fotos adicionadas.' };
    } catch (error) {
        logger.error('Error uploading photos', { error: String(error) });
        return { success: false, message: 'Erro ao salvar fotos.' };
    }
}
