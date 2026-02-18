import { getOSById } from '@/lib/excel';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, Wrench, FileText, CheckCircle, Clock, AlertTriangle, User, Map, Building, Paperclip, Download, ClipboardList } from 'lucide-react';
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

interface PageProps {
    params: { id: string };
}

export default async function OSDetailPage({ params }: PageProps) {
    const os = await getOSById(params.id);
    const session = await getSession();
    const isAdmin = session?.isAdmin;

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

    // Date color logic from OSListClient

    return (
        <div className="min-h-screen bg-muted/30 pb-20 transition-colors">
            <HeaderServer />

            <div className="container pt-6 max-w-4xl space-y-6">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/os" className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
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

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        {isAdmin && (
                            <Link href={`/os/${os.id}/admin`} className="w-full sm:w-auto">
                                <Button variant="outline" size="lg" className="w-full gap-2 border-border hover:bg-muted h-11 shadow-sm">
                                    <FileText className="h-4 w-4" />
                                    Add Detalhes
                                </Button>
                            </Link>
                        )}

                        <Link href={`/os/${os.id}/execution`} className="w-full sm:w-auto">
                            <Button size="lg" className="w-full gap-2 shadow-sm h-11">
                                <Wrench className="h-4 w-4" />
                                Caixas
                            </Button>
                        </Link>
                        {(!execution || execution.status !== 'DONE') && !statusInfo.label.includes('Concluída') && !statusInfo.label.includes('Encerrada') && !statusInfo.label.includes('Cancelada') && (
                            <OSClosureForm
                                osId={os.id}
                                triggerClassName="w-full sm:w-auto h-11 px-8 gap-2 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center justify-center rounded-md text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                                triggerSize="lg"
                            />
                        )}
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Main Info Card */}
                    <Card className="shadow-sm border-border bg-card">
                        <CardHeader className="pb-3 border-b border-border/50">
                            <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                                <FileText className="h-4 w-4 text-[#4da8bc]" />
                                Informações Principais
                            </CardTitle>
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

                            {(aggregatedTeams || execution?.equipe) && (
                                <div className="pt-2 border-t border-border/50 mt-2">
                                    <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider text-[10px]">Equipe(s) em Campo</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <User className="h-4 w-4 text-[#4da8bc]" />
                                        <p className="text-sm font-medium text-foreground">
                                            {aggregatedTeams || (execution?.equipe ? (execution.equipe.fullName || execution.equipe.nomeEquipe || execution.equipe.name) : '-')}
                                        </p>
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
                </div>

            </div>
        </div>
    );
}
