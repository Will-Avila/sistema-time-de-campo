import { getOSById } from '@/lib/excel';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, Wrench, FileText, CheckCircle, Clock, AlertTriangle, User, Map, Building, Paperclip, Download } from 'lucide-react';
import { getOSStatusInfo } from '@/lib/utils';
import Image from 'next/image';
import OSClosureForm from './OSClosureForm';
import { OSPhotosGallery } from './OSPhotosGallery';
import { HeaderServer } from '@/components/layout/HeaderServer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getSession } from '@/lib/auth';
import { StatusBadge } from '@/components/os/StatusBadge';

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

    const statusInfo = getOSStatusInfo({
        osStatus: os.status,
        execution
    });

    // Date color logic from OSListClient
    const getDateColor = (dateStr?: string) => {
        if (!dateStr || dateStr === '-') return 'text-slate-700 dark:text-slate-300';
        const [day, month, year] = dateStr.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        const today = new Date();
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (d.getTime() < t.getTime()) return 'text-rose-600 dark:text-rose-400';
        if (d.getTime() === t.getTime()) return 'text-amber-600 dark:text-amber-400';
        return 'text-slate-700 dark:text-slate-300';
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-20 transition-colors">
            <HeaderServer />

            <div className="pt-24 px-4 md:px-8 max-w-4xl mx-auto space-y-6">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/os" className="p-2 -ml-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                            <ArrowLeft className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="font-mono text-xs text-muted-foreground border-slate-200 dark:border-slate-700">
                                    {os.protocolo}
                                </Badge>
                                {os.uf && (
                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                        {os.uf}
                                    </Badge>
                                )}
                            </div>

                            {/* Condo Name above POP */}
                            {os.condominio && (
                                <div className="flex items-center gap-2 mb-0.5 mt-1">
                                    <Building className="h-4 w-4 text-slate-500" />
                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                                        {os.condominio}
                                    </span>
                                </div>
                            )}

                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">{os.pop}</h1>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <StatusBadge osStatus={os.status} execution={execution} />
                                <Badge variant="outline" className="text-slate-500 bg-white/50 dark:bg-slate-900/50">
                                    {os.items.length} caixas
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        {isAdmin && (
                            <Link href={`/os/${os.id}/admin`}>
                                <Button variant="outline" size="lg" className="w-full gap-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <FileText className="h-4 w-4" />
                                    Editar Info.
                                </Button>
                            </Link>
                        )}

                        <Link href={`/os/${os.id}/execution`} className="w-full sm:w-auto">
                            <Button size="lg" className="w-full gap-2 shadow-lg bg-blue-600 hover:bg-blue-700">
                                <Wrench className="h-4 w-4" />
                                CAIXAS
                            </Button>
                        </Link>
                        {(!execution || execution.status !== 'DONE') && !statusInfo.label.includes('Concluída') && !statusInfo.label.includes('Encerrada') && !statusInfo.label.includes('Cancelada') && (
                            <OSClosureForm
                                osId={os.id}
                                triggerClassName="w-full sm:w-auto h-11 px-8 gap-2 shadow-lg bg-red-600 hover:bg-red-700 text-white inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                                triggerSize="lg"
                            />
                        )}
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Main Info Card */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                            <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                <FileText className="h-4 w-4 text-blue-500" />
                                Informações Principais
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider text-[10px]">POP</span>
                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">{os.pop}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider text-[10px]">Protocolo</span>
                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5 font-mono">{os.protocolo}</p>
                                </div>
                            </div>

                            <div>
                                <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider text-[10px]">Cenário</span>
                                <div className="flex items-start gap-2 mt-1">
                                    <Map className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{os.cenario || 'Não especificado'}</p>
                                </div>
                            </div>

                            {os.condominio && (
                                <div>
                                    <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider text-[10px]">Condomínio</span>
                                    <div className="flex items-start gap-2 mt-1">
                                        <Building className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{os.condominio}</p>
                                    </div>
                                </div>
                            )}

                            {execution?.equipe && (
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                                    <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider text-[10px]">Equipe Responsável</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <User className="h-4 w-4 text-slate-400" />
                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{execution.equipe.fullName || execution.equipe.nomeEquipe || execution.equipe.name}</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Dates Card + Extra Info */}
                    {/* Dates Card */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                            <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                <Calendar className="h-4 w-4 text-violet-500" />
                                Prazos e Datas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-5">
                            <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                                <div>
                                    <span className="block text-muted-foreground/60 mb-1 text-[10px] uppercase font-bold tracking-wider">Entrada</span>
                                    <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                        {os.dataEntrante}
                                    </div>
                                </div>

                                {statusInfo.label === 'Concluída' ? (
                                    <div>
                                        <span className="block text-muted-foreground/60 mb-1 text-[10px] uppercase font-bold tracking-wider">Conclusão</span>
                                        <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                            {execution?.updatedAt ? execution.updatedAt.toLocaleDateString('pt-BR') : (os.dataConclusao || '-')}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <span className="block text-muted-foreground/60 mb-1 text-[10px] uppercase font-bold tracking-wider">Prazo</span>
                                        <div className={`flex items-center gap-1.5 font-medium ${getDateColor(os.dataPrevExec)}`}>
                                            <Calendar className="h-3.5 w-3.5 text-slate-400 opacity-70" />
                                            {os.dataPrevExec}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <span className="block text-muted-foreground/60 mb-1 text-[10px] uppercase font-bold tracking-wider">Total Caixas</span>
                                    <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                                        <Wrench className="h-3.5 w-3.5 text-slate-400" />
                                        {os.items.length} CTOs
                                    </div>
                                </div>

                                <div>
                                    <span className="block text-muted-foreground/60 mb-1 text-[10px] uppercase font-bold tracking-wider">UF</span>
                                    <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                        {os.uf || '-'}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Extra Info: Description & Attachments */}
                    {(os.descricao || (os.anexos && os.anexos.length > 0)) && (
                        <Card className="shadow-sm border-l-4 border-l-violet-500 md:col-span-2">
                            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                    <FileText className="h-4 w-4 text-violet-500" />
                                    Informações Adicionais
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                {os.descricao && (
                                    <div>
                                        <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider text-[10px]">Descrição</span>
                                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{os.descricao}</p>
                                    </div>
                                )}

                                {os.anexos && os.anexos.length > 0 && (
                                    <div className={os.descricao ? "pt-4 border-t border-slate-100 dark:border-slate-800" : ""}>
                                        <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider text-[10px]">Anexos</span>
                                        <div className="mt-2 grid grid-cols-1 gap-2">
                                            {os.anexos.map((file) => (
                                                <a
                                                    key={file.id}
                                                    href={file.path}
                                                    download
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                                                >
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <Paperclip className="h-4 w-4 text-slate-400 group-hover:text-violet-500 transition-colors" />
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{file.name}</span>
                                                        <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                                                    </div>
                                                    <Download className="h-4 w-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200" />
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
                        <Card className="shadow-sm md:col-span-2 border-l-4 border-l-slate-300 dark:border-l-slate-700">
                            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                    <CheckCircle className="h-4 w-4 text-slate-400" />
                                    Detalhes do Encerramento (Responsável)
                                    {execution.updatedAt && (
                                        <span className="ml-auto text-xs font-normal text-muted-foreground">
                                            {execution.updatedAt.toLocaleString('pt-BR')}
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div>
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Observação</span>
                                    <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap border border-slate-100 dark:border-slate-800">
                                        {execution.obs || 'Nenhuma observação.'}
                                    </div>
                                </div>

                                {execution.photos.filter(p => !p.checklistId).length > 0 && (
                                    <OSPhotosGallery
                                        photos={execution.photos.filter(p => !p.checklistId)}
                                        osId={os.id}
                                        allowDelete={true}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

            </div>
        </div>
    );
}
