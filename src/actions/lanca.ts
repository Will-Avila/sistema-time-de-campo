'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { getTodaySP } from '@/lib/utils';
import type { ActionResult } from '@/lib/types';

/**
 * Atualiza um item de lançamento (LancaAlare)
 */
export async function updateLancaItem(
    osId: string,
    lancaId: string,
    data: { lancado: string; done: boolean }
): Promise<ActionResult> {
    const session = await requireAuth().catch(() => null);
    if (!session) return { success: false, message: 'Não autenticado.' };

    try {
        const status = data.done ? 'OK' : 'Pendente';

        const updated = await prisma.lancaAlare.update({
            where: { id: lancaId },
            data: {
                status,
                lancado: data.lancado,
                equipe: session.id,
                data: data.done ? getTodaySP() : null,
            } as any
        });

        revalidatePath(`/os/${osId}/lanca`);
        revalidatePath(`/os/${osId}`);

        // Create Notification
        if (data.done) {
            try {
                const { createNotification } = await import('@/actions/notification');
                const { getOSById } = await import('@/lib/excel');
                const osInfo = await getOSById(osId);
                const proto = osInfo?.protocolo || osId;

                const equipe = await prisma.equipe.findUnique({ where: { id: session.id }, select: { name: true, fullName: true, nomeEquipe: true } });
                const techName = equipe?.fullName || equipe?.nomeEquipe || equipe?.name || 'Equipe';

                await createNotification({
                    type: 'CHECKLIST' as any, // Mantenho CHECKLIST para seguir a regra de visualização da gestão
                    title: 'Lançamento Concluído',
                    message: `${techName} lançou ${data.lancado}m no trecho ${updated.de} -> ${updated.para} (${updated.cabo}) na OS ${proto}`,
                    equipeId: session.id,
                    technicianName: techName,
                    osId: osId
                });
            } catch (notifErr) {
                logger.error('Error creating notification for lanca completion', { error: String(notifErr) });
            }
        }

        return { success: true, message: 'Lançamento atualizado!' };
    } catch (error) {
        logger.error('Error updating lanca item', { error: String(error) });
        return { success: false, message: 'Erro ao salvar lançamento.' };
    }
}

/**
 * Reseta um item de lançamento
 */
export async function resetLancaItem(osId: string, lancaId: string): Promise<ActionResult> {
    const session = await requireAuth().catch(() => null);
    if (!session) return { success: false, message: 'Não autenticado.' };

    try {
        const item = await prisma.lancaAlare.findUnique({
            where: { id: lancaId },
            select: { equipe: true }
        });

        if (!item) return { success: false, message: 'Lançamento não encontrado.' };

        // Buscar dados do autor do registro original
        const originalAuthor = item.equipe ? await prisma.equipe.findUnique({
            where: { id: item.equipe },
            select: { role: true, id: true }
        }) : null;

        const originalRole = originalAuthor?.role || 'USER';

        // Lógica de Permissão
        let canReset = false;
        if (session.isAdmin) {
            canReset = true;
        } else if (session.role === 'SUPERVISOR') {
            canReset = originalRole === 'USER' || item.equipe === session.id;
        } else {
            canReset = item.equipe === session.id;
        }

        if (!canReset) {
            let errorMsg = 'Não autorizado.';
            if (session.role === 'SUPERVISOR' && originalRole === 'ADMIN') {
                errorMsg = 'Gestores não podem desmarcar registros feitos por Administradores.';
            } else if (session.role === 'USER' && item.equipe !== session.id) {
                errorMsg = 'Você só pode desmarcar registros que você mesmo realizou.';
            }
            return { success: false, message: errorMsg };
        }

        const updated = await prisma.lancaAlare.update({
            where: { id: lancaId },
            data: {
                status: '',
                lancado: '',
                equipe: '',
                data: null,
            } as any
        });

        revalidatePath(`/os/${osId}/lanca`);
        revalidatePath(`/os/${osId}`);

        // Create Notification for reset
        try {
            const { createNotification } = await import('@/actions/notification');
            const { getOSById } = await import('@/lib/excel');
            const osInfo = await getOSById(osId);
            const proto = osInfo?.protocolo || osId;

            const equipe = await prisma.equipe.findUnique({ where: { id: session.id }, select: { name: true, fullName: true, nomeEquipe: true } });
            const techName = equipe?.fullName || equipe?.nomeEquipe || equipe?.name || 'Equipe';

            await createNotification({
                type: 'CHECKLIST' as any,
                title: 'Lançamento Desmarcado',
                message: `${techName} desmarcou o lançamento trecho ${updated.de} -> ${updated.para} na OS ${proto}`,
                equipeId: session.id,
                technicianName: techName,
                osId: osId
            });
        } catch (notifErr) {
            logger.error('Error creating notification for lanca reset', { error: String(notifErr) });
        }

        return { success: true, message: 'Lançamento desmarcado.' };
    } catch (error) {
        logger.error('Error resetting lanca item', { error: String(error) });
        return { success: false, message: 'Erro ao desmarcar lançamento.' };
    }
}
