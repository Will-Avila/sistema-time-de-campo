import { getAllOS } from '@/lib/excel';
import OSListClient from './OSListClient';
import { HeaderServer } from '@/components/layout/HeaderServer';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'default-secret-change-me-in-prod'
);

export default async function OSListPage() {
    const osList = await getAllOS();

    // Fetch all executions to enrich OS cards with status
    const executions = await prisma.serviceExecution.findMany({
        select: { osId: true, status: true, obs: true, updatedAt: true, technician: { select: { name: true } } }
    });

    const executionMap = new Map<string, { status: string; obs: string | null; technicianName: string; updatedAt: Date }>();
    for (const exec of executions) {
        executionMap.set(exec.osId, {
            status: exec.status,
            obs: exec.obs,
            technicianName: exec.technician.name,
            updatedAt: exec.updatedAt
        });
    }

    // Enrich OS list with execution status
    const enrichedList = osList.map(os => {
        const exec = executionMap.get(os.id);
        let executionStatus = 'Pendente';
        let technicianName: string | undefined;
        let closedAt: string | undefined;

        if (exec) {
            technicianName = exec.technicianName;
            if (exec.status === 'DONE') {
                const match = exec.obs?.match(/^Status: (.+)/m);
                executionStatus = match ? match[1] : 'Concluída';
                closedAt = exec.updatedAt.toLocaleDateString('pt-BR');
            } else if (exec.status === 'PENDING') {
                executionStatus = 'Em Execução';
            }
        }

        return { ...os, executionStatus, technicianName, closedAt };
    });

    // Get Session & Preferences
    const session = cookies().get('session')?.value;
    let lastUf = 'Todos';

    if (session) {
        try {
            const { payload } = await jwtVerify(session, JWT_SECRET);
            if (payload.sub) {
                const tech = await prisma.technician.findUnique({
                    where: { id: payload.sub as string },
                    select: { lastUf: true }
                });
                if (tech) {
                    lastUf = tech.lastUf || 'Todos';
                }
            }
        } catch (e) {
            // Invalid session
        }
    }

    return (
        <>
            <HeaderServer />
            <OSListClient
                initialOSList={enrichedList}
                initialUf={lastUf}
            />
        </>
    );
}
