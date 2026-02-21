'use server';

import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import { logger } from '@/lib/logger';
import { getUploadDir, resolvePhotoPath } from '@/lib/constants';

export async function saveOSAdminInfo(formData: FormData) {
    try {
        await requireAdmin();
    } catch {
        return { success: false, message: 'Acesso negado. Apenas administradores.' };
    }

    const osId = formData.get('osId') as string;
    const condominio = formData.get('condominio') as string;
    const descricao = formData.get('descricao') as string;
    const deletedFileIds = formData.getAll('deletedFileIds') as string[];
    const newFiles = formData.getAll('files') as File[];

    if (!osId) return { success: false, message: 'ID da OS inválido.' };

    try {
        await prisma.orderOfService.update({
            where: { id: osId },
            data: { condominio, descricao }
        });

        // Handle Deletions
        if (deletedFileIds.length > 0) {
            const filesToDelete = await prisma.oSAttachment.findMany({
                where: { id: { in: deletedFileIds } }
            });

            for (const file of filesToDelete) {
                try {
                    await unlink(resolvePhotoPath(file.path));
                } catch (e) {
                    logger.warn('Error deleting file from disk', { error: String(e) });
                }
            }

            await prisma.oSAttachment.deleteMany({
                where: { id: { in: deletedFileIds } }
            });
        }

        // Handle New Uploads
        if (newFiles.length > 0) {
            const { getOSById } = await import('@/lib/excel');
            const osData = await getOSById(osId);
            const protocol = osData?.protocolo || osId;
            const uploadDir = getUploadDir(protocol);

            await mkdir(uploadDir, { recursive: true });

            for (const file of newFiles) {
                if (file instanceof File && file.size > 0) {
                    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                    const fileName = `${Date.now()}-${Math.round(Math.random() * 1000)}-${safeName}`;
                    const apiPath = `/api/images/${protocol}/${fileName}`;
                    const absolutePath = path.join(uploadDir, fileName);

                    const buffer = Buffer.from(await file.arrayBuffer());
                    await writeFile(absolutePath, buffer);

                    await prisma.oSAttachment.create({
                        data: {
                            osId,
                            name: file.name,
                            path: apiPath,
                            type: file.type || path.extname(file.name),
                            size: file.size
                        }
                    });
                }
            }
        }

        revalidatePath(`/os/${osId}`);
        revalidatePath(`/os`);
        return { success: true, message: 'Informações salvas com sucesso.' };

    } catch (error) {
        logger.error('Error saving admin info', { error: String(error) });
        return { success: false, message: 'Erro interno ao salvar.' };
    }
}
