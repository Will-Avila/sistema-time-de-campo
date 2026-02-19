'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import type { ActionResult } from '@/lib/types';

/**
 * Adiciona um item de material à OS
 */
export async function addOSMaterial(osId: string, content: string): Promise<ActionResult> {
    const session = await requireAuth().catch(() => null);
    if (!session) return { success: false, message: 'Não autenticado.' };

    if (!content.trim()) return { success: false, message: 'Conteúdo do material não pode estar vazio.' };

    try {
        await (prisma as any).osMaterial.create({
            data: {
                osId,
                equipeId: session.id,
                content: content.trim()
            }
        });

        revalidatePath(`/os/${osId}/execution`);
        revalidatePath(`/os/${osId}`);

        // Notification for Admins
        try {
            const { createNotification } = await import('@/actions/notification');
            const { getOSById } = await import('@/lib/excel');
            const osInfo = await getOSById(osId);
            const proto = osInfo?.protocolo || osId;

            const equipe = await prisma.equipe.findUnique({ where: { id: session.id }, select: { name: true, fullName: true, nomeEquipe: true } });
            const techName = equipe?.fullName || equipe?.nomeEquipe || equipe?.name || 'Equipe';

            await createNotification({
                type: 'MATERIAL' as any,
                title: 'Material Registrado',
                message: `${techName} registrou materiais na OS ${proto}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
                equipeId: session.id,
                technicianName: techName,
                osId: osId
            });
        } catch (notifErr) {
            logger.error('Error creating notification for material', { error: String(notifErr) });
        }

        return { success: true, message: 'Material registrado com sucesso!' };
    } catch (error) {
        logger.error('Error adding OS material', { error: String(error) });
        return { success: false, message: 'Erro ao registrar material.' };
    }
}

/**
 * Remove um item de material da OS (Apenas Administradores)
 */
export async function deleteOSMaterial(osId: string, materialId: string): Promise<ActionResult> {
    const session = await requireAuth().catch(() => null);
    if (!session) return { success: false, message: 'Não autenticado.' };

    logger.info('Solicitação de exclusão de material', { osId, materialId, user: session.id });

    try {
        // Find the material first to check ownership
        const material = await (prisma as any).osMaterial.findUnique({
            where: { id: materialId }
        });

        if (!material) {
            logger.warn('Registro de material não encontrado para exclusão', { materialId });
            return { success: false, message: 'Registro não encontrado.' };
        }

        const isAdmin = session.isAdmin || session.role === 'ADMIN';
        const isOwner = material.equipeId === session.id;

        if (!isAdmin && !isOwner) {
            logger.warn('Tentativa de exclusão não autorizada', { materialId, user: session.id });
            return { success: false, message: 'Você não tem permissão para excluir este registro.' };
        }

        await (prisma as any).osMaterial.delete({
            where: { id: materialId }
        });

        logger.info('Material excluído com sucesso', { materialId });

        revalidatePath(`/os/${osId}/execution`);
        revalidatePath(`/os/${osId}/lanca`);
        revalidatePath(`/os/${osId}`);

        return { success: true, message: 'Registro de material removido.' };
    } catch (error) {
        logger.error('Erro ao excluir material da OS', { error: String(error), materialId });
        return { success: false, message: 'Erro ao remover material.' };
    }
}

/**
 * Busca a lista de materiais de uma OS
 */
export async function getOSMaterials(osId: string) {
    try {
        return await (prisma as any).osMaterial.findMany({
            where: { osId },
            include: {
                equipe: {
                    select: {
                        name: true,
                        fullName: true,
                        nomeEquipe: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        logger.error('Error fetching OS materials', { error: String(error) });
        return [];
    }
}
