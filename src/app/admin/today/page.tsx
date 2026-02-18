import { getAllOS } from '@/lib/excel';
import OSListClient from '@/app/os/OSListClient';
import { HeaderServer } from '@/components/layout/HeaderServer';
import { prisma } from '@/lib/db';
import { getOSStatusInfo, getTodaySP, isSameDaySP } from '@/lib/utils';
import { EnrichedOS } from '@/lib/types';
import { requireAdmin } from '@/lib/auth';

import { DateSelector } from './DateSelector';

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: { date?: string };
}

export default async function TodayOSPage({ searchParams }: PageProps) {
    await requireAdmin();

    const selectedDate = searchParams.date || getTodaySP();
    const osList = await getAllOS();

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

    // 3. Filter for Selected Date
    const filteredList = enrichedList.filter(os => {
        // Condition 1: Explicit closure date in Excel for SELECTED DATE
        const isExcelTargetDate = os.dataConclusao === selectedDate;

        // If Excel says it was closed on a different day, it CANNOT be this day's work
        if (os.dataConclusao !== '-' && os.dataConclusao !== selectedDate) return false;

        // Condition 2: Technical work completed by the app on SELECTED DATE
        const dbRecord = dbMap.get(os.id);
        const execUpdateTargetDate = dbRecord?.execution?.updatedAt && isSameDaySP(dbRecord.execution.updatedAt, selectedDate);

        const s = (os.executionStatus || '').toUpperCase().trim();
        const raw = (os.status || '').toUpperCase().trim();
        const isFinished =
            s.includes('CONCLUÍD') || s.includes('CONCLUID') ||
            s.includes('SEM EXECUÇ') || s.includes('SEM EXECUC') ||
            s.includes('EM ANÁLIS') || s.includes('EM ANALIS') ||
            s.includes('CANCELAD') || raw === 'CANCELADO';

        // Strict App check: Only count if it's finished AND (explicit tech work on date OR explicit Excel date)
        const isAppTargetDate = os.lastUpdate && isSameDaySP(new Date(os.lastUpdate), selectedDate) && isFinished &&
            (execUpdateTargetDate || isExcelTargetDate);

        return isExcelTargetDate || isAppTargetDate;
    });

    return (
        <div className="min-h-screen bg-background">
            <HeaderServer />
            <div className="container pt-6 pb-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Relatório de Produção</h1>
                    <p className="text-sm text-muted-foreground">
                        Análise de produtividade e ordens de serviço finalizadas em <span className="font-bold text-primary">{selectedDate}</span>
                    </p>
                </div>

                <OSListClient
                    initialOSList={filteredList}
                    initialUf="Todos"
                    initialSearch=""
                    initialStatus="Todas"
                    isTodayPage={true}
                    extraFilters={<DateSelector currentDate={selectedDate} />}
                />
            </div>
        </div>
    );
}
