'use server';

import { prisma } from '@/lib/db';
import { getAllOS } from '@/lib/excel';
import { syncExcelToDB } from '@/lib/sync';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';

export async function refreshData() {
    await requireAdmin();
    const result = await syncExcelToDB();
    revalidatePath('/admin/dashboard');
    revalidatePath('/os');
    return result;
}

export async function getDashboardData() {
    // 1. Get Base OS Data from Database (all with their boxes)
    const osRecords = await prisma.orderOfService.findMany({
        include: {
            caixas: { select: { status: true } },
            execution: {
                include: {
                    equipe: { select: { name: true, fullName: true, nomeEquipe: true } }
                }
            }
        },
        orderBy: { updatedAt: 'desc' }
    });

    // 2. Get Equipes (Users/Teams)
    const equipes = await prisma.equipe.findMany({
        where: { isAdmin: false },
        select: { id: true, name: true, fullName: true, nomeEquipe: true, phone: true },
    });

    // 3. Get Recent Notifications
    const recentNotifications = await prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { equipe: { select: { name: true, fullName: true, nomeEquipe: true } } }
    });

    // 4. Merge Data for the List
    const osList = osRecords.map(os => {
        const execution = os.execution;

        let status = 'PENDING';
        let equipeName = '-';
        let lastUpdate: Date | null = os.updatedAt;

        const checklistTotal = os.caixas.length;
        const checklistDone = os.caixas.filter(c => c.status === 'OK' || c.status === 'Concluído').length;

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
            checklistTotal,
            checklistDone,
        };
    });

    // 5. Calculate Stats
    const finishedStatuses = ['concluída', 'concluido', 'encerrada', 'cancelado'];

    // OS Ativas -> Exact number (not finished)
    const total = osList.filter(os => !finishedStatuses.includes(os.status.toLowerCase())).length;

    const todayDate = new Date().toLocaleDateString('pt-BR'); // DD/MM/YYYY

    const completedToday = osList.filter(os => os.dataConclusao === todayDate).length;

    // Completed This Month -> Using 'mes' field
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const currentMonthName = months[new Date().getMonth()];

    const completedMonth = osList.filter(os =>
        os.mes === currentMonthName &&
        finishedStatuses.includes(os.status.toLowerCase())
    ).length;

    const completedTotal = osList.filter(os => finishedStatuses.includes(os.status.toLowerCase())).length;

    const pending = osList.filter(item =>
        !finishedStatuses.includes(item.status.toLowerCase()) &&
        item.status === 'PENDING'
    ).length;

    const inProgress = osList.filter(item =>
        !finishedStatuses.includes(item.status.toLowerCase()) &&
        (item.status === 'IN_PROGRESS' || (item.checklistDone > 0 && item.status !== 'DONE'))
    ).length;

    const completionRate = (total + completedTotal) > 0
        ? Math.round((completedTotal / (total + completedTotal)) * 100)
        : 0;

    // 6. UF Breakdown
    const ufMap = new Map<string, { total: number; done: number }>();
    osList.forEach(os => {
        const uf = os.uf || 'N/A';
        if (!ufMap.has(uf)) ufMap.set(uf, { total: 0, done: 0 });
        const entry = ufMap.get(uf)!;
        entry.total++;
        if (os.status === 'DONE' || finishedStatuses.includes(os.status.toLowerCase())) entry.done++;
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
            total,
            completedToday,
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
