import { getOSById, CaixaItem as CaixaItemType } from '@/lib/excel';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import CaixaItem from '../CaixaItem';
import { ArrowLeft } from 'lucide-react';
import { HeaderServer } from '@/components/layout/HeaderServer';
import OSExecutionClient from './OSExecutionClient';

import { getSession } from '@/lib/auth';

interface PageProps {
    params: { id: string };
}

export default async function OSExecutionPage({ params }: PageProps) {
    const os = await getOSById(params.id);
    const session = await getSession();

    if (!os) return notFound();

    // Fetch execution details
    const execution = await prisma.serviceExecution.findFirst({
        where: { osId: os.id },
        include: {
            equipe: true,
            photos: true
        }
    });

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-950 pb-10 transition-colors">
            {/* Global Header */}
            <HeaderServer />

            <div className="container">
                {/* Sub-header: back + OS number + closure button */}
                <div className="pt-20 pb-2 flex items-center gap-3">
                    <Link href={`/os/${os.id}`} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <ArrowLeft className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Execução OS {os.protocolo}</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">{os.pop}</p>
                    </div>
                </div>

                <OSExecutionClient
                    osId={os.id}
                    protocolo={os.protocolo}
                    items={os.items}
                    equipeName={execution?.equipe?.fullName || execution?.equipe?.nomeEquipe || execution?.equipe?.name}
                    session={session}
                    osStatus={os.status}
                    execution={execution}
                />
            </div>
        </div>
    );
}
