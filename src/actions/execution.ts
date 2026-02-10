'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'default-secret-change-me-in-prod'
);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function closeOS(prevState: any, formData: FormData) {
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
    const status = formData.get('status') as string;
    const obs = formData.get('obs') as string;
    const files = formData.getAll('photos') as File[];

    if (!osId || !status) {
        return { message: 'Dados incompletos.' };
    }

    try {
        // 3. Save to DB
        const execution = await prisma.serviceExecution.create({
            data: {
                osId,
                technicianId,
                status: 'DONE', // Always DONE in DB context, but message/obs differentiates
                power: '', // Not used yet
                obs: `Status: ${status}\n${obs}`,
            }
        });

        // 4. Handle File Uploads
        if (files.length > 0 && files[0].size > 0) {
            // Fetch OS to get Protocolo
            const { getOSById } = await import('@/lib/excel');
            const osData = await getOSById(osId);
            const protocol = osData?.protocolo || 'SEM_PROTOCOLO';

            // External base path
            const baseUploadDir = 'C:\\Programas\\PROJETOS\\fotos';
            const uploadDir = path.join(baseUploadDir, protocol);

            await mkdir(uploadDir, { recursive: true });

            for (const file of files) {
                if (file.size > MAX_FILE_SIZE) continue;
                if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) continue;

                const buffer = Buffer.from(await file.arrayBuffer());
                // Sanitize filename
                const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const fileName = `${Date.now()}-${safeName}`;
                const filePath = path.join(uploadDir, fileName);

                await writeFile(filePath, buffer);

                // Save photo record with API URL
                // URL: /api/images/[PROTOCOL]/[FILENAME]
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
        // Get technician name
        const tech = await prisma.technician.findUnique({ where: { id: technicianId }, select: { name: true, fullName: true } });
        const techName = tech?.fullName || tech?.name || 'Técnico';
        await createNotification({
            type: 'OS_CLOSE',
            title: 'OS Encerrada',
            message: `${techName} encerrou a OS ${proto}. Status: ${status}`,
            technicianId,
            osId
        });

        return { success: true, message: 'OS encerrada com sucesso!' };

    } catch (error) {
        console.error('Error closing OS:', error);
        return { message: 'Erro ao salvar OS. Tente novamente.' };
    }
}
