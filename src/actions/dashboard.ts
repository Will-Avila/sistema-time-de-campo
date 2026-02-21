'use server';

import { prisma } from '@/lib/db';
import { getAllOS } from '@/lib/excel';
import { syncExcelToDB } from '@/lib/sync';
import { syncProgressStore } from '@/lib/sync-progress';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { getTodaySP, isSameDaySP, getDaysRemaining } from '@/lib/utils';
import { getSession } from '@/lib/auth';
import { getAvailableMonths } from './reports';

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
    const session = await getSession();

    // Calculate current budget month (formato JAN-26) early to avoid ReferenceError
    const monthsShort = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const nowSPStr = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
    const nowSP = new Date(nowSPStr);
    const currentBudgetMonth = `${monthsShort[nowSP.getMonth()]}-${nowSP.getFullYear().toString().slice(-2)}`;

    const activeMonth = currentBudgetMonth;

    const [osRecords, excelOSList, equipes, recentNotifications, launchesToday, lancaItemsRaw, availableMonths] = await Promise.all([
        prisma.orderOfService.findMany({
            include: {
                caixas: { select: { status: true, nomeEquipe: true, data: true, equipe: true } },
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
            select: { id: true, name: true, fullName: true, nomeEquipe: true, phone: true, codEquipe: true, excelId: true },
        }),
        prisma.notification.findMany({
            where: session?.isAdmin ? {
                OR: [
                    { type: { in: ['CHECKLIST', 'OS_CLOSE'] } },
                    { type: 'NEW_OS', equipeId: session.id }
                ]
            } : (session ? { equipeId: session.id } : { id: 'none' }),
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: { equipe: { select: { name: true, fullName: true, nomeEquipe: true } } }
        }),
        prisma.lancaAlare.findMany({
            where: { data: todayDate }
        }),
        prisma.lancaAlare.findMany({
            select: { osId: true, previsao: true, lancado: true }
        }),
        getAvailableMonths()
    ]);

    const lancaItems = lancaItemsRaw || [];

    const equipeMap = new Map<string, string>();
    equipes.forEach(e => {
        const displayName = e.fullName || e.nomeEquipe || e.name;
        if (e.id) equipeMap.set(String(e.id).toLowerCase(), displayName);
        if (e.excelId) equipeMap.set(String(e.excelId).toLowerCase(), displayName);
        if (e.codEquipe) equipeMap.set(String(e.codEquipe).toLowerCase(), displayName);
        if (e.name) equipeMap.set(e.name.toLowerCase(), displayName);
        if (e.nomeEquipe) equipeMap.set(e.nomeEquipe.toLowerCase(), displayName);
        if (e.fullName) equipeMap.set(e.fullName.toLowerCase(), displayName);
    });

    const resolveTeamName = (idOrName: string | null | undefined): string => {
        if (!idOrName) return 'Sem Equipe';
        const normalized = String(idOrName).trim().toLowerCase();
        return equipeMap.get(normalized) || String(idOrName).trim();
    };

    // Fallback for availableMonths if DB is empty
    let finalAvailableMonths = (availableMonths || []) as string[];
    if (finalAvailableMonths.length === 0 && excelOSList.length > 0) {
        const monthsSet = new Set(excelOSList.map(os => os.mes.toUpperCase()).filter(m => !!m));
        finalAvailableMonths = Array.from(monthsSet).sort((a, b) => {
            const monthMap: Record<string, number> = {
                'JAN': 0, 'FEV': 1, 'MAR': 2, 'ABR': 3, 'MAI': 4, 'JUN': 5,
                'JUL': 6, 'AGO': 7, 'SET': 8, 'OUT': 9, 'NOV': 10, 'DEZ': 11
            };
            const [monthA, yearA] = a.split('-');
            const [monthB, yearB] = b.split('-');
            const dateA = new Date(2000 + parseInt(yearA), monthMap[monthA] || 0, 1);
            const dateB = new Date(2000 + parseInt(yearB), monthMap[monthB] || 0, 1);
            return dateB.getTime() - dateA.getTime();
        });
    }

    // 3. Aggregate Launch Data
    const parseMeters = (val: string | null) => {
        if (!val) return 0;
        const matched = val.match(/[\d.]+/);
        return matched ? parseFloat(matched[0]) : 0;
    };

    const lancaDataMap = new Map<string, { total: number; done: number }>();
    lancaItems.forEach(item => {
        if (!item.osId) return;
        const current = lancaDataMap.get(item.osId) || { total: 0, done: 0 };
        current.total += parseMeters(item.previsao);
        current.done += parseMeters(item.lancado);
        lancaDataMap.set(item.osId, current);
    });

    // 4. Merge Data for the List (Use Excel as base for metadata like dataConclusao)
    const executionMap = new Map(osRecords.map(r => [r.id, r]));
    const { enrichOS } = await import('@/lib/os-enrichment');

    const osListAll = excelOSList.map(os => {
        const dbRecord = executionMap.get(os.id);
        const enriched = enrichOS(os, dbRecord as any);

        const lanca = lancaDataMap.get(os.id);

        return {
            ...enriched,
            status: enriched.executionStatus === 'Concluída' ? 'DONE' :
                enriched.executionStatus === 'Em execução' ? 'IN_PROGRESS' : 'PENDING',
            rawStatus: os.status,
            valorServico: os.valorServico,
            hasLanca: !!lanca,
            lancaMetersTotal: lanca?.total || 0,
            lancaMetersDone: lanca?.done || 0,
        };
    });

    // Filtramos pelo mês selecionado
    const osList = osListAll.filter(os => os.mes === activeMonth).sort((a, b) => {
        const parseDate = (d?: string) => {
            if (!d || d === '-') return new Date(0);
            const [day, month, year] = d.split('/').map(Number);
            return new Date(year, month - 1, day);
        };
        return parseDate(b.dataEntrante).getTime() - parseDate(a.dataEntrante).getTime();
    });

    // 5. Calculate Stats
    const OPEN_EXCEL_STATUSES = ['INICIAR', 'EM EXECUÇÃO', 'EM EXECUCAO', 'PEND. CLIENTE'];
    const FINISHED_EXCEL_STATUSES = ['CONCLUÍDO', 'CONCLUIDO', 'CONCLUÍDA', 'CANCELADO'];

    const openOS = osList.filter(os => {
        const s = (os.rawStatus || '').toUpperCase().trim();
        return OPEN_EXCEL_STATUSES.includes(s);
    });
    const open = openOS.length;

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

    const completedToday = osListAll.filter(os => {
        const isExcelToday = os.dataConclusao === todayDate;
        if (os.dataConclusao !== '-' && os.dataConclusao !== todayDate) return false;
        const dbRecord = executionMap.get(os.id);
        const execUpdateToday = dbRecord?.execution?.updatedAt && isSameDaySP(dbRecord.execution.updatedAt, todayDate);
        const s = (os.executionStatus || '').toUpperCase().trim();
        const raw = (os.rawStatus || '').toUpperCase().trim();
        const isFinished = s.includes('CONCLUÍD') || s.includes('CONCLUID') || s.includes('SEM EXECUÇ') || s.includes('SEM EXECUC') || s.includes('EM ANÁLIS') || s.includes('EM ANALIS') || s.includes('CANCELAD') || raw === 'CANCELADO';
        const isAppToday = os.lastUpdate && isSameDaySP(new Date(os.lastUpdate), todayDate) && isFinished && (execUpdateToday || isExcelToday);
        return isExcelToday || isAppToday;
    });

    const completedTodayCount = completedToday.length;
    const todayCanceladas = completedToday.filter(os => {
        const s = (os.executionStatus || '').toUpperCase().trim();
        const raw = (os.rawStatus || '').toUpperCase().trim();
        return s.includes('SEM EXECUÇ') || s.includes('SEM EXECUC') || s.includes('CANCELAD') || raw === 'CANCELADO';
    }).length;

    const todayConcluidas = completedTodayCount - todayCanceladas;

    const completedMonth = osList.filter(os => {
        const s = (os.rawStatus || '').toUpperCase().trim();
        return FINISHED_EXCEL_STATUSES.includes(s);
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
        return (item.status === 'IN_PROGRESS' || (item.checklistDone > 0 && item.status !== 'DONE')) && OPEN_EXCEL_STATUSES.includes(s);
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

    const completionRate = (open + completedTotal) > 0 ? Math.round((completedTotal / (open + completedTotal)) * 100) : 0;

    // 6. Calculate Monthly Totals
    let budgetTotal = 0;
    let budgetDone = 0;
    let boxesTotal = 0;
    let boxesDone = 0;
    let facilitiesTotal = 0;
    let facilitiesDone = 0;

    osList.forEach(os => {
        const s = (os.rawStatus || '').toUpperCase().trim();
        const isFinished = s === 'CONCLUÍDO' || s === 'CONCLUIDO';
        const isCanceled = s === 'CANCELADO';
        const isOpen = OPEN_EXCEL_STATUSES.includes(s);

        if (!isFinished && !isOpen && !isCanceled) return;

        const val = (os.valorServico || 0);
        budgetTotal += val;
        const boxesPlanned = (os.caixasPlanejadas || 0);
        boxesTotal += boxesPlanned;
        const facPlanned = (os.facilidadesPlanejadas || 0);
        facilitiesTotal += facPlanned;

        if (isFinished) {
            budgetDone += val;
            boxesDone += boxesPlanned;
            facilitiesDone += facPlanned;
        } else if (isOpen) {
            boxesDone += (os.checklistDone || 0);
            if (boxesPlanned > 0) {
                const ratio = facPlanned / boxesPlanned;
                facilitiesDone += (os.checklistDone || 0) * ratio;
            }
        }
    });

    // 7. UF Deadline Breakdown
    const deadlineUfMap = new Map<string, { vencido: number; hoje: number; em5dias: number; acima5dias: number; total: number }>();
    osList.forEach(os => {
        const s = (os.rawStatus || '').toUpperCase().trim();
        const isOpen = OPEN_EXCEL_STATUSES.includes(s);
        if (isOpen) {
            const uf = os.uf || 'N/A';
            if (!deadlineUfMap.has(uf)) deadlineUfMap.set(uf, { vencido: 0, hoje: 0, em5dias: 0, acima5dias: 0, total: 0 });
            const entry = deadlineUfMap.get(uf)!;
            const days = getDaysRemaining(os.dataPrevExec);
            if (days !== null) {
                if (days < 0) entry.vencido++;
                else if (days === 0) entry.hoje++;
                else if (days <= 5) entry.em5dias++;
                else entry.acima5dias++;
            } else {
                entry.acima5dias++;
            }
            entry.total++;
        }
    });

    const deadlineUfBreakdown = Array.from(deadlineUfMap.entries())
        .map(([uf, d]) => ({ uf, ...d }))
        .sort((a, b) => b.total - a.total);

    const deadlineGrandTotal = deadlineUfBreakdown.reduce((acc, curr) => ({
        vencido: acc.vencido + curr.vencido,
        hoje: acc.hoje + curr.hoje,
        em5dias: acc.em5dias + curr.em5dias,
        acima5dias: acc.acima5dias + curr.acima5dias,
        total: acc.total + curr.total
    }), { vencido: 0, hoje: 0, em5dias: 0, acima5dias: 0, total: 0 });

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
        .map(([uf, d]) => ({ uf, ...d }))
        .sort((a, b) => b.total - a.total);

    // 8. Technician Performance & Daily OS Execution
    const techMap = new Map<string, { name: string; phone: string | null; completed: number; pending: number; checklistItems: number }>();
    const osPerformanceMap = new Map<string, { protocolo: string; pop: string; condominio: string | null; teams: Record<string, { caixas: number; metrosLancados: number }> }>();

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
                entry.checklistItems += os.caixas.filter(c => c.status === 'OK' || c.status === 'Concluído').length;
            }
        }
    });

    // Aggregate today's performance
    launchesToday.forEach(l => {
        if (!l.osId) return;
        const teamName = resolveTeamName(l.equipe);
        if (!osPerformanceMap.has(l.osId)) {
            const osInfo = osListAll.find(o => o.id === l.osId);
            osPerformanceMap.set(l.osId, {
                protocolo: osInfo?.protocolo || l.osId,
                pop: osInfo?.pop || '-',
                condominio: (osInfo as any)?.condominio || null,
                teams: {}
            });
        }
        const osEntry = osPerformanceMap.get(l.osId)!;
        if (!osEntry.teams[teamName]) osEntry.teams[teamName] = { caixas: 0, metrosLancados: 0 };
        const metragem = parseFloat(l.lancado?.replace(',', '.') || '0');
        if (!isNaN(metragem)) {
            osEntry.teams[teamName].metrosLancados += metragem;
        }
    });

    osRecords.forEach(os => {
        os.caixas.forEach(caixa => {
            const isDoneToday = (caixa.status === 'OK' || caixa.status === 'Concluído') && caixa.data === todayDate;
            if (isDoneToday) {
                const teamName = resolveTeamName(caixa.nomeEquipe || caixa.equipe);
                if (!osPerformanceMap.has(os.id)) {
                    osPerformanceMap.set(os.id, { protocolo: os.protocolo, pop: os.pop, condominio: os.condominio, teams: {} });
                }
                const osEntry = osPerformanceMap.get(os.id)!;
                if (!osEntry.teams[teamName]) osEntry.teams[teamName] = { caixas: 0, metrosLancados: 0 };
                osEntry.teams[teamName].caixas += 1;
            }
        });
    });

    const performanceByOS = Array.from(osPerformanceMap.values())
        .map(os => ({
            title: os.condominio ? `${os.condominio.toUpperCase()} - ${os.protocolo}` : os.protocolo,
            pop: os.pop,
            teams: Object.entries(os.teams).map(([name, counts]) => ({
                name,
                caixas: counts.caixas || 0,
                metrosLancados: counts.metrosLancados || 0
            }))
        }));

    const techPerformance = Array.from(techMap.values())
        .filter(t => t.completed > 0 || t.pending > 0)
        .sort((a, b) => b.completed - a.completed);

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
            completedMonth: completedMonth,
            pending,
            inProgress,
            emExecucao: emExecucaoCount,
            emExecucaoUfBreakdown,
            completionRate,
            budgetTotal,
            budgetDone,
            budgetMonth: activeMonth,
            boxesTotal,
            boxesDone,
            facilitiesTotal,
            facilitiesDone: Math.round(facilitiesDone),
            equipeCount: equipes.length,
        },
        ufBreakdown,
        deadlineUfBreakdown,
        deadlineGrandTotal,
        techPerformance,
        performanceByOS,
        activityFeed,
        osList: osListAll,
        availableMonths: finalAvailableMonths,
        activeMonth
    };
}
