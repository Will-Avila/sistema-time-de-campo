import { getAllOS } from '@/lib/excel';
import OSListClient from '@/app/os/OSListClient';
import { HeaderServer } from '@/components/layout/HeaderServer';
import { prisma } from '@/lib/db';
import { getOSStatusInfo } from '@/lib/utils';
import { EnrichedOS } from '@/lib/types';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ExecutingOSPage() {
    await requireAdmin();

    const osList = await getAllOS();

    // 1. Get Base OS Data from Prisma
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

    // 2. Enriquecer com dados do App
    const enrichedList: EnrichedOS[] = osList.map(os => {
        const dbRecord = dbMap.get(os.id);
        return enrichOS(os, dbRecord as any);
    });

    // 3. Filter for "Em Execução" (Sync with dashboard.ts logic)
    const executingList: EnrichedOS[] = enrichedList.filter(os => {
        const rawStatus = (os.status || '').toUpperCase().trim();
        return rawStatus === 'EM EXECUÇÃO' || rawStatus === 'EM EXECUCAO';
    });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <HeaderServer />
            <div className="container pt-24 pb-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ordens em Execução</h1>
                    <p className="text-sm text-muted-foreground">Exibindo todas as ordens de serviço com status &quot;Em Execução&quot; no Excel</p>
                </div>

                <OSListClient
                    initialOSList={executingList}
                    initialUf="Todos"
                    initialSearch=""
                    initialStatus="Todas"
                    isTodayPage={true}
                />
            </div>
        </div>
    );
}
