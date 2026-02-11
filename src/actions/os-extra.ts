'use server';

import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth'; // Ensure this exists or use requireAuth + check
import { revalidatePath } from 'next/cache';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export async function saveOSAdminInfo(formData: FormData) {
    try {
        const session = await requireAdmin(); // Or check session.isAdmin manually if strictly needed
    } catch (e) {
        return { success: false, message: 'Acesso negado. Apenas administradores.' };
    }

    const osId = formData.get('osId') as string;
    const condominio = formData.get('condominio') as string;
    const descricao = formData.get('descricao') as string;
    const deletedFileIds = formData.getAll('deletedFileIds') as string[];
    const newFiles = formData.getAll('files') as File[]; // Cast as File[]

    if (!osId) return { success: false, message: 'ID da OS inválido.' };

    try {
        // 1. Update/Create OSExtraInfo
        // Check if exists
        const existing = await prisma.oSExtraInfo.findUnique({ where: { osId } });

        let extraInfoId = existing?.id;

        if (existing) {
            await prisma.oSExtraInfo.update({
                where: { id: existing.id },
                data: { condominio, descricao }
            });
        } else {
            const created = await prisma.oSExtraInfo.create({
                data: { osId, condominio, descricao }
            });
            extraInfoId = created.id;
        }

        if (!extraInfoId) throw new Error('Falha ao obter ID da info extra.');

        // 2. Handle Deletions
        if (deletedFileIds.length > 0) {
            const filesToDelete = await prisma.oSAttachment.findMany({
                where: { id: { in: deletedFileIds } }
            });

            for (const file of filesToDelete) {
                // Delete from disk
                try {
                    const togglePath = path.join(process.cwd(), 'public', file.path);
                    await unlink(togglePath);
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
            // Ensure directory exists
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'os-files', osId);
            try {
                await mkdir(uploadDir, { recursive: true });
            } catch (e) { }

            for (const file of newFiles) {
                if (file instanceof File) {
                    const ext = path.extname(file.name);
                    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                    const fileName = `${randomUUID()}-${safeName}`;
                    const relativePath = `/uploads/os-files/${osId}/${fileName}`;
                    const absolutePath = path.join(uploadDir, fileName);

                    const buffer = Buffer.from(await file.arrayBuffer());
                    await writeFile(absolutePath, buffer);

                    await prisma.oSAttachment.create({
                        data: {
                            extraInfoId: extraInfoId,
                            name: file.name,
                            path: relativePath,
                            type: file.type || ext,
                            size: file.size
                        }
                    });
                }
            }
        }

        revalidatePath(`/os/${osId}`);
        revalidatePath(`/os`); // For the list view updates
        return { success: true, message: 'Informações salvas com sucesso.' };

    } catch (error) {
        console.error('Erro ao salvar info admin:', error);
        return { success: false, message: 'Erro interno ao salvar.' };
    }
}
