import { getOSById } from '@/lib/excel';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, Wrench, FileText, CheckCircle, Clock, AlertTriangle, User } from 'lucide-react';
import Image from 'next/image';
import OSClosureForm from './OSClosureForm';
import { OSPhotosGallery } from './OSPhotosGallery';
import { HeaderServer } from '@/components/layout/HeaderServer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PageProps {
    params: { id: string };
}

export default async function OSDetailPage({ params }: PageProps) {
    const os = await getOSById(params.id);

    if (!os) return notFound();

    const execution = await prisma.serviceExecution.findFirst({
        where: { osId: os.id },
        include: { technician: true, photos: true }
    });

    // Helper to get status color/label - Matching OSListClient precisely
    const getStatusInfo = () => {
        const excelStatusLower = os.status.toLowerCase();
        const isExcelEncerrada = excelStatusLower === 'encerrada';
        const isExcelDone = excelStatusLower === 'concluído' || excelStatusLower === 'concluido' || excelStatusLower === 'encerrada';

        let label = os.status || 'Pendente';
        let variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "orange" | "light-green" = "secondary";
        let icon = AlertTriangle;

        if (execution) {
            // Compute dynamic status matching os/page.tsx logic
            let closureStatus = 'Concluída';
            if (execution.obs) {
                const match = execution.obs.match(/Status: (.*?)\n/);
                if (match && match[1]) {
                    closureStatus = match[1];
                } else if (execution.obs.includes('Sem Execução')) {
                    closureStatus = 'Sem Execução';
                }
            }
            const dynamicStatus = `${closureStatus} - Em análise`;

            if (isExcelEncerrada || execution.status === 'DONE') {
                label = dynamicStatus;
                variant = label.includes('Sem Execução') ? 'orange' : 'light-green';
                icon = Clock;
            } else if (execution.status === 'PENDING') {
                label = 'Em Execução';
                variant = 'warning';
                icon = Wrench;
            } else if (isExcelDone) {
                label = 'Concluída';
                variant = 'success';
                icon = CheckCircle;
            }
        } else {
            // No local execution record
            if (isExcelDone) {
                label = 'Concluída';
                variant = 'success';
                icon = CheckCircle;
            } else if (excelStatusLower === 'cancelado') {
                label = 'Cancelada';
                variant = 'destructive';
                icon = AlertTriangle;
            }
        }

        return { label, variant, icon };
    };

    const statusInfo = getStatusInfo();
    const StatusIcon = statusInfo.icon;

    // Date color logic from OSListClient
    const getDateColor = (excelSerial?: number) => {
        if (!excelSerial) return 'text-slate-700 dark:text-slate-300';
        const dateMs = (excelSerial - 25569) * 86400000;
        const date = new Date(dateMs);
        const today = new Date();
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (d.getTime() < t.getTime()) return 'text-rose-600 dark:text-rose-400';
        if (d.getTime() === t.getTime()) return 'text-amber-600 dark:text-amber-400';
        return 'text-slate-700 dark:text-slate-300';
    };

    const displayStatus = statusInfo.label;

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
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">{os.pop}</h1>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <Badge variant={statusInfo.variant} className="gap-1.5">
                                    <StatusIcon className="h-3.5 w-3.5" />
                                    {displayStatus}
                                </Badge>
                                <Badge variant="outline" className="text-slate-500 bg-white/50 dark:bg-slate-900/50">
                                    {os.items.length} caixas
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <Link href={`/os/${os.id}/execution`} className="w-full sm:w-auto">
                            <Button size="lg" className="w-full gap-2 shadow-lg bg-blue-600 hover:bg-blue-700">
                                <Wrench className="h-4 w-4" />
                                {execution?.status === 'DONE' ? 'Ver Execução' : 'Iniciar Execução'}
                            </Button>
                        </Link>
                        {(!execution || execution.status !== 'DONE') && (
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
                                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{os.id === os.pop ? 'Endereço não especificado no arquivo' : os.id}</p>
                                </div>
                            </div>

                            {execution?.technician && (
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                                    <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider text-[10px]">Técnico Responsável</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <User className="h-4 w-4 text-slate-400" />
                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{execution.technician.name}</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Dates Card */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                            <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                <Calendar className="h-4 w-4 text-violet-500" />
                                Prazos e Datas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-5">
                            <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                                <span className="text-xs font-bold text-muted-foreground/70 uppercase">Status na Base</span>
                                <Badge variant="outline" className="bg-white dark:bg-slate-950 font-medium">
                                    {os.status || 'Não informado'}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                                <div>
                                    <span className="block text-muted-foreground/60 mb-1 text-[10px] uppercase font-bold tracking-wider">Entrada</span>
                                    <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                        {os.dataEntrante}
                                    </div>
                                </div>

                                {displayStatus === 'Concluída' ? (
                                    <div>
                                        <span className="block text-muted-foreground/60 mb-1 text-[10px] uppercase font-bold tracking-wider">Conclusão</span>
                                        <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                                            <Calendar className="h-3.5 w-3.5 text-emerald-500/70" />
                                            {execution?.updatedAt ? execution.updatedAt.toLocaleDateString('pt-BR') : (os.dataConclusao || '-')}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <span className="block text-muted-foreground/60 mb-1 text-[10px] uppercase font-bold tracking-wider">Prazo</span>
                                        <div className={`flex items-center gap-1.5 font-medium ${getDateColor(os.rawPrevExec)}`}>
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

                    {/* Closure Details (Moved from Execution Page) */}
                    {execution && execution.status === 'DONE' && (
                        <Card className="shadow-sm md:col-span-2 border-l-4 border-l-emerald-500">
                            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                                    Detalhes do Encerramento (Técnico)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div>
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Observação</span>
                                    <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap border border-slate-100 dark:border-slate-800">
                                        {execution.obs || 'Nenhuma observação.'}
                                    </div>
                                </div>

                                {execution.photos.length > 0 && (
                                    <OSPhotosGallery photos={execution.photos} />
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

            </div>
        </div>
    );
}
