import { getAllOS } from '@/lib/excel';
import OSListClient from './OSListClient';
import { HeaderServer } from '@/components/layout/HeaderServer';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { EnrichedOS } from '@/lib/types';
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

    const [lancaItems, equipes] = await Promise.all([
        prisma.lancaAlare.findMany({
            where: { osId: { not: null } },
            select: { osId: true, previsao: true, lancado: true, status: true, equipe: true }
        }),
        prisma.equipe.findMany({
            select: { id: true, name: true, fullName: true, nomeEquipe: true }
        })
    ]);

    const equipeMap = new Map(equipes.map(e => [e.id, e.fullName || e.nomeEquipe || e.name]));

    // Helper to extract numbers from "100m", "50.5", etc.
    const parseMeters = (val: string | null) => {
        if (!val) return 0;
        const matched = val.match(/[\d.]+/);
        return matched ? parseFloat(matched[0]) : 0;
    };

    const lancaDataMap = new Map<string, { total: number; done: number; teams: Set<string> }>();
    lancaItems.forEach(item => {
        const osId = item.osId!;
        const current = lancaDataMap.get(osId) || { total: 0, done: 0, teams: new Set<string>() };

        current.total += parseMeters(item.previsao);
        current.done += parseMeters(item.lancado);
        if (item.equipe) {
            const teamName = equipeMap.get(item.equipe);
            if (teamName) current.teams.add(teamName);
        }

        lancaDataMap.set(osId, current);
    });

    const dbMap = new Map(osRecords.map(r => [r.id, r]));
    const { enrichOS } = await import('@/lib/os-enrichment');

    // Enrich OS list with execution status and teams
    const enrichedList: EnrichedOS[] = osList.map(os => {
        const dbRecord = dbMap.get(os.id);
        const enriched = enrichOS(os, dbRecord as any);
        const lanca = lancaDataMap.get(os.id);
        if (lanca) {
            enriched.hasLanca = true;
            enriched.lancaMetersTotal = lanca.total;
            enriched.lancaMetersDone = lanca.done;
            if (lanca.teams.size > 0) {
                enriched.lancaTeams = Array.from(lanca.teams).sort().join(', ');
            }
        } else {
            enriched.hasLanca = false;
        }
        return enriched;
    });

    // Get Session & Preferences (centralized)
    const session = await getSession();
    let isTechnician = false;
    let isAdmin = false;
    let delegatedIds: string[] = [];
    let lastUf = 'Todos';
    let lastSearch = '';
    let lastStatus = 'Abertas';

    if (session) {
        // Fetch fresh role and preferences from DB
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
        let effectiveRole = (userRecord as any)?.role;
        if (effectiveRole === 'USER' && userRecord?.isAdmin) effectiveRole = 'ADMIN';

        if (!effectiveRole) {
            effectiveRole = session.role || (session.isAdmin ? 'ADMIN' : 'USER');
        }
        isTechnician = effectiveRole === 'USER';
        isAdmin = effectiveRole === 'ADMIN';

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
                isAdmin={isAdmin}
            />
        </>
    );
}
