'use server';

import { prisma } from '@/lib/db';
import { getAllOS } from '@/lib/excel';
import { requireAdmin } from '@/lib/auth';
import { getTodaySP } from '@/lib/utils';

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

    // Transform to uppercase and get unique values in code
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

export async function getMonthlyReportData(month: string) {
    await requireAdmin();

    const targetMonth = (month || '').toUpperCase().trim();

    // Fetch all records for the month (case-insensitive search is tricky in Prisma without knowing the provider)
    // We'll fetch all and filter in JS if needed, but since we are normalizing to uppercase, 
    // let's try a simple match first.
    const [osRecords, excelOSList] = await Promise.all([
        prisma.orderOfService.findMany({
            include: {
                caixas: { select: { status: true, valor: true, nomeEquipe: true } },
                execution: true
            }
        }),
        getAllOS()
    ]);

    // Filter both lists by the normalized month
    const dbFiltered = osRecords.filter(r => (r.mes || '').toUpperCase().trim() === targetMonth);
    const excelFiltered = excelOSList.filter(os => (os.mes || '').toUpperCase().trim() === targetMonth);

    // Map Excel data to DB records for full metadata
    const dbMap = new Map(dbFiltered.map(r => [r.id, r]));

    // List of statuses that mean the OS is active (not canceled/rejected)
    const OPEN_EXCEL_STATUSES = ['INICIAR', 'EM EXECUÇÃO', 'EM EXECUCAO', 'PEND. CLIENTE'];

    const reportItems = excelFiltered.map(os => {
        const db = dbMap.get(os.id);
        const s = (os.status || '').toUpperCase().trim();
        const isFinished = s === 'CONCLUÍDO' || s === 'CONCLUIDO';
        const isOpen = OPEN_EXCEL_STATUSES.includes(s);
        const isCanceled = s === 'CANCELADO';

        // Agora incluímos CANCELADO nos totais para ter a ideia do bruto
        if (!isFinished && !isOpen && !isCanceled) return null;

        return {
            ...os,
            dbStatus: db?.status || 'PENDING',
            valorServico: os.valorServico || 0,
            dataConclusao: os.dataConclusao || '-',
            equipe: db?.execution?.technicianName || '-'
        };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    // 1. Daily Evolution (Realized)
    const dailyMap: Record<string, number> = {};
    reportItems.forEach(item => {
        // Status check should also be case insensitive
        const s = (item.status || '').toUpperCase().trim();
        if ((item.dataConclusao && item.dataConclusao !== '-') && (s === 'CONCLUÍDO' || s === 'CONCLUIDO')) {
            const day = item.dataConclusao; // DD/MM/YYYY
            dailyMap[day] = (dailyMap[day] || 0) + item.valorServico;
        }
    });

    const dailyEvolution = Object.entries(dailyMap)
        .map(([date, value]) => {
            const parts = date.split('/');
            if (parts.length < 3) return null;
            const [d, m, y] = parts;
            return {
                date,
                sortDate: `${y}${m}${d}`,
                value
            };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => a.sortDate.localeCompare(b.sortDate))
        .map(({ date, value }) => ({ date: date.slice(0, 5), fullDate: date, value }));

    // 2. Budget by UF
    const ufMap: Record<string, { uf: string; previsto: number; realizado: number }> = {};
    reportItems.forEach(item => {
        const uf = item.uf || 'N/A';
        if (!ufMap[uf]) ufMap[uf] = { uf, previsto: 0, realizado: 0 };

        ufMap[uf].previsto += item.valorServico;
        const s = (item.status || '').toUpperCase().trim();
        if (s === 'CONCLUÍDO' || s === 'CONCLUIDO') {
            ufMap[uf].realizado += item.valorServico;
        }
    });

    const ufData = Object.values(ufMap).sort((a, b) => b.previsto - a.previsto);

    // 3. Performance by Team (Aggregation from Boxes and Execution)
    const teamMap: Record<string, number> = {};
    dbFiltered.forEach(os => {
        const val = (os.valorServico || 0);
        const s = (os.status || '').toUpperCase().trim();

        // Priority: Get teams from boxes marked DONE
        const boxTeams = new Set<string>();
        os.caixas.forEach(c => {
            if (c.status === 'OK' || c.status === 'Concluído') {
                const name = c.nomeEquipe?.trim();
                if (name && name !== '-') boxTeams.add(name);
            }
        });

        if (boxTeams.size > 0) {
            boxTeams.forEach(team => {
                teamMap[team] = (teamMap[team] || 0) + val;
            });
        } else if (s === 'DONE' || s === 'CONCLUÍDO' || s === 'CONCLUIDO') {
            const team = os.execution?.technicianName || 'Sem Equipe';
            teamMap[team] = (teamMap[team] || 0) + val;
        }
    });

    const teamData = Object.entries(teamMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // Summary
    const totalPrevisto = ufData.reduce((acc, curr) => acc + curr.previsto, 0);
    const totalRealizado = ufData.reduce((acc, curr) => acc + curr.realizado, 0);
    const totalCancelado = excelFiltered.reduce((acc, os) => {
        const s = (os.status || '').toUpperCase().trim();
        return s === 'CANCELADO' ? acc + (os.valorServico || 0) : acc;
    }, 0);

    return {
        month: targetMonth,
        summary: {
            totalPrevisto: Math.round(totalPrevisto),
            totalRealizado: Math.round(totalRealizado),
            totalCancelado: Math.round(totalCancelado),
            performance: totalPrevisto > 0 ? Math.round((totalRealizado / totalPrevisto) * 100) : 0
        },
        dailyEvolution,
        ufData: ufData.map(u => ({ ...u, previsto: Math.round(u.previsto), realizado: Math.round(u.realizado) })),
        teamData: teamData.map(t => ({ ...t, value: Math.round(t.value) }))
    };
}

export async function getBoxesReportData(month: string) {
    await requireAdmin();

    const targetMonth = (month || '').toUpperCase().trim();

    const [osRecords, excelOSList] = await Promise.all([
        prisma.orderOfService.findMany({
            include: {
                caixas: { select: { status: true, nomeEquipe: true } },
                execution: true
            }
        }),
        getAllOS()
    ]);

    const dbFiltered = osRecords.filter(r => (r.mes || '').toUpperCase().trim() === targetMonth);
    const excelFiltered = excelOSList.filter(os => (os.mes || '').toUpperCase().trim() === targetMonth);

    const dbMap = new Map(dbFiltered.map(r => [r.id, r]));

    // List of statuses that mean the OS is active (not canceled/rejected)
    const OPEN_EXCEL_STATUSES = ['INICIAR', 'EM EXECUÇÃO', 'EM EXECUCAO', 'PEND. CLIENTE'];

    const reportItems = excelFiltered.map(os => {
        const db = dbMap.get(os.id);
        const s = (os.status || '').toUpperCase().trim();
        const isFinished = s === 'CONCLUÍDO' || s === 'CONCLUIDO';
        const isOpen = OPEN_EXCEL_STATUSES.includes(s);
        const isCanceled = s === 'CANCELADO';

        // Agora incluímos CANCELADO nos totais para ter a ideia do bruto
        if (!isFinished && !isOpen && !isCanceled) return null;

        const boxesPlanned = os.caixasPlanejadas || 0;
        // Se a OS está concluída no Excel, consideramos 100% (paridade com auditoria financeira)
        const boxesDone = isFinished ? boxesPlanned : (db?.caixas.filter(c => c.status === 'OK' || c.status === 'Concluído').length || 0);

        return {
            ...os,
            caixasPlanejadas: boxesPlanned,
            caixasRealizadas: boxesDone,
            dataConclusao: os.dataConclusao || '-',
            equipe: db?.execution?.technicianName || '-'
        };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    // 1. Daily Evolution (Boxes Done)
    const dailyMap: Record<string, number> = {};
    dbFiltered.forEach(os => {
        const finishedBoxes = os.caixas.filter(c => (c.status === 'OK' || c.status === 'Concluído'));

        // Use os.updatedAt as proxy for execution date if not explicit?
        // Actually, we should probably look at when the box was marked. 
        // For simplicity and consistency with monthly report, we use OS completion date from Excel if available,
        // or just the OS updatedAt if it's currently DONE.
        const s = (os.status || '').toUpperCase().trim();
        const dateStr = (os.dataConclusao || '-');

        if (dateStr !== '-' && (s === 'CONCLUÍDO' || s === 'CONCLUIDO' || s === 'DONE')) {
            const day = dateStr;
            dailyMap[day] = (dailyMap[day] || 0) + finishedBoxes.length;
        }
    });

    const dailyEvolution = Object.entries(dailyMap)
        .map(([date, value]) => {
            const parts = date.split('/');
            if (parts.length < 3) return null;
            const [d, m, y] = parts;
            return {
                date,
                sortDate: `${y}${m}${d}`,
                value
            };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => a.sortDate.localeCompare(b.sortDate))
        .map(({ date, value }) => ({ date: date.slice(0, 5), fullDate: date, value }));

    // 2. Boxes by UF
    const ufMap: Record<string, { uf: string; previsto: number; realizado: number }> = {};
    reportItems.forEach(item => {
        const uf = item.uf || 'N/A';
        if (!ufMap[uf]) ufMap[uf] = { uf, previsto: 0, realizado: 0 };
        ufMap[uf].previsto += item.caixasPlanejadas;
        ufMap[uf].realizado += item.caixasRealizadas;
    });

    const ufData = Object.values(ufMap).sort((a, b) => b.previsto - a.previsto);

    // 3. Performance by Team
    const teamMap: Record<string, number> = {};
    dbFiltered.forEach(os => {
        os.caixas.forEach(c => {
            if (c.status === 'OK' || c.status === 'Concluído') {
                const name = c.nomeEquipe?.trim() || 'Sem Equipe';
                if (name !== '-') {
                    teamMap[name] = (teamMap[name] || 0) + 1;
                }
            }
        });
    });

    const teamData = Object.entries(teamMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // Summary
    const totalPlanejado = reportItems.reduce((acc, curr) => acc + curr.caixasPlanejadas, 0);
    const totalRealizado = reportItems.reduce((acc, curr) => acc + curr.caixasRealizadas, 0);

    return {
        month: targetMonth,
        summary: {
            totalPlanejado: Math.round(totalPlanejado),
            totalRealizado: Math.round(totalRealizado),
            performance: totalPlanejado > 0 ? Math.round((totalRealizado / totalPlanejado) * 100) : 0
        },
        dailyEvolution,
        ufData: ufData.map(u => ({ ...u, previsto: Math.round(u.previsto), realizado: Math.round(u.realizado) })),
        teamData: teamData.map(t => ({ ...t, value: Math.round(t.value) }))
    };
}
export async function getFacilitiesReportData(month: string) {
    await requireAdmin();

    const targetMonth = (month || '').toUpperCase().trim();

    const [osRecords, excelOSList] = await Promise.all([
        prisma.orderOfService.findMany({
            include: {
                caixas: { select: { status: true, nomeEquipe: true } },
                execution: true
            }
        }),
        getAllOS()
    ]);

    const dbFiltered = osRecords.filter(r => (r.mes || '').toUpperCase().trim() === targetMonth);
    const excelFiltered = excelOSList.filter(os => (os.mes || '').toUpperCase().trim() === targetMonth);

    const dbMap = new Map(dbFiltered.map(r => [r.id, r]));

    // List of statuses that mean the OS is active (not canceled/rejected)
    const OPEN_EXCEL_STATUSES = ['INICIAR', 'EM EXECUÇÃO', 'EM EXECUCAO', 'PEND. CLIENTE'];
    const FINISHED_EXCEL_STATUSES = ['CONCLUÍDO', 'CONCLUIDO', 'CONCLUÍDA', 'CANCELADO']; // CANCELADO is "Finished" in terms of process but we filter it out for performance

    const reportItems = excelFiltered.map(os => {
        const db = dbMap.get(os.id);
        const s = (os.status || '').toUpperCase().trim();
        const isFinished = s === 'CONCLUÍDO' || s === 'CONCLUIDO';
        const isOpen = OPEN_EXCEL_STATUSES.includes(s);
        const isCanceled = s === 'CANCELADO';

        // Agora incluímos CANCELADO nos totais para ter a ideia do bruto
        if (!isFinished && !isOpen && !isCanceled) return null;

        const facPlanned = os.facilidadesPlanejadas || 0;
        const boxesPlanned = os.caixasPlanejadas || 0;
        const boxesDone = db?.caixas.filter(c => c.status === 'OK' || c.status === 'Concluído').length || 0;

        let facDone = 0;
        if (isFinished) {
            // Se concluída, 100% das facilidades planejadas
            facDone = facPlanned;
        } else if (boxesPlanned > 0) {
            const ratio = facPlanned / boxesPlanned;
            facDone = boxesDone * ratio;
        }

        return {
            ...os,
            facilidadesPlanejadas: facPlanned,
            facilidadesRealizadas: facDone,
            dataConclusao: os.dataConclusao || '-',
            equipe: db?.execution?.technicianName || '-'
        };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    // 1. Daily Evolution (Facilities Done)
    const dailyMap: Record<string, number> = {};
    reportItems.forEach(item => {
        const s = (item.status || '').toUpperCase().trim();
        const isFinished = s === 'CONCLUÍDO' || s === 'CONCLUIDO';
        const dateStr = item.dataConclusao;

        if (isFinished && dateStr !== '-') {
            const day = dateStr;
            dailyMap[day] = (dailyMap[day] || 0) + item.facilidadesPlanejadas;
        }
    });

    const dailyEvolution = Object.entries(dailyMap)
        .map(([date, value]) => {
            const parts = date.split('/');
            if (parts.length < 3) return null;
            const [d, m, y] = parts;
            return {
                date,
                sortDate: `${y}${m}${d}`,
                value
            };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => a.sortDate.localeCompare(b.sortDate))
        .map(({ date, value }) => ({ date: date.slice(0, 5), fullDate: date, value }));

    // 2. Facilities by UF
    const ufMap: Record<string, { uf: string; previsto: number; realizado: number }> = {};
    reportItems.forEach(item => {
        const uf = item.uf || 'N/A';
        if (!ufMap[uf]) ufMap[uf] = { uf, previsto: 0, realizado: 0 };
        ufMap[uf].previsto += item.facilidadesPlanejadas;
        ufMap[uf].realizado += item.facilidadesRealizadas;
    });

    const ufData = Object.values(ufMap).sort((a, b) => b.previsto - a.previsto);

    // 3. Performance by Team
    const teamMap: Record<string, number> = {};
    reportItems.forEach(item => {
        if (item.facilidadesRealizadas > 0) {
            const name = item.equipe || 'Sem Equipe';
            teamMap[name] = (teamMap[name] || 0) + item.facilidadesRealizadas;
        }
    });

    const teamData = Object.entries(teamMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // Summary
    const totalPlanejado = Math.round(reportItems.reduce((acc, curr) => acc + curr.facilidadesPlanejadas, 0));
    const totalRealizado = Math.round(reportItems.reduce((acc, curr) => acc + curr.facilidadesRealizadas, 0));

    return {
        month: targetMonth,
        summary: {
            totalPlanejado,
            totalRealizado,
            performance: totalPlanejado > 0 ? Math.round((totalRealizado / totalPlanejado) * 100) : 0
        },
        dailyEvolution,
        ufData: ufData.map(u => ({ ...u, previsto: Math.round(u.previsto), realizado: Math.round(u.realizado) })),
        teamData: teamData.map(t => ({ ...t, value: Math.round(t.value) }))
    };
}
