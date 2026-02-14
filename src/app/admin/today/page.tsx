import { getAllOS } from '@/lib/excel';
import OSListClient from '@/app/os/OSListClient';
import { HeaderServer } from '@/components/layout/HeaderServer';
import { prisma } from '@/lib/db';
import { getOSStatusInfo, getTodaySP, isSameDaySP } from '@/lib/utils';
import { EnrichedOS } from '@/lib/types';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function TodayOSPage() {
    await requireAdmin();

    const osList = await getAllOS();
    const todayDate = getTodaySP();

    // Fetch all executions
    const executions = await prisma.serviceExecution.findMany({
        select: {
            osId: true,
            status: true,
            obs: true,
            updatedAt: true,
            equipe: { select: { name: true, nomeEquipe: true, fullName: true } }
        }
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

    // Enrich and Filter for Today
    const todayList: EnrichedOS[] = [];

    for (const os of osList) {
        const exec = executionMap.get(os.id);
        const todayDateStr = todayDate;

        // Conditions for "Today" (same as dashboard)
        const isExcelToday = os.dataConclusao === todayDateStr;

        let executionStatus = 'Pendente';
        let equipeName: string | undefined;
        let closedAt: string | undefined;
        let isAppToday = false;

        if (exec) {
            equipeName = exec.equipeName;
            const statusInfo = getOSStatusInfo({ osStatus: os.status, execution: exec });
            executionStatus = statusInfo.label;

            const s = (executionStatus || '').toUpperCase().trim();
            isAppToday = isSameDaySP(exec.updatedAt, todayDateStr) &&
                (s.includes('CONCLUÍDA') || s.includes('CONCLUIDA') || s.includes('SEM EXECUÇÃO') || s.includes('SEM EXECUCAO') || s.includes('EM ANÁLISE') || s.includes('EM ANALISE') || s.includes('CANCELADA') || s.includes('CANCELADO'));

            if (isAppToday || isExcelToday) {
                closedAt = exec.updatedAt.toISOString();
            }
        }

        if (isExcelToday || isAppToday) {
            todayList.push({ ...os, executionStatus, equipeName, closedAt, lastUpdate: exec?.updatedAt?.toISOString() });
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <HeaderServer />
            <div className="container pt-24 pb-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Encerradas Hoje</h1>
                    <p className="text-sm text-muted-foreground">Exibindo todas as ordens de serviço finalizadas em {todayDate}</p>
                </div>

                <OSListClient
                    initialOSList={todayList}
                    initialUf="Todos"
                    initialSearch=""
                    initialStatus="Todas"
                    isTodayPage={true}
                />
            </div>
        </div>
    );
}
