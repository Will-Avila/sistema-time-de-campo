import { prisma } from '@/lib/db';
import { getOSById } from '@/lib/excel';
import { notFound } from 'next/navigation';
import { HeaderServer } from '@/components/layout/HeaderServer';
import { ArrowLeft, ClipboardList, Box, Building } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import LancaItem from './LancaItem';
import { getOSStatusInfo } from '@/lib/utils';
import { OSActionMenu } from '../OSActionMenu';
import { getSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';

interface PageProps {
    params: { id: string };
}

export default async function LancaPage({ params }: PageProps) {
    const os = await getOSById(params.id);
    const session = await getSession();

    if (!os) return notFound();

    const [lancamentosRaw, equipes, execution] = await Promise.all([
        prisma.lancaAlare.findMany({
            where: { osId: os.id },
            orderBy: { de: 'asc' }
        }),
        prisma.equipe.findMany({
            select: { id: true, name: true, fullName: true, nomeEquipe: true }
        }),
        prisma.serviceExecution.findFirst({
            where: { osId: os.id }
        })
    ]);

    const equipeMap = new Map(equipes.map(e => [e.id, e.fullName || e.nomeEquipe || e.name]));

    const lancamentos = lancamentosRaw.map(l => ({
        ...l,
        responsavel: l.equipe ? equipeMap.get(l.equipe) : null
    }));

    const headerAndMenu = (
        <div className="space-y-4 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-6">
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

                        <h1 className="text-2xl md:text-3xl font-bold text-foreground uppercase tracking-tight">Lançamentos: {os.pop}</h1>
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
                        hasLanca={lancamentosRaw.length > 0}
                        showClosure={showClosure}
                        session={session}
                        activeTab="lanca"
                    />
                );
            })()}
        </div>
    );

    if (lancamentos.length === 0) {
        return (
            <div className="min-h-screen bg-muted/30 pb-20">
                <HeaderServer />
                <div className="container max-w-4xl space-y-4">
                    {headerAndMenu}
                    <div className="text-center py-12 bg-white dark:bg-card border border-border shadow-sm rounded-xl mt-4">
                        <p className="text-muted-foreground">Nenhum lançamento encontrado para esta OS.</p>
                    </div>
                </div>
            </div>
        );
    }

    const totalLanca = lancamentos.length;
    const doneLanca = lancamentos.filter(l => l.status === 'OK').length;
    const pendingLanca = totalLanca - doneLanca;
    const donePct = totalLanca > 0 ? (doneLanca / totalLanca) * 100 : 0;
    const pendingPct = totalLanca > 0 ? (pendingLanca / totalLanca) * 100 : 0;

    const lancaMetersTotal = lancamentos.reduce((acc, l) => acc + (Number(l.previsao) || 0), 0);
    const lancaMetersDone = lancamentos.reduce((acc, l) => acc + (l.status === 'OK' ? (Number(l.lancado) || Number(l.previsao) || 0) : 0), 0);

    return (
        <div className="min-h-screen bg-muted/30 pb-20">
            <HeaderServer />

            <div className="container max-w-4xl space-y-6">
                {headerAndMenu}

                {/* Progress Section */}
                <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Box className="h-5 w-5 text-[#4da8bc]" />
                            <h2 className="font-bold text-foreground">Progresso de Lançamento</h2>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Rotas</span>
                                <span className="text-sm font-bold text-foreground">
                                    {doneLanca} / {totalLanca}
                                </span>
                            </div>
                            <div className="w-px h-8 bg-border"></div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Metragem</span>
                                <span className="text-sm font-bold text-sky-600 dark:text-sky-400">
                                    {lancaMetersDone} / {lancaMetersTotal}<span className="text-[10px] ml-0.5">m</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                        <div
                            className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                            style={{ width: `${donePct}%` }}
                            title={`Concluídas: ${doneLanca}`}
                        />
                        <div
                            className="h-full bg-muted transition-all duration-500 ease-out"
                            style={{ width: `${pendingPct}%` }}
                            title={`A fazer: ${pendingLanca}`}
                        />
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 mt-4 text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            <span className="text-muted-foreground">{doneLanca} Concluídas</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-full bg-muted" />
                            <span className="text-muted-foreground">{pendingLanca} A fazer</span>
                        </div>
                    </div>
                </div>

                {/* List Container */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lancamentos.map((lanca) => (
                        <LancaItem
                            key={lanca.id}
                            item={lanca}
                            osId={os.id}
                            session={session}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
