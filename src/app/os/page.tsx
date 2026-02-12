import { getAllOS } from '@/lib/excel';
import OSListClient from './OSListClient';
import { HeaderServer } from '@/components/layout/HeaderServer';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { EnrichedOS } from '@/lib/types';
import { getOSStatusInfo } from '@/lib/utils';

export default async function OSListPage() {
    const osList = await getAllOS();

    // Fetch all executions to enrich OS cards with status
    const executions = await prisma.serviceExecution.findMany({
        select: { osId: true, status: true, obs: true, updatedAt: true, technician: { select: { name: true } } }
    });

    const executionMap = new Map<string, { status: string; obs: string | null; technicianName: string; updatedAt: Date }>();
    for (const exec of executions) {
        executionMap.set(exec.osId, {
            status: exec.status,
            obs: exec.obs,
            technicianName: exec.technician.name,
            updatedAt: exec.updatedAt
        });
    }

    // Enrich OS list with execution status
    const enrichedList: EnrichedOS[] = osList.map(os => {
        const exec = executionMap.get(os.id);
        let executionStatus = 'Pendente';
        let technicianName: string | undefined;
        let closedAt: string | undefined;

        if (exec) {
            technicianName = exec.technicianName;

            const statusInfo = getOSStatusInfo({
                osStatus: os.status,
                execution: exec
            });

            executionStatus = statusInfo.label;

            // Only show closure date if it's actually finished (Concluída or Sem Execução)
            if (executionStatus.includes('Concluída') || executionStatus.includes('Sem Execução')) {
                closedAt = exec.updatedAt.toLocaleDateString('pt-BR');
            }
        }

        return { ...os, executionStatus, technicianName, closedAt };
    });

    // Get Session & Preferences (centralized)
    const session = await getSession();
    let lastUf = 'Todos';

    if (session) {
        const tech = await prisma.technician.findUnique({
            where: { id: session.id },
            select: { lastUf: true }
        });
        if (tech) {
            lastUf = tech.lastUf || 'Todos';
        }
    }

    return (
        <>
            <HeaderServer />
            <OSListClient
                initialOSList={enrichedList}
                initialUf={lastUf}
            />
        </>
    );
}
