import { getOSById, CaixaItem as CaixaItemType } from '@/lib/excel';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import CaixaItem from '../CaixaItem';
import { ArrowLeft, Building } from 'lucide-react';
import { HeaderServer } from '@/components/layout/HeaderServer';
import OSExecutionClient from './OSExecutionClient';
import { OSActionMenu } from '../OSActionMenu';
import { getOSStatusInfo } from '@/lib/utils';
import { getSession } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';

interface PageProps {
    params: { id: string };
}

export default async function OSExecutionPage({ params }: PageProps) {
    const os = await getOSById(params.id);
    const session = await getSession();

    if (!os) return notFound();

    // Fetch execution details
    const [execution, lancaCount] = await Promise.all([
        prisma.serviceExecution.findFirst({
            where: { osId: os.id },
            include: {
                equipe: true,
                photos: true
            }
        }),
        prisma.lancaAlare.count({
            where: { osId: os.id }
        })
    ]);

    const hasLanca = lancaCount > 0;

    return (
        <div className="min-h-screen bg-background pb-10 transition-colors">
            {/* Global Header */}
            <HeaderServer />

            <div className="container">
                {/* Sub-header */}
                <div className="flex flex-col gap-4 mb-6 pt-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <Link href={`/os/${os.id}`} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
                                <ArrowLeft className="h-6 w-6" />
                            </Link>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary" className="font-mono text-xs font-bold text-[#4da8bc] bg-[#4da8bc]/10 border-[#4da8bc]/20 shadow-sm">
                                        {os.protocolo}
                                    </Badge>
                                    {os.uf && (
                                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold bg-muted text-muted-foreground">
                                            {os.uf}
                                        </Badge>
                                    )}
                                </div>

                                {/* Condo Name above POP */}
                                {os.condominio && (
                                    <div className="flex items-center gap-2 mb-0.5 mt-1">
                                        <Building className="h-4 w-4 text-[#4da8bc]" />
                                        <span className="text-sm font-bold text-foreground/80 uppercase tracking-wide">
                                            {os.condominio}
                                        </span>
                                    </div>
                                )}

                                <h1 className="text-2xl md:text-3xl font-bold text-foreground uppercase tracking-tight">Caixas: {os.pop}</h1>
                            </div>
                        </div>
                    </div>
                </div>

                {(() => {
                    const statusInfo = getOSStatusInfo({ osStatus: os.status, execution });
                    const showClosure = (!execution || execution.status !== 'DONE') &&
                        !statusInfo.label.includes('Concluída') &&
                        !statusInfo.label.includes('Encerrada') &&
                        !statusInfo.label.includes('Cancelada');

                    return (
                        <OSActionMenu
                            osId={os.id}
                            hasLanca={hasLanca}
                            showClosure={showClosure}
                            session={session}
                            activeTab="caixas"
                        />
                    );
                })()}

                <div className="mt-8">
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
        </div>
    );
}
