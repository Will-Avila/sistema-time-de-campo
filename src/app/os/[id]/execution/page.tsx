import { getOSById, CaixaItem as CaixaItemType } from '@/lib/excel';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import CaixaItem from '../CaixaItem';
import { ArrowLeft } from 'lucide-react';
import { HeaderServer } from '@/components/layout/HeaderServer';

interface PageProps {
    params: { id: string };
}

export default async function OSExecutionPage({ params }: PageProps) {
    const os = await getOSById(params.id);

    if (!os) return notFound();

    // Fetch execution details
    const execution = await prisma.serviceExecution.findFirst({
        where: { osId: os.id },
        include: {
            technician: true,
            photos: true,
            checklist: {
                include: { photos: true }
            }
        }
    });

    // Create a map for easy checklist lookup by itemId
    const checklistMap = new Map();
    if (execution?.checklist) {
        execution.checklist.forEach(item => {
            checklistMap.set(item.itemId, item);
        });
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-950 pb-20 transition-colors">
            {/* Global Header */}
            <HeaderServer />

            {/* Sub-header: back + OS number + closure button */}
            <div className="pt-20 px-4 pb-2 flex items-center gap-3">
                <Link href={`/os/${os.id}`} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <ArrowLeft className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Execução OS {os.protocolo}</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{os.items.length} caixas no total</p>
                </div>

            </div>

            {/* Caixa List */}
            <div className="px-4 pb-6 space-y-4">
                {os.items.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                        Nenhuma caixa encontrada para esta OS.
                    </div>
                ) : (
                    os.items.map((item: CaixaItemType, idx: number) => {
                        // Use ID from item or fallback to CTO/Index combination to be unique
                        const itemId = item.id || item.cto;
                        const checklistItem = checklistMap.get(itemId);

                        return (
                            <CaixaItem
                                key={idx}
                                item={{ ...item, id: itemId }}
                                osId={os.id}
                                initialChecklist={checklistItem}
                                technicianName={execution?.technician?.name}
                            />
                        );
                    })
                )}
            </div>



        </div>
    );
}
