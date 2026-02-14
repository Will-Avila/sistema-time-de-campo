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

    // 1. Get Base OS Data from Prisma (to get updatedAt, caixas, execution)
    const osRecords = await prisma.orderOfService.findMany({
        include: {
            caixas: { select: { status: true, nomeEquipe: true } },
            execution: {
                include: {
                    equipe: { select: { name: true, fullName: true, nomeEquipe: true } }
                }
            }
        }
    });

    const dbMap = new Map(osRecords.map(r => [r.id, r]));
    const { enrichOS } = await import('@/lib/os-enrichment');

    // 2. Enrich the Excel list
    const enrichedList: EnrichedOS[] = osList.map(os => {
        const dbRecord = dbMap.get(os.id);
        return enrichOS(os, dbRecord as any);
    });

    // 3. Filter for Today (Sync with dashboard.ts logic)
    const todayList = enrichedList.filter(os => {
        // Condition 1: Explicit closure date in Excel for TODAY
        const isExcelToday = os.dataConclusao === todayDate;

        // If Excel says it was closed on a different day, it CANNOT be today's work
        if (os.dataConclusao !== '-' && os.dataConclusao !== todayDate) return false;

        // Condition 2: Technical work completed by the app TODAY
        const dbRecord = dbMap.get(os.id);
        const execUpdateToday = dbRecord?.execution?.updatedAt && isSameDaySP(dbRecord.execution.updatedAt, todayDate);

        const s = (os.executionStatus || '').toUpperCase().trim();
        const raw = (os.status || '').toUpperCase().trim();
        const isFinished =
            s.includes('CONCLUÍD') || s.includes('CONCLUID') ||
            s.includes('SEM EXECUÇ') || s.includes('SEM EXECUC') ||
            s.includes('EM ANÁLIS') || s.includes('EM ANALIS') ||
            s.includes('CANCELAD') || raw === 'CANCELADO';

        // Strict App Today check: Only count if it's finished AND (explicit tech work today OR explicit Excel date)
        const isAppToday = os.lastUpdate && isSameDaySP(new Date(os.lastUpdate), todayDate) && isFinished &&
            (execUpdateToday || isExcelToday);

        return isExcelToday || isAppToday;
    });

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
