'use server';

import { prisma } from '@/lib/db';
import { getAllOS } from '@/lib/excel';

export async function getDashboardData() {
    // 1. Get Base OS Data from Excel (Filtered by 'Iniciar'/'Em Execução')
    const excelOS = await getAllOS();

    // 2. Get Execution Data from DB
    const executions = await prisma.serviceExecution.findMany({
        include: {
            technician: { select: { name: true, fullName: true } },
            checklist: { select: { done: true } }
        },
        orderBy: { updatedAt: 'desc' }
    });

    // 3. Get Technicians
    const technicians = await prisma.technician.findMany({
        where: { isAdmin: false },
        select: { id: true, name: true, fullName: true, phone: true }, // Added phone
    });

    // 4. Get Recent Notifications
    const recentNotifications = await prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { technician: { select: { name: true, fullName: true } } }
    });

    // Create a map for fast lookup: OS ID -> Execution
    const executionMap = new Map<string, typeof executions[0]>();
    executions.forEach(exec => {
        executionMap.set(exec.osId, exec);
    });

    // 5. Merge Data for the List
    const osList = excelOS.map(os => {
        const execution = executionMap.get(os.id) || executionMap.get(os.pop);

        let status = 'PENDING';
        let technicianName = '-';
        let lastUpdate: Date | null = null;
        let checklistTotal = 0;
        let checklistDone = 0;

        if (execution) {
            status = execution.status;
            technicianName = execution.technician?.fullName || execution.technician?.name || '-';
            lastUpdate = execution.updatedAt;
            checklistTotal = execution.checklist.length;
            checklistDone = execution.checklist.filter(c => c.done).length;
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
            totalCaixas: os.totalCaixas,
            status,
            technicianName,
            lastUpdate: lastUpdate ? lastUpdate.toISOString() : null,
            checklistTotal,
            checklistDone,
        };
    });

    // 6. Calculate Stats
    const total = osList.length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedToday = executions.filter(e =>
        e.status === 'DONE' && new Date(e.updatedAt) >= today
    ).length;

    const completedTotal = executions.filter(e => e.status === 'DONE').length;

    const pending = osList.filter(item => item.status === 'PENDING').length;
    const inProgress = osList.filter(item =>
        item.status === 'IN_PROGRESS' || (item.checklistDone > 0 && item.status !== 'DONE')
    ).length;

    const completionRate = total > 0 ? Math.round((completedTotal / (total + completedTotal)) * 100) : 0;

    // 7. UF Breakdown
    const ufMap = new Map<string, { total: number; done: number }>();
    osList.forEach(os => {
        const uf = os.uf || 'N/A';
        if (!ufMap.has(uf)) ufMap.set(uf, { total: 0, done: 0 });
        const entry = ufMap.get(uf)!;
        entry.total++;
        if (os.status === 'DONE') entry.done++;
    });
    const ufBreakdown = Array.from(ufMap.entries())
        .map(([uf, data]) => ({ uf, ...data }))
        .sort((a, b) => b.total - a.total);

    // 8. Technician Performance
    const techMap = new Map<string, { name: string; phone: string | null; completed: number; pending: number; checklistItems: number }>();
    technicians.forEach(t => {
        techMap.set(t.id, { name: t.fullName || t.name, phone: t.phone, completed: 0, pending: 0, checklistItems: 0 });
    });
    executions.forEach(exec => {
        const entry = techMap.get(exec.technicianId);
        if (entry) {
            if (exec.status === 'DONE') entry.completed++;
            else entry.pending++;
            entry.checklistItems += exec.checklist.filter(c => c.done).length;
        }
    });
    const techPerformance = Array.from(techMap.values())
        .filter(t => t.completed > 0 || t.pending > 0)
        .sort((a, b) => b.completed - a.completed);

    // 9. Activity Feed from Notifications
    const activityFeed = recentNotifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        createdAt: n.createdAt.toISOString(),
        techName: n.technician?.fullName || n.technician?.name || null,
        read: n.read,
    }));

    return {
        stats: {
            total,
            completedToday,
            completedTotal,
            pending,
            inProgress,
            completionRate,
            technicianCount: technicians.length,
        },
        ufBreakdown,
        techPerformance,
        activityFeed,
        osList
    };
}
