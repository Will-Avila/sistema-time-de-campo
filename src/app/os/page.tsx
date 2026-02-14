import { getAllOS } from '@/lib/excel';
import OSListClient from './OSListClient';
import { HeaderServer } from '@/components/layout/HeaderServer';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { EnrichedOS } from '@/lib/types';
import { getOSStatusInfo } from '@/lib/utils';

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
    let lastUf = 'Todos';
    let lastSearch = '';
    let lastStatus = 'Abertas';

    if (session) {
        const tech = await prisma.equipe.findUnique({
            where: { id: session.id },
            select: { lastUf: true, lastStatus: true, lastSearch: true }
        });
        if (tech) {
            lastUf = tech.lastUf || 'Todos';
            lastSearch = tech.lastSearch || '';
            lastStatus = tech.lastStatus || 'Abertas';
        }
    }

    return (
        <>
            <HeaderServer />
            <OSListClient
                initialOSList={enrichedList}
                initialUf={lastUf}
                initialSearch={lastSearch}
                initialStatus={lastStatus}
            />
        </>
    );
}
