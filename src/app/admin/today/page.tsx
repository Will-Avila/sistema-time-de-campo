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

    // 1. Get Base OS Data from Prisma (to get updatedAt)
    const osRecords = await prisma.orderOfService.findMany({
        include: {
            execution: {
                include: {
                    equipe: { select: { name: true, fullName: true, nomeEquipe: true } }
                }
            }
        }
    });

    const dbMap = new Map(osRecords.map(r => [r.id, r]));

    // Enrich and Filter for Today
    const todayList: EnrichedOS[] = [];

    for (const os of osList) {
        const dbRecord = dbMap.get(os.id);
        const exec = dbRecord?.execution;
        const todayDateStr = todayDate;

        // Conditions for "Today" (same as dashboard)
        const isExcelToday = os.dataConclusao === todayDateStr;

        let executionStatus = 'Pendente';
        let equipeName: string | undefined;
        let closedAt: string | undefined;
        let lastUpdateDate: Date | null = dbRecord?.updatedAt || null;
        let isAppToday = false;

        // Determine the most recent update date (OS metadata vs App Execution)
        if (exec && exec.updatedAt) {
            equipeName = exec.equipe?.fullName || exec.equipe?.nomeEquipe || exec.equipe?.name || '-';
            if (!lastUpdateDate || exec.updatedAt > lastUpdateDate) {
                lastUpdateDate = exec.updatedAt;
            }
        }

        const statusInfo = getOSStatusInfo({ osStatus: os.status, execution: exec });
        executionStatus = statusInfo.label;

        const s = (executionStatus || '').toUpperCase().trim();
        const raw = (os.status || '').toUpperCase().trim();

        const now = new Date();
        const monthsBRShort = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
        const currentMonthPattern = `${monthsBRShort[now.getMonth()]}-${String(now.getFullYear()).slice(-2)}`;

        const isFinished =
            s.includes('CONCLUÍD') || s.includes('CONCLUID') ||
            s.includes('SEM EXECUÇ') || s.includes('SEM EXECUC') ||
            s.includes('EM ANÁLIS') || s.includes('EM ANALIS') ||
            s.includes('CANCELAD') || raw === 'CANCELADO';

        const execUpdateToday = exec?.updatedAt && isSameDaySP(exec.updatedAt, todayDateStr);
        const isCurrentMonth = os.mes === currentMonthPattern;

        isAppToday = lastUpdateDate && isSameDaySP(lastUpdateDate, todayDateStr) && isFinished &&
            (execUpdateToday || isExcelToday);

        if (isAppToday || isExcelToday) {
            closedAt = lastUpdateDate?.toISOString();
            todayList.push({
                ...os,
                executionStatus,
                equipeName,
                closedAt,
                lastUpdate: lastUpdateDate?.toISOString(),
                executionUpdatedAt: exec?.updatedAt ? exec.updatedAt.toISOString() : null
            });
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
