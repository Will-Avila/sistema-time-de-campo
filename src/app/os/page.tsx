import { getAllOS } from '@/lib/excel';
import OSListClient from './OSListClient';
import { HeaderServer } from '@/components/layout/HeaderServer';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { EnrichedOS } from '@/lib/types';
import { getOSStatusInfo } from '@/lib/utils';
import { getDelegatedOSIds } from '@/actions/delegation';

export const dynamic = 'force-dynamic';

export default async function OSListPage() {
    const osList = await getAllOS();

    // Fetch all records from Prisma to enrich the Excel data
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

    // Enrich OS list with execution status and teams
    const enrichedList: EnrichedOS[] = osList.map(os => {
        const dbRecord = dbMap.get(os.id);
        return enrichOS(os, dbRecord as any);
    });



    // Get Session & Preferences (centralized)
    const session = await getSession();
    let isTechnician = false;
    let delegatedIds: string[] = [];
    let lastUf = 'Todos';
    let lastSearch = '';
    let lastStatus = 'Abertas';

    if (session) {
        // Fetch fresh role and preferences from DB
        // This ensures that if a user's role is updated, they don't need to relogin immediately
        const userRecord = await prisma.equipe.findUnique({
            where: { id: session.id },
            select: {
                role: true,
                isAdmin: true,
                lastUf: true,
                lastStatus: true,
                lastSearch: true
            }
        });

        // Determine effective role: DB > Session > Fallback
        // HANDLE MIGRATION: If role is 'USER' (default) but isAdmin is true, treat as ADMIN
        let effectiveRole = (userRecord as any)?.role;
        if (effectiveRole === 'USER' && userRecord?.isAdmin) effectiveRole = 'ADMIN';

        if (!effectiveRole) {
            effectiveRole = session.role || (session.isAdmin ? 'ADMIN' : 'USER');
        }
        isTechnician = effectiveRole === 'USER';

        if (isTechnician) {
            delegatedIds = await getDelegatedOSIds(session.id);
        }

        // Update user preferences vars
        if (userRecord) {
            lastUf = userRecord.lastUf || 'Todos';
            lastSearch = userRecord.lastSearch || '';
            lastStatus = userRecord.lastStatus || 'Abertas';
        }
    }

    // Filter list for technicians
    const finalOSList = isTechnician
        ? enrichedList.filter(os => delegatedIds.includes(os.id))
        : enrichedList;




    return (
        <>
            <HeaderServer />
            <OSListClient
                initialOSList={finalOSList}
                initialUf={lastUf}
                initialSearch={lastSearch}
                initialStatus={lastStatus}
                isTechnicianView={isTechnician}
            />
        </>
    );
}
