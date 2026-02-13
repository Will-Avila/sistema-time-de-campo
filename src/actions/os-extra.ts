'use server';

import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth'; // Ensure this exists or use requireAuth + check
import { revalidatePath } from 'next/cache';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export async function saveOSAdminInfo(formData: FormData) {
    try {
        const session = await requireAdmin();
    } catch (e) {
        return { success: false, message: 'Acesso negado. Apenas administradores.' };
    }

    const osId = formData.get('osId') as string;
    const condominio = formData.get('condominio') as string;
    const descricao = formData.get('descricao') as string;
    const deletedFileIds = formData.getAll('deletedFileIds') as string[];
    const newFiles = formData.getAll('files') as File[];

    if (!osId) return { success: false, message: 'ID da OS inválido.' };

    try {
        // 1. Update OrderOfService directly
        await prisma.orderOfService.update({
            where: { id: osId },
            data: { condominio, descricao }
        });

        // 2. Handle Deletions
        if (deletedFileIds.length > 0) {
            const filesToDelete = await prisma.oSAttachment.findMany({
                where: { id: { in: deletedFileIds } }
            });

            for (const file of filesToDelete) {
                try {
                    let absolutePath = '';
                    if (file.path.startsWith('/api/images/')) {
                        const relativePath = file.path.replace('/api/images/', '');
                        absolutePath = path.join(process.env.PHOTOS_PATH || 'C:\\Programas\\PROJETOS\\anexos', relativePath);
                    } else {
                        absolutePath = path.join(process.cwd(), 'public', file.path);
                    }
                    await unlink(absolutePath);
                } catch (e) {
                    console.error('Erro ao deletar arquivo do disco:', e);
                }
            }

            await prisma.oSAttachment.deleteMany({
                where: { id: { in: deletedFileIds } }
            });
        }

        // 3. Handle New Uploads
        if (newFiles.length > 0) {
            const { getOSById } = await import('@/lib/excel');
            const osData = await getOSById(osId);
            const protocol = osData?.protocolo || osId;

            const baseUploadDir = process.env.PHOTOS_PATH || 'C:\\Programas\\PROJETOS\\anexos';
            const uploadDir = path.join(baseUploadDir, protocol);

            try {
                await mkdir(uploadDir, { recursive: true });
            } catch (e) { }

            for (const file of newFiles) {
                if (file instanceof File && file.size > 0) {
                    const ext = path.extname(file.name);
                    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1000)}`;
                    const fileName = `${uniqueSuffix}-${safeName}`;
                    const apiPath = `/api/images/${protocol}/${fileName}`;
                    const absolutePath = path.join(uploadDir, fileName);

                    const buffer = Buffer.from(await file.arrayBuffer());
                    await writeFile(absolutePath, buffer);

                    await prisma.oSAttachment.create({
                        data: {
                            osId: osId,
                            name: file.name,
                            path: apiPath,
                            type: file.type || ext,
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
        console.error('Erro ao salvar info admin:', error);
        return { success: false, message: 'Erro interno ao salvar.' };
    }
}
