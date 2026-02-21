'use server';

import { prisma } from '@/lib/db';
import { getAllOS } from '@/lib/excel';
import { requireAdmin } from '@/lib/auth';

export async function getAvailableMonths() {
    await requireAdmin();
    const months = await prisma.orderOfService.findMany({
        where: { mes: { not: '' } },
        distinct: ['mes'],
        select: { mes: true },
    });

    const monthMap: Record<string, number> = {
        'JAN': 0, 'FEV': 1, 'MAR': 2, 'ABR': 3, 'MAI': 4, 'JUN': 5,
        'JUL': 6, 'AGO': 7, 'SET': 8, 'OUT': 9, 'NOV': 10, 'DEZ': 11
    };

    const uniqueUpperMonths = Array.from(new Set(months.map(m => m.mes.toUpperCase())));

    return uniqueUpperMonths
        .sort((a, b) => {
            const [monthA, yearA] = a.split('-');
            const [monthB, yearB] = b.split('-');
            const dateA = new Date(2000 + parseInt(yearA), monthMap[monthA] || 0, 1);
            const dateB = new Date(2000 + parseInt(yearB), monthMap[monthB] || 0, 1);
            return dateB.getTime() - dateA.getTime();
        });
}

export async function getMonthlyReportData(month: string, range: number = 1) {
    await requireAdmin();

    const targetMonth = (month || '').toUpperCase().trim();
    const availableMonths = await getAvailableMonths();

    const startIndex = availableMonths.indexOf(targetMonth);
    const monthsToFilter = startIndex !== -1
        ? availableMonths.slice(startIndex, startIndex + range)
        : [targetMonth];

    const [osRecords, excelOSList] = await Promise.all([
        prisma.orderOfService.findMany({
            include: {
                caixas: { select: { status: true, valor: true, nomeEquipe: true } },
                execution: true
            }
        }),
        getAllOS()
    ]);

    const dbFiltered = osRecords.filter(r => monthsToFilter.includes((r.mes || '').toUpperCase().trim()));
    const excelFiltered = excelOSList.filter(os => monthsToFilter.includes((os.mes || '').toUpperCase().trim()));

    const dbMap = new Map(dbFiltered.map(r => [r.id, r]));
    const OPEN_EXCEL_STATUSES = ['INICIAR', 'EM EXECUÇÃO', 'EM EXECUCAO', 'PEND. CLIENTE'];

    const reportItems = excelFiltered.map(os => {
        const db = dbMap.get(os.id);
        const s = (os.status || '').toUpperCase().trim();
        const isFinished = s === 'CONCLUÍDO' || s === 'CONCLUIDO';
        const isOpen = OPEN_EXCEL_STATUSES.includes(s);
        const isCanceled = s === 'CANCELADO';

        if (!isFinished && !isOpen && !isCanceled) return null;

        return {
            ...os,
            dbStatus: db?.status || 'PENDING',
            valorServico: os.valorServico || 0,
            dataConclusao: os.dataConclusao || '-',
            equipe: db?.execution?.technicianName || '-'
        };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    const evolutionMap: Record<string, number> = {};
    reportItems.forEach(item => {
        const s = (item.status || '').toUpperCase().trim();
        if ((item.dataConclusao && item.dataConclusao !== '-') && (s === 'CONCLUÍDO' || s === 'CONCLUIDO')) {
            const key = range > 1 ? (item.mes || 'N/A').toUpperCase().trim() : item.dataConclusao;
            evolutionMap[key] = (evolutionMap[key] || 0) + item.valorServico;
        }
    });

    let evolutionData;
    if (range > 1) {
        evolutionData = monthsToFilter.slice().reverse().map(m => ({
            date: m, fullDate: m, value: evolutionMap[m] || 0
        }));
    } else {
        evolutionData = Object.entries(evolutionMap)
            .map(([date, value]) => {
                const parts = date.split('/');
                if (parts.length < 3) return null;
                const [d, m, y] = parts;
                return { date, sortDate: `${y}${m}${d}`, value };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .sort((a, b) => a.sortDate.localeCompare(b.sortDate))
            .map(({ date, value }) => ({ date: date.slice(0, 5), fullDate: date, value }));
    }

    const ufMap: Record<string, { uf: string; previsto: number; realizado: number }> = {};
    reportItems.forEach(item => {
        const uf = item.uf || 'N/A';
        if (!ufMap[uf]) ufMap[uf] = { uf, previsto: 0, realizado: 0 };
        ufMap[uf].previsto += item.valorServico;
        const s = (item.status || '').toUpperCase().trim();
        if (s === 'CONCLUÍDO' || s === 'CONCLUIDO') ufMap[uf].realizado += item.valorServico;
    });

    const ufData = Object.values(ufMap).sort((a, b) => b.previsto - a.previsto);

    const teamMap: Record<string, number> = {};
    dbFiltered.forEach(os => {
        const val = (os.valorServico || 0);
        const s = (os.status || '').toUpperCase().trim();
        const boxTeams = new Set<string>();
        os.caixas.forEach(c => {
            if (c.status === 'OK' || c.status === 'Concluído') {
                const name = c.nomeEquipe?.trim();
                if (name && name !== '-') boxTeams.add(name);
            }
        });
        if (boxTeams.size > 0) {
            boxTeams.forEach(team => { teamMap[team] = (teamMap[team] || 0) + val; });
        } else if (s === 'DONE' || s === 'CONCLUÍDO' || s === 'CONCLUIDO') {
            const team = os.execution?.technicianName || 'Sem Equipe';
            teamMap[team] = (teamMap[team] || 0) + val;
        }
    });

    const totalPrevisto = ufData.reduce((acc, curr) => acc + curr.previsto, 0);
    const totalRealizado = ufData.reduce((acc, curr) => acc + curr.realizado, 0);
    const totalCancelado = excelFiltered.reduce((acc, os) => (os.status || '').toUpperCase().trim() === 'CANCELADO' ? acc + (os.valorServico || 0) : acc, 0);
    const totalPendente = Math.max(0, totalPrevisto - totalRealizado - totalCancelado);

    return {
        month: targetMonth,
        monthsFiltered: monthsToFilter,
        summary: {
            totalPrevisto: Math.round(totalPrevisto),
            totalRealizado: Math.round(totalRealizado),
            totalCancelado: Math.round(totalCancelado),
            performance: totalPrevisto > 0 ? Math.round((totalRealizado / totalPrevisto) * 100) : 0
        },
        dailyEvolution: evolutionData,
        ufData: ufData.map(u => ({ ...u, previsto: Math.round(u.previsto), realizado: Math.round(u.realizado) })),
        teamData: Object.entries(teamMap).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value),
        funnelData: [
            { name: 'Realizado', value: Math.round(totalRealizado), color: '#10b981' },
            { name: 'Pendente', value: Math.round(totalPendente), color: '#3b82f6' },
            { name: 'Cancelado', value: Math.round(totalCancelado), color: '#ef4444' }
        ]
    };
}

export async function getBoxesReportData(month: string, range: number = 1) {
    await requireAdmin();
    const targetMonth = (month || '').toUpperCase().trim();
    const availableMonths = await getAvailableMonths();
    const startIndex = availableMonths.indexOf(targetMonth);
    const monthsToFilter = startIndex !== -1 ? availableMonths.slice(startIndex, startIndex + range) : [targetMonth];

    const [osRecords, excelOSList] = await Promise.all([
        prisma.orderOfService.findMany({ include: { caixas: { select: { status: true, nomeEquipe: true } }, execution: true } }),
        getAllOS()
    ]);

    const dbFiltered = osRecords.filter(r => monthsToFilter.includes((r.mes || '').toUpperCase().trim()));
    const excelFiltered = excelOSList.filter(os => monthsToFilter.includes((os.mes || '').toUpperCase().trim()));
    const dbMap = new Map(dbFiltered.map(r => [r.id, r]));
    const OPEN_EXCEL_STATUSES = ['INICIAR', 'EM EXECUÇÃO', 'EM EXECUCAO', 'PEND. CLIENTE'];

    const reportItems = excelFiltered.map(os => {
        const db = dbMap.get(os.id);
        const s = (os.status || '').toUpperCase().trim();
        const isFinished = s === 'CONCLUÍDO' || s === 'CONCLUIDO';
        const isOpen = OPEN_EXCEL_STATUSES.includes(s);
        const isCanceled = s === 'CANCELADO';
        if (!isFinished && !isOpen && !isCanceled) return null;
        const boxesPlanned = os.caixasPlanejadas || 0;
        const boxesDone = isFinished ? boxesPlanned : (db?.caixas.filter(c => c.status === 'OK' || c.status === 'Concluído').length || 0);
        return { ...os, caixasPlanejadas: boxesPlanned, caixasRealizadas: boxesDone, dataConclusao: os.dataConclusao || '-', equipe: db?.execution?.technicianName || '-' };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    const evolutionMap: Record<string, number> = {};
    dbFiltered.forEach(os => {
        const finishedBoxes = os.caixas.filter(c => (c.status === 'OK' || c.status === 'Concluído'));
        const s = (os.status || '').toUpperCase().trim();
        const dateStr = (os.dataConclusao || '-');
        if (dateStr !== '-' && (s === 'CONCLUÍDO' || s === 'CONCLUIDO' || s === 'DONE')) {
            const key = range > 1 ? (os.mes || 'N/A').toUpperCase().trim() : dateStr;
            evolutionMap[key] = (evolutionMap[key] || 0) + finishedBoxes.length;
        }
    });

    let evolutionData;
    if (range > 1) {
        evolutionData = monthsToFilter.slice().reverse().map(m => ({ date: m, fullDate: m, value: evolutionMap[m] || 0 }));
    } else {
        evolutionData = Object.entries(evolutionMap).map(([date, value]) => {
            const parts = date.split('/');
            if (parts.length < 3) return null;
            const [d, m, y] = parts;
            return { date, sortDate: `${y}${m}${d}`, value };
        }).filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => a.sortDate.localeCompare(b.sortDate)).map(({ date, value }) => ({ date: date.slice(0, 5), fullDate: date, value }));
    }

    const ufMap: Record<string, { uf: string; previsto: number; realizado: number }> = {};
    reportItems.forEach(item => {
        const uf = item.uf || 'N/A';
        if (!ufMap[uf]) ufMap[uf] = { uf, previsto: 0, realizado: 0 };
        ufMap[uf].previsto += item.caixasPlanejadas;
        ufMap[uf].realizado += item.caixasRealizadas;
    });

    const ufData = Object.values(ufMap).sort((a, b) => b.previsto - a.previsto);

    const teamMap: Record<string, number> = {};
    dbFiltered.forEach(os => {
        os.caixas.forEach(c => {
            if (c.status === 'OK' || c.status === 'Concluído') {
                const name = c.nomeEquipe?.trim() || 'Sem Equipe';
                if (name && name !== '-') teamMap[name] = (teamMap[name] || 0) + 1;
            }
        });
    });

    const totalPrevisto = ufData.reduce((acc, curr) => acc + curr.previsto, 0);
    const totalRealizado = ufData.reduce((acc, curr) => acc + curr.realizado, 0);
    const totalCancelado = excelFiltered.reduce((acc, os) => (os.status || '').toUpperCase().trim() === 'CANCELADO' ? acc + (os.caixasPlanejadas || 0) : acc, 0);
    const totalPendente = Math.max(0, totalPrevisto - totalRealizado - totalCancelado);

    return {
        month: targetMonth, monthsFiltered: monthsToFilter,
        summary: {
            totalPlanejado: Math.round(totalPrevisto),
            totalRealizado: Math.round(totalRealizado),
            totalCancelado: Math.round(totalCancelado),
            performance: totalPrevisto > 0 ? Math.round((totalRealizado / totalPrevisto) * 100) : 0
        },
        dailyEvolution: evolutionData,
        ufData: ufData.map(u => ({ ...u, previsto: Math.round(u.previsto), realizado: Math.round(u.realizado) })),
        teamData: Object.entries(teamMap).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value),
        funnelData: [
            { name: 'Realizado', value: Math.round(totalRealizado), color: '#3b82f6' },
            { name: 'Pendente', value: Math.round(totalPendente), color: '#94a3b8' },
            { name: 'Cancelado', value: Math.round(totalCancelado), color: '#ef4444' }
        ]
    };
}

export async function getFacilitiesReportData(month: string, range: number = 1) {
    await requireAdmin();
    const targetMonth = (month || '').toUpperCase().trim();
    const availableMonths = await getAvailableMonths();
    const startIndex = availableMonths.indexOf(targetMonth);
    const monthsToFilter = startIndex !== -1 ? availableMonths.slice(startIndex, startIndex + range) : [targetMonth];

    const [osRecords, excelOSList] = await Promise.all([
        prisma.orderOfService.findMany({ include: { caixas: { select: { status: true, valor: true, nomeEquipe: true } }, execution: true } }),
        getAllOS()
    ]);

    const dbFiltered = osRecords.filter(r => monthsToFilter.includes((r.mes || '').toUpperCase().trim()));
    const excelFiltered = excelOSList.filter(os => monthsToFilter.includes((os.mes || '').toUpperCase().trim()));
    const dbMap = new Map(dbFiltered.map(r => [r.id, r]));
    const OPEN_EXCEL_STATUSES = ['INICIAR', 'EM EXECUÇÃO', 'EM EXECUCAO', 'PEND. CLIENTE'];

    const reportItems = excelFiltered.map(os => {
        const db = dbMap.get(os.id);
        const s = (os.status || '').toUpperCase().trim();
        const isFinished = s === 'CONCLUÍDO' || s === 'CONCLUIDO';
        const isOpen = OPEN_EXCEL_STATUSES.includes(s);
        const isCanceled = s === 'CANCELADO';
        if (!isFinished && !isOpen && !isCanceled) return null;
        const facPlanned = os.facilidadesPlanejadas || 0;
        const boxesPlanned = os.caixasPlanejadas || 0;
        const boxesDone = db?.caixas.filter(c => c.status === 'OK' || c.status === 'Concluído').length || 0;
        let facDone = isFinished ? facPlanned : (boxesPlanned > 0 ? (boxesDone * (facPlanned / boxesPlanned)) : 0);
        return { ...os, facilidadesPlanejadas: facPlanned, facilidadesRealizadas: facDone, dataConclusao: os.dataConclusao || '-', equipe: db?.execution?.technicianName || '-' };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    const evolutionMap: Record<string, number> = {};
    reportItems.forEach(item => {
        const s = (item.status || '').toUpperCase().trim();
        const isFinished = s === 'CONCLUÍDO' || s === 'CONCLUIDO';
        if (isFinished && item.dataConclusao !== '-') {
            const key = range > 1 ? (item.mes || 'N/A').toUpperCase().trim() : item.dataConclusao;
            evolutionMap[key] = (evolutionMap[key] || 0) + item.facilidadesPlanejadas;
        }
    });

    let evolutionData;
    if (range > 1) {
        evolutionData = monthsToFilter.slice().reverse().map(m => ({ date: m, fullDate: m, value: evolutionMap[m] || 0 }));
    } else {
        evolutionData = Object.entries(evolutionMap).map(([date, value]) => {
            const parts = date.split('/');
            if (parts.length < 3) return null;
            const [d, m, y] = parts;
            return { date, sortDate: `${y}${m}${d}`, value };
        }).filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => a.sortDate.localeCompare(b.sortDate)).map(({ date, value }) => ({ date: date.slice(0, 5), fullDate: date, value }));
    }

    const ufMap: Record<string, { uf: string; previsto: number; realizado: number }> = {};
    reportItems.forEach(item => {
        const uf = item.uf || 'N/A';
        if (!ufMap[uf]) ufMap[uf] = { uf, previsto: 0, realizado: 0 };
        ufMap[uf].previsto += item.facilidadesPlanejadas;
        ufMap[uf].realizado += item.facilidadesRealizadas;
    });
    const ufData = Object.values(ufMap).sort((a, b) => b.previsto - a.previsto);

    const teamMap: Record<string, number> = {};
    reportItems.forEach(item => { if (item.facilidadesRealizadas > 0) { const name = item.equipe || 'Sem Equipe'; teamMap[name] = (teamMap[name] || 0) + item.facilidadesRealizadas; } });

    const totalPrevisto = ufData.reduce((acc, curr) => acc + curr.previsto, 0);
    const totalRealizado = ufData.reduce((acc, curr) => acc + curr.realizado, 0);
    const totalCancelado = excelFiltered.reduce((acc, os) => (os.status || '').toUpperCase().trim() === 'CANCELADO' ? acc + (os.facilidadesPlanejadas || 0) : acc, 0);
    const totalPendente = Math.max(0, totalPrevisto - totalRealizado - totalCancelado);

    return {
        month: targetMonth, monthsFiltered: monthsToFilter,
        summary: {
            totalPlanejado: Math.round(totalPrevisto),
            totalRealizado: Math.round(totalRealizado),
            totalCancelado: Math.round(totalCancelado),
            performance: totalPrevisto > 0 ? Math.round((totalRealizado / totalPrevisto) * 100) : 0
        },
        dailyEvolution: evolutionData,
        ufData: ufData.map(u => ({ ...u, previsto: Math.round(u.previsto), realizado: Math.round(u.realizado) })),
        teamData: Object.entries(teamMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
        funnelData: [
            { name: 'Realizado', value: Math.round(totalRealizado), color: '#f59e0b' },
            { name: 'Pendente', value: Math.round(totalPendente), color: '#94a3b8' },
            { name: 'Cancelado', value: Math.round(totalCancelado), color: '#ef4444' }
        ]
    };
}
