'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { createNotification } from '@/actions/notification';
import { logger } from '@/lib/logger';

/**
 * Designa equipes para uma OS.
 * Cria delegações novas e remove as que não estão mais na lista.
 */
export async function delegateOS(osId: string, equipeIds: string[]) {
    const session = await getSession();

    if (!session) return { success: false, message: 'Não autenticado.' };

    const user = await prisma.equipe.findUnique({
        where: { id: session.id },
        select: { role: true, isAdmin: true } as any
    });

    const role = (user as any)?.role || session.role || (session.isAdmin ? 'ADMIN' : 'USER');
    // Migration fallback
    const effectiveRole = (role === 'USER' && user?.isAdmin) ? 'ADMIN' : role;

    if (effectiveRole !== 'ADMIN' && effectiveRole !== 'SUPERVISOR') {
        return { success: false, message: 'Não autorizado.' };
    }

    try {
        const os = await prisma.orderOfService.findUnique({
            where: { id: osId },
            select: { protocolo: true, pop: true }
        });

        if (!os) return { success: false, message: 'OS não encontrada.' };

        // Get current delegations
        const currentDelegations = await (prisma as any).oSDelegation.findMany({
            where: { osId },
            select: { equipeId: true }
        });
        const currentIds = new Set(currentDelegations.map(d => d.equipeId));

        // Determine adds and removes
        const toAdd = equipeIds.filter(id => !currentIds.has(id));
        const toRemove = [...currentIds].filter((id: string) => !equipeIds.includes(id));

        // Remove revoked delegations
        if (toRemove.length > 0) {
            await (prisma as any).oSDelegation.deleteMany({
                where: { osId, equipeId: { in: toRemove } }
            });
        }

        // Add new delegations
        if (toAdd.length > 0) {
            await (prisma as any).oSDelegation.createMany({
                data: toAdd.map(id => ({
                    osId,
                    equipeId: id,
                    delegatedBy: session.id
                }))
            });
        }

        // Fetch names for notifications
        const designatedEquipes = await prisma.equipe.findMany({
            where: { id: { in: toAdd } },
            select: { id: true, name: true, fullName: true }
        });

        const osLabel = os.protocolo || os.pop;

        // Notify each newly designated technician
        for (const equipe of designatedEquipes) {
            await createNotification({
                type: 'NEW_OS',
                title: 'OS Designada',
                message: `Você foi designado para a OS ${osLabel}`,
                equipeId: equipe.id,
                technicianName: session.username,
                osId,
            });
        }

        // Notify the delegator (confirmation) and all other Admins
        if (toAdd.length > 0) {
            const names = designatedEquipes.map(e => e.fullName || e.name).join(', ');

            // 1. Notify the delegator
            await createNotification({
                type: 'NEW_OS',
                title: 'Equipes Designadas',
                message: `OS ${osLabel} designada para: ${names}`,
                equipeId: session.id,
                technicianName: session.username,
                osId,
            });

            // 2. Notify all Management (Admins and Gestores) (except the delegator)
            const management = await prisma.equipe.findMany({
                where: {
                    OR: [
                        { role: 'ADMIN' },
                        { role: 'SUPERVISOR' },
                        { isAdmin: true }
                    ],
                    id: { not: session.id }
                } as any,
                select: { id: true }
            });

            for (const manager of management) {
                await createNotification({
                    type: 'NEW_OS',
                    title: 'Equipes Designadas',
                    message: `OS ${osLabel} designada por ${session.username} para: ${names}`,
                    equipeId: manager.id,
                    technicianName: session.username,
                    osId,
                });
            }
        }

        logger.info('OS delegated', { osId, equipeIds, by: session.id });

        revalidatePath(`/os/${osId}`);
        revalidatePath('/os');

        return { success: true, message: 'Equipes designadas com sucesso!' };
    } catch (error) {
        logger.error('Error delegating OS', { error: String(error) });
        return { success: false, message: 'Erro ao designar equipes.' };
    }
}

/**
 * Retorna as equipes designadas para uma OS.
 */
export async function getOSDelegations(osId: string) {
    const delegations = await (prisma as any).oSDelegation.findMany({
        where: { osId },
        include: {
            equipe: {
                select: { id: true, name: true, fullName: true, nomeEquipe: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return (delegations as any[]).map(d => ({
        id: d.id,
        equipeId: d.equipe.id,
        equipeName: d.equipe.fullName || d.equipe.nomeEquipe || d.equipe.name,
        createdAt: d.createdAt
    }));
}

/**
 * Retorna os IDs de OS delegadas para um técnico.
 */
export async function getDelegatedOSIds(equipeId: string): Promise<string[]> {
    const delegations = await (prisma as any).oSDelegation.findMany({
        where: { equipeId },
        select: { osId: true }
    });
    return (delegations as any[]).map(d => d.osId);
}

/**
 * Lista equipes técnicas (role=USER) para o seletor de delegação.
 */
export async function getTechnicianEquipes() {
    return prisma.equipe.findMany({
        where: {
            role: { in: ['USER', 'SUPERVISOR'] },
            isAdmin: false // Extra safety to exclude legacy admins if migration failed for some reason
        } as any,
        select: {
            id: true,
            name: true,
            fullName: true,
            nomeEquipe: true,
        },
        orderBy: { name: 'asc' }
    });
}
