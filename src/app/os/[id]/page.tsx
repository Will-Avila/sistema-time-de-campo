import { getOSById } from '@/lib/excel';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, Wrench, FileText, CheckCircle, Clock, AlertTriangle, User, Building, Paperclip, Download, ClipboardList, ShoppingBasket, Plus, DollarSign } from 'lucide-react';
import { getOSStatusInfo, formatDateSP, formatDateTimeSP, getDeadlineInfo, cn } from '@/lib/utils';
import Image from 'next/image';
import OSClosureForm from './OSClosureForm';
import { OSPhotosGallery } from './OSPhotosGallery';
import { HeaderServer } from '@/components/layout/HeaderServer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getSession } from '@/lib/auth';
import { StatusBadge } from '@/components/os/StatusBadge';
import { OSClosureDate } from '@/components/os/OSClosureDate';
import DelegationPanel from './DelegationPanel';
import MaterialManager from './MaterialManager';
import { getOSMaterials } from '@/actions/material';

interface PageProps {
    params: { id: string };
}

export default async function OSDetailPage({ params }: PageProps) {
    const os = await getOSById(params.id);
    const session = await getSession();

    let canDelegate = false;
    let isAdmin = false;

    if (session) {
        const userRecord = await prisma.equipe.findUnique({
            where: { id: session.id },
            select: { role: true, isAdmin: true }
        });

        // Determine effective role: DB > Session > Fallback
        let effectiveRole = (userRecord as any)?.role || session.role || (session.isAdmin ? 'ADMIN' : 'USER');

        // Handle legacy admins just in case
        if (effectiveRole === 'USER' && userRecord?.isAdmin) effectiveRole = 'ADMIN';

        canDelegate = effectiveRole === 'ADMIN' || effectiveRole === 'SUPERVISOR';
        isAdmin = effectiveRole === 'ADMIN';
    }

    if (!os) return notFound();

    const execution = await prisma.serviceExecution.findFirst({
        where: { osId: os.id },
        include: { equipe: true, photos: true }
    });

    const caixas = await prisma.caixaAlare.findMany({
        where: { osId: os.id },
        select: { status: true, nomeEquipe: true }
    });

    const teamSet = new Set<string>();
    caixas.forEach(c => {
        if (c.status === 'OK' || c.status === 'Concluído') {
            const name = c.nomeEquipe?.trim();
            if (name && name !== '-') {
                teamSet.add(name);
            }
        }
    });

    const aggregatedTeams = Array.from(teamSet).sort().join(', ');

    const statusInfo = getOSStatusInfo({
        osStatus: os.status,
        execution
    });

    const materials = await getOSMaterials(os.id);

    const [lancaItems, equipes] = await Promise.all([
        prisma.lancaAlare.findMany({
            where: { osId: os.id },
            select: { previsao: true, lancado: true, status: true, equipe: true }
        }),
        prisma.equipe.findMany({
            select: { id: true, name: true, fullName: true, nomeEquipe: true }
        })
    ]);

    const equipeMap = new Map(equipes.map(e => [e.id, e.fullName || e.nomeEquipe || e.name]));

    const parseMeters = (val: string | null) => {
        if (!val) return 0;
        const matched = val.match(/[\d.]+/);
        return matched ? parseFloat(matched[0]) : 0;
    };

    let lancaMetersTotal = 0;
    let lancaMetersDone = 0;
    const hasLanca = lancaItems.length > 0;
    const lancaTeamSet = new Set<string>();

    lancaItems.forEach(item => {
        lancaMetersTotal += parseMeters(item.previsao);
        lancaMetersDone += parseMeters(item.lancado);
        if (item.status === 'OK' && item.equipe) {
            const teamName = equipeMap.get(item.equipe);
            if (teamName) lancaTeamSet.add(teamName);
        }
    });

    const lancaTeams = Array.from(lancaTeamSet).sort().join(', ');

    return (
        <div className="min-h-screen bg-muted/30 pb-20 transition-colors">
            <HeaderServer />

            <div className="container pt-6 max-w-4xl space-y-6">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Link href={isAdmin ? "/admin/dashboard" : "/os"} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
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

                            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{os.pop}</h1>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <StatusBadge osStatus={os.status} execution={execution} />
                                <Badge variant="outline" className="text-muted-foreground bg-background/50 border-dashed">
                                    {os.items.length} caixas
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 w-full md:w-auto">
                        <div className="grid grid-cols-2 gap-3 w-full min-w-[280px]">
                            <Link href={`/os/${os.id}/execution`} className="w-full">
                                <Button size="lg" className="w-full gap-2 shadow-sm h-11">
                                    <Wrench className="h-4 w-4" />
                                    Caixas
                                </Button>
                            </Link>

                            {hasLanca && (
                                <Link href={`/os/${os.id}/lanca`} className="w-full">
                                    <Button size="lg" className="w-full gap-2 bg-[#334155] hover:bg-[#1e293b] text-white h-11 shadow-md border-none font-bold transition-all active:scale-[0.98]">
                                        <ClipboardList className="h-4 w-4" />
                                        Lançamento
                                    </Button>
                                </Link>
                            )}

                            {(() => {
                                const showClosure = (!execution || execution.status !== 'DONE') &&
                                    !statusInfo.label.includes('Concluída') &&
                                    !statusInfo.label.includes('Encerrada') &&
                                    !statusInfo.label.includes('Cancelada');

                                // Count active buttons to detect odd numbers
                                // 1 (Caixas) + (1 if hasLanca) + 1 (Materials) + (1 if showClosure)
                                const activeButtonsCount = 1 + (hasLanca ? 1 : 0) + 1 + (showClosure ? 1 : 0);
                                const isOdd = activeButtonsCount % 2 !== 0;

                                return (
                                    <>
                                        <MaterialManager
                                            osId={os.id}
                                            session={session}
                                            triggerClassName={isOdd && !showClosure ? "col-span-2" : ""}
                                        />

                                        {showClosure && (
                                            <OSClosureForm
                                                osId={os.id}
                                                triggerClassName={cn(
                                                    "w-full h-11 px-4 gap-2 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center justify-center rounded-md text-[13px] font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                                                    isOdd ? "col-span-2" : ""
                                                )}
                                                triggerSize="lg"
                                            />
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Delegation Panel */}
                <DelegationPanel osId={os.id} canDelegate={canDelegate} />

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Main Info Card */}
                    <Card className="shadow-sm border-border bg-card">
                        <CardHeader className="pb-3 min-h-[56px] border-b border-border/50 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground leading-none">
                                <FileText className="h-4 w-4 text-[#4da8bc]" />
                                Informações Principais
                            </CardTitle>
                            {isAdmin && (
                                <Link href={`/os/${os.id}/admin`} className="flex items-center">
                                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-bold text-[#4da8bc] bg-[#4da8bc]/5 border-[#4da8bc]/20 hover:bg-[#4da8bc]/10 hover:border-[#4da8bc]/40 shadow-sm transition-all leading-none">
                                        <Plus className="h-3.5 w-3.5" />
                                        Add Detalhes
                                    </Button>
                                </Link>
                            )}
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider text-[10px]">POP</span>
                                    <p className="text-sm font-medium text-foreground mt-0.5">{os.pop}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider text-[10px]">Protocolo</span>
                                    <p className="text-sm font-medium text-foreground mt-0.5 font-mono">{os.protocolo}</p>
                                </div>
                            </div>

                            <div>
                                <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider text-[10px]">Cenário</span>
                                <div className="flex items-start gap-2 mt-1">
                                    <Wrench className="h-4 w-4 text-[#4da8bc] mt-0.5 shrink-0" />
                                    <p className="text-sm text-foreground/80">{os.tipoOs || 'Não especificado'}</p>
                                </div>
                            </div>

                            {os.condominio && (
                                <div>
                                    <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider text-[10px]">Condomínio</span>
                                    <div className="flex items-start gap-2 mt-1">
                                        <Building className="h-4 w-4 text-[#4da8bc] mt-0.5 shrink-0" />
                                        <p className="text-sm font-medium text-foreground/80">{os.condominio}</p>
                                    </div>
                                </div>
                            )}

                            {isAdmin && os.valorServico && os.valorServico > 0 && (
                                <div className="pt-2 border-t border-border/50 mt-2">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
                                            <DollarSign className="h-5 w-5 text-emerald-600" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
                                                {(os.status?.toUpperCase().includes('CONCLUÍD') || os.status?.toUpperCase().includes('CONCLUID')) ? 'Valor Finalizado' : 'Valor Orçado'}
                                            </span>
                                            <span className="text-lg font-black text-foreground">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(os.valorServico)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {hasLanca && (
                                <div className="pt-3 border-t border-border/50 mt-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-sky-500/10 p-1.5 rounded-md">
                                                <ClipboardList className="h-4 w-4 text-sky-600" />
                                            </div>
                                            <span className="text-xs font-bold text-foreground/80 uppercase tracking-wider">Lançamento de Cabos</span>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] font-bold bg-sky-500/5 text-sky-600 border-sky-500/20">
                                            {((lancaMetersDone / (lancaMetersTotal || 1)) * 100).toFixed(0)}%
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] uppercase font-bold text-muted-foreground leading-none mb-1">Metragem Lançada</span>
                                            <span className="text-xl font-black text-sky-600">
                                                {lancaMetersDone}<span className="text-xs ml-0.5 font-bold">m</span>
                                            </span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[9px] uppercase font-bold text-muted-foreground leading-none mb-1">Previsão Total</span>
                                            <span className="text-sm font-bold text-foreground/60">
                                                {lancaMetersTotal}m
                                            </span>
                                        </div>
                                    </div>
                                    {/* Small progress bar */}
                                    <div className="w-full bg-muted h-1 rounded-full mt-2 overflow-hidden">
                                        <div
                                            className="bg-sky-500 h-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, (lancaMetersDone / (lancaMetersTotal || 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {(aggregatedTeams || execution?.equipe || lancaTeams) && (
                                <div className="pt-2 border-t border-border/50 mt-2">
                                    <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider text-[10px]">Equipe(s) em Campo</span>
                                    <div className="flex flex-col gap-1.5 mt-2">
                                        {(aggregatedTeams || (execution?.equipe)) && (
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-[#4da8bc] shrink-0" />
                                                <span className="text-xs font-medium text-foreground/80 leading-tight">
                                                    Caixas: {aggregatedTeams || (execution?.equipe ? (execution.equipe.fullName || execution.equipe.nomeEquipe || execution.equipe.name) : '-')}
                                                </span>
                                            </div>
                                        )}
                                        {lancaTeams && (
                                            <div className="flex items-center gap-2">
                                                <Wrench className="h-4 w-4 text-sky-600 shrink-0" />
                                                <span className="text-xs font-medium text-foreground/80 leading-tight">
                                                    Lançamento: {lancaTeams}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Dates Card + Extra Info */}
                    {/* Dates Card */}
                    <Card className="shadow-sm border-border bg-card">
                        <CardHeader className="pb-3 border-b border-border/50">
                            <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                                <Calendar className="h-4 w-4 text-[#4da8bc]" />
                                Prazos e Datas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-5">
                            <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                                <div>
                                    <span className="block text-foreground/70 mb-1 text-[10px] uppercase font-bold tracking-wider">Entrada</span>
                                    <div className="flex items-center gap-1.5 font-medium text-foreground/80">
                                        <Calendar className="h-3.5 w-3.5 text-[#4da8bc]" />
                                        {os.dataEntrante}
                                    </div>
                                </div>

                                {statusInfo.label.includes('Concluída') || statusInfo.label.includes('Encerrada') || statusInfo.label.includes('Cancelada') || statusInfo.label.includes('Análise') ? (
                                    <div>
                                        <span className="block text-foreground/70 mb-1 text-[10px] uppercase font-bold tracking-wider">Conclusão</span>
                                        <OSClosureDate
                                            dataConclusaoExcel={os.dataConclusao}
                                            executionUpdatedAt={execution?.updatedAt}
                                            className="flex items-center gap-1.5 font-medium text-foreground/80"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <span className="block text-foreground/70 mb-1 text-[10px] uppercase font-bold tracking-wider">Prazo</span>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5 font-medium text-foreground/80">
                                                <Calendar className="h-3.5 w-3.5 text-[#4da8bc]" />
                                                {os.dataPrevExec || '-'}
                                            </div>
                                            {getDeadlineInfo(os.dataPrevExec) && (
                                                <Badge variant="outline" className={cn("text-[10px] font-bold uppercase py-0.5", getDeadlineInfo(os.dataPrevExec)?.color)}>
                                                    {getDeadlineInfo(os.dataPrevExec)?.label}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <span className="block text-foreground/70 mb-1 text-[10px] uppercase font-bold tracking-wider">Total Caixas</span>
                                    <div className="flex items-center gap-1.5 font-medium text-foreground/80">
                                        <Wrench className="h-3.5 w-3.5 text-[#4da8bc]" />
                                        {os.items.length} CXs
                                    </div>
                                </div>

                                <div>
                                    <span className="block text-foreground/70 mb-1 text-[10px] uppercase font-bold tracking-wider">UF</span>
                                    <div className="flex items-center gap-1.5 font-medium text-foreground/80">
                                        <MapPin className="h-3.5 w-3.5 text-[#4da8bc]" />
                                        {os.uf || '-'}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Extra Info: Description & Attachments */}
                    {(os.descricao || (os.anexos && os.anexos.length > 0)) && (
                        <Card className="shadow-sm border-l-4 border-l-[#4da8bc] md:col-span-2 border-y border-r border-border bg-card">
                            <CardHeader className="pb-3 border-b border-border/50">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                                    <FileText className="h-4 w-4 text-[#4da8bc]" />
                                    Informações Adicionais
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                {os.descricao && (
                                    <div>
                                        <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider text-[10px]">Descrição</span>
                                        <p className="mt-1 text-sm text-foreground/80 whitespace-pre-wrap">{os.descricao}</p>
                                    </div>
                                )}

                                {os.anexos && os.anexos.length > 0 && (
                                    <div className={os.descricao ? "pt-4 border-t border-border/50" : ""}>
                                        <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider text-[10px]">Anexos</span>
                                        <div className="mt-2 grid grid-cols-1 gap-2">
                                            {os.anexos.map((file) => (
                                                <a
                                                    key={file.id}
                                                    href={file.path}
                                                    download
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border border-border hover:bg-muted transition-colors group"
                                                >
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <Paperclip className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                                        <span className="text-sm font-medium text-foreground truncate">{file.name}</span>
                                                        <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                                                    </div>
                                                    <Download className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Closure Details (Moved from Execution Page) */}
                    {execution && execution.status === 'DONE' && (
                        <Card className="shadow-sm md:col-span-2 border-l-4 border-l-emerald-500 border-y border-r border-border bg-card">
                            <CardHeader className="pb-3 border-b border-border/50">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                                    Detalhes do Encerramento (Responsável)
                                    {execution.updatedAt && (
                                        <span className="ml-auto text-xs font-normal text-muted-foreground">
                                            {formatDateTimeSP(execution.updatedAt)}
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Responsável pelo Encerramento</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <User className="h-4 w-4 text-[#4da8bc]" />
                                            <p className="text-sm font-medium text-foreground">{execution.technicianName || 'Não identificado'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Observação</span>
                                    <div className="mt-1 p-3 bg-muted/30 rounded-lg text-sm text-foreground/90 whitespace-pre-wrap border border-border">
                                        {execution.obs || 'Nenhuma observação.'}
                                    </div>
                                </div>

                                {execution.photos.filter(p => !p.caixaId).length > 0 && (
                                    <OSPhotosGallery
                                        photos={execution.photos.filter(p => !p.caixaId)}
                                        osId={os.id}
                                        allowDelete={true}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    )}
                    {/* Observações Gerais da OS (Final da Página) */}
                    {os.observacoes && (
                        <Card className="shadow-sm md:col-span-2 border-l-4 border-l-[#4da8bc] border-y border-r border-border bg-card">
                            <CardHeader className="pb-3 border-b border-border/50">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                                    <ClipboardList className="h-4 w-4 text-[#4da8bc]" />
                                    Observações
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                                    {os.observacoes}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Materiais Utilizados */}
                    {materials && materials.length > 0 && (
                        <Card className="shadow-sm md:col-span-2 border-l-4 border-l-[#4da8bc] border-y border-r border-border bg-card">
                            <CardHeader className="pb-3 border-b border-border/50">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                                    <ShoppingBasket className="h-4 w-4 text-[#4da8bc]" />
                                    Materiais Utilizados
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-3">
                                    {materials.map((m: any) => (
                                        <div key={m.id} className="p-3 bg-muted/20 rounded-lg border border-border/40 space-y-2">
                                            <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed font-medium">
                                                {m.content}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="h-3 w-3 text-[#4da8bc]" />
                                                    <span>{m.equipe?.fullName || m.equipe?.nomeEquipe || m.equipe?.name || 'Equipe'}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="h-3 w-3 text-[#4da8bc]" />
                                                    <span>{formatDateTimeSP(m.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

            </div>
        </div>
    );
}
