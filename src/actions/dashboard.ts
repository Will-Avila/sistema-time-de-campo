'use server';

import { prisma } from '@/lib/db';
import { getAllOS } from '@/lib/excel';
import { syncExcelToDB } from '@/lib/sync';
import { syncProgressStore } from '@/lib/sync-progress';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { getOSStatusInfo, getTodaySP, isSameDaySP, getDaysRemaining } from '@/lib/utils';

export async function getSyncProgress() {
    await requireAdmin();
    return syncProgressStore.get();
}

export async function resetSyncProgress() {
    await requireAdmin();
    syncProgressStore.reset();
}

export async function refreshData() {
    await requireAdmin();
    const result = await syncExcelToDB();
    revalidatePath('/admin/dashboard');
    revalidatePath('/os');
    revalidatePath('/admin/today');
    return result;
}

export async function getDashboardData(targetDate?: string) {
    // 1. Get Base OS Data
    const todayDate = targetDate || getTodaySP();
    const [osRecords, excelOSList, equipes, recentNotifications] = await Promise.all([
        prisma.orderOfService.findMany({
            include: {
                caixas: { select: { status: true, nomeEquipe: true, data: true } },
                execution: {
                    include: {
                        equipe: { select: { name: true, fullName: true, nomeEquipe: true } }
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        }),
        getAllOS(),
        prisma.equipe.findMany({
            where: { isAdmin: false },
            select: { id: true, name: true, fullName: true, nomeEquipe: true, phone: true },
        }),
        prisma.notification.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { equipe: { select: { name: true, fullName: true, nomeEquipe: true } } }
        })
    ]);

    // 4. Merge Data for the List (Use Excel as base for metadata like dataConclusao)
    const executionMap = new Map(osRecords.map(r => [r.id, r]));
    const { enrichOS } = await import('@/lib/os-enrichment');

    const osList = excelOSList.map(os => {
        const dbRecord = executionMap.get(os.id);
        const enriched = enrichOS(os, dbRecord as any);

        return {
            ...enriched,
            status: enriched.executionStatus === 'Concluída' ? 'DONE' :
                enriched.executionStatus === 'Em execução' ? 'IN_PROGRESS' : 'PENDING',
            rawStatus: os.status,
        };
    }).sort((a, b) => {
        const parseDate = (d?: string) => {
            if (!d || d === '-') return new Date(0);
            const [day, month, year] = d.split('/').map(Number);
            return new Date(year, month - 1, day);
        };
        return parseDate(b.dataEntrante).getTime() - parseDate(a.dataEntrante).getTime();
    });

    // 5. Calculate Stats
    // Sync with OSListClient.tsx filters
    const OPEN_EXCEL_STATUSES = ['INICIAR', 'EM EXECUÇÃO', 'EM EXECUCAO', 'PEND. CLIENTE'];
    const FINISHED_EXCEL_STATUSES = ['CONCLUÍDO', 'CONCLUIDO', 'CONCLUÍDA', 'CANCELADO'];

    // OS Abertas -> Match OSListClient logic EXACTLY (uses raw Excel status)
    const openOS = osList.filter(os => {
        const s = (os.rawStatus || '').toUpperCase().trim();
        return OPEN_EXCEL_STATUSES.includes(s);
    });
    const open = openOS.length;

    // UF Breakdown for OPEN OS (requested by user)
    const openUfMap: Record<string, number> = {};
    openOS.forEach(os => {
        const uf = os.uf || 'N/A';
        openUfMap[uf] = (openUfMap[uf] || 0) + 1;
    });
    const UF_ORDER = ['CE', 'RN', 'PB'];
    const openUfBreakdown = Object.entries(openUfMap)
        .map(([uf, count]) => ({ uf, count }))
        .sort((a, b) => {
            const indexA = UF_ORDER.indexOf(a.uf);
            const indexB = UF_ORDER.indexOf(b.uf);

            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;

            return b.count - a.count;
        });


    const completedToday = osList.filter(os => {
        // Condition 1: Explicit closure date in Excel for TODAY
        const isExcelToday = os.dataConclusao === todayDate;

        // If Excel says it was closed on a different day, it CANNOT be today's work
        if (os.dataConclusao !== '-' && os.dataConclusao !== todayDate) return false;

        // Condition 2: Technical work completed by the app TODAY
        const dbRecord = executionMap.get(os.id);
        const execUpdateToday = dbRecord?.execution?.updatedAt && isSameDaySP(dbRecord.execution.updatedAt, todayDate);

        const s = (os.executionStatus || '').toUpperCase().trim();
        const raw = (os.rawStatus || '').toUpperCase().trim();
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

    const completedTodayCount = completedToday.length;

    const todayCanceladas = completedToday.filter(os => {
        const s = (os.executionStatus || '').toUpperCase().trim();
        const raw = (os.rawStatus || '').toUpperCase().trim();
        // It's Cancelada if execution status contains SEM EXECUÇÃO OR raw excel status is CANCELADO
        const isCancellation = s.includes('SEM EXECUÇ') || s.includes('SEM EXECUC') || s.includes('CANCELAD') || raw === 'CANCELADO';
        return isCancellation;
    }).length;

    const todayConcluidas = completedTodayCount - todayCanceladas;

    const completedMonth = osList.filter(os => {
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        // Get month in SP
        const nowSPStr = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
        const nowSP = new Date(nowSPStr);
        const currentMonthName = months[nowSP.getMonth()];
        const s = (os.rawStatus || '').toUpperCase().trim();
        return os.mes === currentMonthName && FINISHED_EXCEL_STATUSES.includes(s);
    }).length;

    const completedTotal = osList.filter(os => {
        const s = (os.rawStatus || '').toUpperCase().trim();
        return FINISHED_EXCEL_STATUSES.includes(s);
    }).length;

    const pending = osList.filter(item => {
        const s = (item.rawStatus || '').toUpperCase().trim();
        return item.status === 'PENDING' && OPEN_EXCEL_STATUSES.includes(s);
    }).length;

    const inProgress = osList.filter(item => {
        const s = (item.rawStatus || '').toUpperCase().trim();
        return (item.status === 'IN_PROGRESS' || (item.checklistDone > 0 && item.status !== 'DONE')) &&
            OPEN_EXCEL_STATUSES.includes(s);
    }).length;

    const emExecucaoOS = osList.filter(item => {
        const s = (item.rawStatus || '').toUpperCase().trim();
        return s === 'EM EXECUÇÃO' || s === 'EM EXECUCAO';
    });
    const emExecucaoCount = emExecucaoOS.length;

    const emExecucaoUfMap: Record<string, number> = {};
    emExecucaoOS.forEach(os => {
        const uf = os.uf || 'N/A';
        emExecucaoUfMap[uf] = (emExecucaoUfMap[uf] || 0) + 1;
    });
    const emExecucaoUfBreakdown = Object.entries(emExecucaoUfMap)
        .map(([uf, count]) => ({ uf, count }))
        .sort((a, b) => {
            const indexA = UF_ORDER.indexOf(a.uf);
            const indexB = UF_ORDER.indexOf(b.uf);

            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;

            return b.count - a.count;
        });

    const completionRate = (open + completedTotal) > 0
        ? Math.round((completedTotal / (open + completedTotal)) * 100)
        : 0;

    // 6. Calculate Monthly Budget (MMM-YY format)
    const monthsShort = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const nowSP = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const currentBudgetMonth = `${monthsShort[nowSP.getMonth()]}-${nowSP.getFullYear().toString().slice(-2)}`;

    let budgetTotal = 0;
    let budgetDone = 0;
    let boxesTotal = 0;
    let boxesDone = 0;
    let facilitiesTotal = 0;
    let facilitiesDone = 0;

    osList.forEach(os => {
        if (os.mes === currentBudgetMonth) {
            const val = (os.valorServico || 0);
            budgetTotal += val;

            const boxesPlanned = (os.caixasPlanejadas || 0);
            boxesTotal += boxesPlanned;
            boxesDone += (os.checklistDone || 0);

            const s = (os.rawStatus || '').toUpperCase().trim();
            const isFinished = s === 'CONCLUÍDO' || s === 'CONCLUIDO';

            if (isFinished) {
                budgetDone += val;
            }

            const facPlanned = (os.facilidadesPlanejadas || 0);
            facilitiesTotal += facPlanned;
            if (isFinished) {
                facilitiesDone += facPlanned;
            }
        }
    });

    // 7. UF Deadline Breakdown (for open OSs)
    const deadlineUfMap = new Map<string, { vencido: number; hoje: number; em5dias: number; acima5dias: number; total: number }>();
    osList.forEach(os => {
        const s = (os.rawStatus || '').toUpperCase().trim();
        const isOpen = OPEN_EXCEL_STATUSES.includes(s);

        if (isOpen) {
            const uf = os.uf || 'N/A';
            if (!deadlineUfMap.has(uf)) {
                deadlineUfMap.set(uf, { vencido: 0, hoje: 0, em5dias: 0, acima5dias: 0, total: 0 });
            }
            const entry = deadlineUfMap.get(uf)!;
            const days = getDaysRemaining(os.dataPrevExec);

            if (days !== null) {
                if (days < 0) entry.vencido++;
                else if (days === 0) entry.hoje++;
                else if (days <= 5) entry.em5dias++;
                else entry.acima5dias++;
            } else {
                // If no deadline, count as > 5 or maybe a separate category? 
                // Image doesn't show "No Deadline", so I'll count as > 5 or ignore total?
                // Let's count in total anyway.
                entry.acima5dias++;
            }
            entry.total++;
        }
    });

    const deadlineUfBreakdown = Array.from(deadlineUfMap.entries())
        .map(([uf, data]) => ({ uf, ...data }))
        .sort((a, b) => b.total - a.total);

    const deadlineGrandTotal = deadlineUfBreakdown.reduce((acc, curr) => ({
        vencido: acc.vencido + curr.vencido,
        hoje: acc.hoje + curr.hoje,
        em5dias: acc.em5dias + curr.em5dias,
        acima5dias: acc.acima5dias + curr.acima5dias,
        total: acc.total + curr.total
    }), { vencido: 0, hoje: 0, em5dias: 0, acima5dias: 0, total: 0 });

    // Keep old ufBreakdown for other possible components or compatibility
    const ufMap = new Map<string, { total: number; done: number }>();
    osList.forEach(os => {
        const uf = os.uf || 'N/A';
        if (!ufMap.has(uf)) ufMap.set(uf, { total: 0, done: 0 });
        const entry = ufMap.get(uf)!;
        entry.total++;
        const s = (os.rawStatus || '').toUpperCase().trim();
        if (os.status === 'DONE' || FINISHED_EXCEL_STATUSES.includes(s)) entry.done++;
    });
    const ufBreakdown = Array.from(ufMap.entries())
        .map(([uf, data]) => ({ uf, ...data }))
        .sort((a, b) => b.total - a.total);

    // 7. Technician Performance & Daily OS Execution
    const techMap = new Map<string, { name: string; phone: string | null; completed: number; pending: number; checklistItems: number }>();
    const osPerformanceMap = new Map<string, { protocolo: string; pop: string; condominio: string | null; teams: Record<string, number> }>();

    equipes.forEach(t => {
        techMap.set(t.id, { name: t.fullName || t.nomeEquipe || t.name, phone: t.phone, completed: 0, pending: 0, checklistItems: 0 });
    });

    osRecords.forEach(os => {
        const exec = os.execution;
        if (exec && exec.equipeId) {
            const entry = techMap.get(exec.equipeId);
            if (entry) {
                if (exec.status === 'DONE') entry.completed++;
                else entry.pending++;

                // General count
                entry.checklistItems += os.caixas.filter(c => c.status === 'OK' || c.status === 'Concluído').length;
            }
        }

        // Aggregate Today's productivity by OS and Team
        os.caixas.forEach(caixa => {
            const isDoneToday = (caixa.status === 'OK' || caixa.status === 'Concluído') && caixa.data === todayDate;
            if (isDoneToday) {
                const teamName = caixa.nomeEquipe || 'Sem Equipe';
                if (!osPerformanceMap.has(os.id)) {
                    osPerformanceMap.set(os.id, {
                        protocolo: os.protocolo,
                        pop: os.pop,
                        condominio: os.condominio,
                        teams: {}
                    });
                }
                const osEntry = osPerformanceMap.get(os.id)!;
                osEntry.teams[teamName] = (osEntry.teams[teamName] || 0) + 1;
            }
        });
    });

    const performanceByOS = Array.from(osPerformanceMap.values())
        .map(os => ({
            title: os.condominio ? `${os.condominio.toUpperCase()} - ${os.protocolo}` : os.protocolo,
            pop: os.pop,
            teams: Object.entries(os.teams).map(([name, count]) => ({ name, count }))
        }));

    const techPerformance = Array.from(techMap.values())
        .filter(t => t.completed > 0 || t.pending > 0)
        .sort((a, b) => b.completed - a.completed);

    // 8. Activity Feed from Notifications
    const activityFeed = recentNotifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        createdAt: n.createdAt.toISOString(),
        techName: n.equipe?.fullName || n.equipe?.nomeEquipe || n.equipe?.name || null,
        read: n.read,
        osId: n.osId,
    }));

    return {
        stats: {
            total: open,
            open,
            openUfBreakdown,
            completedToday: completedTodayCount,
            todayConcluidas,
            todayCanceladas,
            completedTotal,
            completedMonth,
            pending,
            inProgress,
            emExecucao: emExecucaoCount,
            emExecucaoUfBreakdown,
            completionRate,
            budgetTotal,
            budgetDone,
            budgetMonth: currentBudgetMonth,
            boxesTotal,
            boxesDone,
            facilitiesTotal,
            facilitiesDone,
            equipeCount: equipes.length,
        },
        ufBreakdown,
        deadlineUfBreakdown,
        deadlineGrandTotal,
        techPerformance,
        performanceByOS,
        activityFeed,
        osList
    };
}
