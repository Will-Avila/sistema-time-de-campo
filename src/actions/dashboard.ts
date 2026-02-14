'use server';

import { prisma } from '@/lib/db';
import { getAllOS } from '@/lib/excel';
import { syncExcelToDB } from '@/lib/sync';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { getOSStatusInfo, getTodaySP, isSameDaySP } from '@/lib/utils';

export async function refreshData() {
    await requireAdmin();
    const result = await syncExcelToDB();
    revalidatePath('/admin/dashboard');
    revalidatePath('/os');
    revalidatePath('/admin/today');
    return result;
}

export async function getDashboardData() {
    // 1. Get Base OS Data
    const [osRecords, excelOSList, equipes, recentNotifications] = await Promise.all([
        prisma.orderOfService.findMany({
            include: {
                caixas: { select: { status: true } },
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
    const osList = excelOSList.map(os => {
        const dbRecord = executionMap.get(os.id);
        const execution = dbRecord?.execution;

        let status = 'PENDING';
        let equipeName = '-';

        // Determine the most recent update date (OS metadata vs App Execution)
        let lastUpdate: Date | null = dbRecord?.updatedAt || null;
        if (execution && execution.updatedAt) {
            if (!lastUpdate || execution.updatedAt > lastUpdate) {
                lastUpdate = execution.updatedAt;
            }
        }

        const checklistTotal = dbRecord?.caixas.length || 0;
        const checklistDone = dbRecord?.caixas.filter(c => c.status === 'OK' || c.status === 'Concluído').length || 0;

        if (execution) {
            status = execution.status;
            equipeName = execution.equipe?.fullName || execution.equipe?.nomeEquipe || execution.equipe?.name || '-';
        } else {
            if (os.status.toLowerCase().includes('execu')) status = 'IN_PROGRESS';
        }

        return {
            id: os.id,
            protocolo: os.protocolo,
            pop: os.pop,
            uf: os.uf,
            cenario: os.cenario,
            dataPrevExec: os.dataPrevExec,
            dataConclusao: os.dataConclusao || '-',
            mes: os.mes || '-',
            totalCaixas: checklistTotal,
            status,
            equipeName,
            lastUpdate: lastUpdate ? lastUpdate.toISOString() : null,
            executionUpdatedAt: execution?.updatedAt ? execution.updatedAt.toISOString() : null,
            checklistTotal,
            checklistDone,
            rawStatus: os.status,
            executionStatus: execution ? getOSStatusInfo({ osStatus: os.status, execution }).label : 'Pendente',
        };
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
    const openUfBreakdown = Object.entries(openUfMap)
        .map(([uf, count]) => ({ uf, count }))
        .sort((a, b) => b.count - a.count);

    const todayDate = getTodaySP();
    const now = new Date();
    const monthsBRShort = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const currentMonthPattern = `${monthsBRShort[now.getMonth()]}-${String(now.getFullYear()).slice(-2)}`;

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
        const isAppToday = os.lastUpdate && isSameDaySP(os.lastUpdate, todayDate) && isFinished &&
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

    const completionRate = (open + completedTotal) > 0
        ? Math.round((completedTotal / (open + completedTotal)) * 100)
        : 0;

    // 6. UF Breakdown (Total)
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

    // 7. Technician Performance
    const techMap = new Map<string, { name: string; phone: string | null; completed: number; pending: number; checklistItems: number }>();
    equipes.forEach(t => {
        techMap.set(t.id, { name: t.fullName || t.nomeEquipe || t.name, phone: t.phone, completed: 0, pending: 0, checklistItems: 0 });
    });

    // We can't use 'executions' variable anymore since we refactored the query.
    // Let's use osRecords to get performance data.
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
            completionRate,
            equipeCount: equipes.length,
        },
        ufBreakdown,
        techPerformance,
        activityFeed,
        osList
    };
}
