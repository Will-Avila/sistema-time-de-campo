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
        select: { osId: true, status: true, obs: true, updatedAt: true, equipe: { select: { name: true, nomeEquipe: true, fullName: true } } }
    });

    const executionMap = new Map<string, { status: string; obs: string | null; equipeName: string; updatedAt: Date }>();
    for (const exec of executions) {
        executionMap.set(exec.osId, {
            status: exec.status,
            obs: exec.obs,
            equipeName: exec.equipe?.fullName || exec.equipe?.nomeEquipe || exec.equipe?.name || '-',
            updatedAt: exec.updatedAt
        });
    }

    // Enrich OS list with execution status
    const enrichedList: EnrichedOS[] = osList.map(os => {
        const exec = executionMap.get(os.id);
        let executionStatus = 'Pendente';
        let equipeName: string | undefined;
        let closedAt: string | undefined;

        if (exec) {
            equipeName = exec.equipeName;

            const statusInfo = getOSStatusInfo({
                osStatus: os.status,
                execution: exec
            });

            executionStatus = statusInfo.label;

            // Only show closure date if it's actually finished (Concluída or Sem Execução)
            const labelUpper = executionStatus.toUpperCase();
            if (labelUpper.includes('CONCLUÍDA') || labelUpper.includes('CONCLUIDA') || labelUpper.includes('SEM EXECUÇÃO') || labelUpper.includes('SEM EXECUCAO')) {
                closedAt = exec.updatedAt.toISOString();
            }
        }

        return { ...os, executionStatus, equipeName, closedAt };
    });

    // Get Session & Preferences (centralized)
    const session = await getSession();
    let lastUf = 'Todos';
    let lastSearch = '';
    let lastStatus = 'Abertas';

    if (session) {
        const tech = await prisma.equipe.findUnique({
            where: { id: session.id },
            select: { lastUf: true, lastStatus: true, lastSearch: true }
        });
        if (tech) {
            lastUf = tech.lastUf || 'Todos';
            lastSearch = tech.lastSearch || '';
            lastStatus = tech.lastStatus || 'Abertas';
        }
    }

    return (
        <>
            <HeaderServer />
            <OSListClient
                initialOSList={enrichedList}
                initialUf={lastUf}
                initialSearch={lastSearch}
                initialStatus={lastStatus}
            />
        </>
    );
}
