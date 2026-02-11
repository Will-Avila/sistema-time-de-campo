import { getAllOS } from '@/lib/excel';
import OSListClient from './OSListClient';
import { HeaderServer } from '@/components/layout/HeaderServer';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { EnrichedOS } from '@/lib/types';

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

        // Normalize Excel status for check
        const excelStatusLower = os.status.toLowerCase();
        // Check if Excel says it is closed/done
        const isExcelDone = excelStatusLower === 'concluído' || excelStatusLower === 'concluido' || excelStatusLower === 'encerrada';
        const isExcelEncerrada = excelStatusLower === 'encerrada';

        if (exec) {
            technicianName = exec.technicianName;

            // Logica solicitada: "se for encerrada sobreescreva por um tecnico, mude o status para..."
            // If Excel is 'Encerrada' AND we have a local execution record (tech touched it),
            // we override the display status to 'Em análise'.
            if (isExcelEncerrada) {
                executionStatus = '(Concluido ou Sem execução) - Em análise';
                closedAt = exec.updatedAt.toLocaleDateString('pt-BR');
            }
            // If Excel is 'Concluído' (but not Encerrada? or treated same?), usually we respect Excel.
            // But strict reading of request only mentions 'Encerrada'.
            else if (isExcelDone) {
                // Respect Excel status (concluido) -> executionStatus stays 'Pendente' so client uses os.status
            }
            else {
                // Excel is OPEN (Iniciar, Em execução, etc.)
                if (exec.status === 'DONE') {
                    executionStatus = '(Concluido ou Sem execução) - Em análise';
                    closedAt = exec.updatedAt.toLocaleDateString('pt-BR');
                } else if (exec.status === 'PENDING') {
                    executionStatus = 'Em Execução';
                }
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
