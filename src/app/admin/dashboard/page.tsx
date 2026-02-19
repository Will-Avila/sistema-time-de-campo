
import { getDashboardData } from '@/actions/dashboard';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    LayoutDashboard, CheckCircle, Clock, Users, TrendingUp,
    Activity, ArrowRight, AlertTriangle, Bell, Wrench, MapPin,
    Camera, Trash2, DollarSign, Package
} from 'lucide-react';
import { HeaderServer } from '@/components/layout/HeaderServer';
import { ExcelUploadButton } from '@/components/ExcelUploadButton';
import { SyncDataButton } from '@/components/SyncDataButton';
import { StatusBadge } from '@/components/os/StatusBadge';
import { DateSelector } from '@/components/dashboard/DateSelector';
import { getOSStatusInfo, getTodaySP, isSameDaySP, getDaysRemaining } from '@/lib/utils';
import { EnrichedOS } from '@/lib/types';
import { DashboardOSTable } from '@/components/dashboard/DashboardOSTable';

function timeAgo(dateStr: string): string {
    const now = new Date();
    const past = new Date(dateStr);
    const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    if (seconds < 60) return 'agora';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return past.toLocaleDateString('pt-BR');
}

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
    searchParams
}: {
    searchParams: { date?: string }
}) {
    const data = await getDashboardData(searchParams.date);
    const displayDate = searchParams.date || new Date().toLocaleDateString('pt-BR');

    return (
        <div className="min-h-screen bg-muted/30 transition-colors">
            <HeaderServer />

            <div className="container mx-auto p-4 md:p-8 space-y-8 pt-6">

                {/* Header Section */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            Dashboard
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Visão geral das operações e indicadores em tempo real.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <SyncDataButton />
                        <ExcelUploadButton />
                        <div className="h-8 w-px bg-border mx-1 hidden md:block" />
                        <Link href="/os" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium border border-input bg-card dark:bg-muted hover:bg-accent hover:text-accent-foreground h-10 px-4 transition-colors shadow-sm whitespace-nowrap">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            Ordens de Serviço
                        </Link>
                        <Link href="/admin/equipes" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground h-10 px-4 transition-colors shadow-sm whitespace-nowrap">
                            <Users className="h-4 w-4" />
                            Equipes
                        </Link>
                    </div>
                </header>

                {/* Stats Grid - 6 cards */}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {/* Total OS */}
                    <Link href="/os" className="block group">
                        <div className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all h-full group-hover:border-primary/50 relative overflow-hidden flex flex-col justify-between">
                            <div className="absolute -top-2 -right-2 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <LayoutDashboard className="h-16 w-16 text-primary" />
                            </div>
                            <div className="relative z-10 flex flex-col h-full">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">OS Abertas</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-black text-foreground">{data.stats.open}</p>
                                </div>
                                <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between group/footer gap-2">
                                    <div className="flex flex-wrap gap-1.5">
                                        {(data.stats.openUfBreakdown || []).slice(0, 4).map((item: any) => (
                                            <div key={item.uf} className="flex flex-col items-center justify-center bg-muted/50 px-1.5 py-1 rounded border border-border/50 min-w-[28px]">
                                                <span className="text-[8px] text-muted-foreground font-bold leading-none mb-0.5">{item.uf}</span>
                                                <span className="text-[10px] font-black text-foreground leading-none">{item.count}</span>
                                            </div>
                                        ))}
                                        {(!data.stats.openUfBreakdown || data.stats.openUfBreakdown.length === 0) && (
                                            <span className="text-[10px] italic text-muted-foreground">Vazio</span>
                                        )}
                                    </div>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-all group-hover:translate-x-0.5 shrink-0" />
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Em Execução */}
                    <Link href="/admin/executing" className="block group">
                        <div className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all h-full group-hover:border-amber-500/50 relative overflow-hidden flex flex-col justify-between">
                            <div className="absolute -top-2 -right-2 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Activity className="h-16 w-16 text-amber-500" />
                            </div>
                            <div className="relative z-10 flex flex-col h-full">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Em Execução</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{data.stats.emExecucao}</p>
                                </div>
                                <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                                    <div className="flex flex-wrap gap-1.5">
                                        {(data.stats.emExecucaoUfBreakdown || []).slice(0, 4).map((item: any) => (
                                            <div key={item.uf} className="flex flex-col items-center justify-center bg-amber-500/10 px-1.5 py-1 rounded border border-amber-500/20 min-w-[28px]">
                                                <span className="text-[8px] text-amber-600/70 dark:text-amber-400/70 font-bold leading-none mb-0.5">{item.uf}</span>
                                                <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 leading-none">{item.count}</span>
                                            </div>
                                        ))}
                                        {(!data.stats.emExecucaoUfBreakdown || data.stats.emExecucaoUfBreakdown.length === 0) && (
                                            <span className="text-[10px] italic text-muted-foreground">Nenhuma</span>
                                        )}
                                    </div>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-amber-500 transition-all group-hover:translate-x-0.5 shrink-0" />
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Concluídas Hoje */}
                    <Link href="/admin/today" className="block group">
                        <div className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all h-full group-hover:border-emerald-500/50 relative overflow-hidden flex flex-col justify-between">
                            <div className="absolute -top-2 -right-2 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <CheckCircle className="h-16 w-16 text-emerald-500" />
                            </div>
                            <div className="relative z-10 flex flex-col h-full">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Encerradas Hoje</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{data.stats.completedToday}</p>
                                </div>
                                <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-x-2 sm:gap-x-3">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[9px] uppercase text-muted-foreground font-bold">Conc:</span>
                                            <span className="font-bold text-xs text-emerald-600">{data.stats.todayConcluidas}</span>
                                        </div>
                                        <div className="flex items-baseline gap-1 border-l border-border/50 pl-2">
                                            <span className="text-[9px] uppercase text-muted-foreground font-bold">Canc:</span>
                                            <span className="font-bold text-xs text-rose-600">{data.stats.todayCanceladas}</span>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-emerald-500 transition-all group-hover:translate-x-0.5 shrink-0" />
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Orçamento Mensal */}
                    <Link href="/admin/reports/monthly" className="block group">
                        <div className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all h-full group-hover:border-emerald-500/50 relative overflow-hidden flex flex-col justify-between">
                            <div className="absolute -top-2 -right-2 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <DollarSign className="h-16 w-16 text-emerald-500" />
                            </div>
                            <div className="relative z-10 flex flex-col h-full">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Orçamento ({data.stats.budgetMonth})</p>
                                <div className="flex flex-col">
                                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 truncate">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.stats.budgetDone)}
                                    </p>
                                </div>
                                <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] text-muted-foreground font-bold uppercase mb-0.5">Previsto</p>
                                        <p className="text-xs font-bold text-foreground">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.stats.budgetTotal)}
                                        </p>
                                    </div>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-emerald-500 transition-all group-hover:translate-x-0.5 shrink-0" />
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Caixas do Mês */}
                    <Link href="/admin/reports/boxes" className="block group">
                        <div className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all h-full group-hover:border-blue-500/50 relative overflow-hidden flex flex-col justify-between">
                            <div className="absolute -top-2 -right-2 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Package className="h-16 w-16 text-blue-500" />
                            </div>
                            <div className="relative z-10 flex flex-col h-full">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Caixas ({data.stats.budgetMonth})</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{data.stats.boxesDone}</p>
                                </div>
                                <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] text-muted-foreground font-bold uppercase mb-0.5">Planejado</p>
                                        <p className="text-xs font-bold text-foreground">{data.stats.boxesTotal}</p>
                                    </div>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-blue-500 transition-all group-hover:translate-x-0.5 shrink-0" />
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Facilidades do Mês */}
                    <Link href="/admin/reports/facilities" className="block group">
                        <div className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all h-full group-hover:border-amber-500/50 relative overflow-hidden flex flex-col justify-between">
                            <div className="absolute -top-2 -right-2 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Wrench className="h-16 w-16 text-amber-500" />
                            </div>
                            <div className="relative z-10 flex flex-col h-full">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Facilidades ({data.stats.budgetMonth})</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{data.stats.facilitiesDone}</p>
                                </div>
                                <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] text-muted-foreground font-bold uppercase mb-0.5">Planejado</p>
                                        <p className="text-xs font-bold text-foreground">{data.stats.facilitiesTotal}</p>
                                    </div>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-amber-500 transition-all group-hover:translate-x-0.5 shrink-0" />
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>



                {/* Middle Row: Activity Feed + UF Breakdown + Tech Performance */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Prazo OS Abertas */}
                    <Card className="lg:col-span-1 border-border shadow-sm">
                        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                            <CardTitle className="text-base font-semibold flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-sky-500" />
                                    Prazo OS Abertas
                                </div>
                                <Badge variant="outline" className="text-[10px] uppercase font-bold">
                                    {data.deadlineGrandTotal.total} OS
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {data.deadlineUfBreakdown.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm italic">Nenhuma OS aberta</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="font-semibold text-muted-foreground border-b border-border/50 bg-muted/10">
                                                <th className="py-3 px-4 text-left">UF</th>
                                                <th className="py-3 px-2 text-center text-rose-500 font-bold">Vencido</th>
                                                <th className="py-3 px-2 text-center text-amber-500 font-bold">Hoje</th>
                                                <th className="py-3 px-2 text-center text-sky-500 font-bold">5 dias</th>
                                                <th className="py-3 px-2 text-center">{'>'}5 dias</th>
                                                <th className="py-3 px-2 text-center">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {data.deadlineUfBreakdown.map((item: any) => (
                                                <tr key={item.uf} className="hover:bg-muted/30 transition-colors">
                                                    <td className="py-2.5 px-4 font-bold text-foreground">{item.uf}</td>
                                                    <td className="py-2.5 px-2 text-center">
                                                        {item.vencido > 0 ? <span className="text-rose-600 font-bold bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded">{item.vencido}</span> : <span className="text-muted-foreground/30">-</span>}
                                                    </td>
                                                    <td className="py-2.5 px-2 text-center">
                                                        {item.hoje > 0 ? <span className="text-amber-600 font-bold bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">{item.hoje}</span> : <span className="text-muted-foreground/30">-</span>}
                                                    </td>
                                                    <td className="py-2.5 px-2 text-center">
                                                        {item.em5dias > 0 ? <span className="text-sky-600 font-bold bg-sky-50 dark:bg-sky-900/20 px-1.5 py-0.5 rounded">{item.em5dias}</span> : <span className="text-muted-foreground/30">-</span>}
                                                    </td>
                                                    <td className="py-2.5 px-2 text-center text-muted-foreground">
                                                        {item.acima5dias > 0 ? item.acima5dias : <span className="opacity-30">-</span>}
                                                    </td>
                                                    <td className="py-2.5 px-2 text-center font-bold text-foreground">{item.total}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="border-t-2 border-border bg-muted/20">
                                            <tr className="font-bold text-foreground">
                                                <td className="py-3 px-4">TOTAL</td>
                                                <td className="py-3 px-2 text-center text-rose-600">{data.deadlineGrandTotal.vencido}</td>
                                                <td className="py-3 px-2 text-center text-amber-600">{data.deadlineGrandTotal.hoje}</td>
                                                <td className="py-3 px-2 text-center text-sky-600">{data.deadlineGrandTotal.em5dias}</td>
                                                <td className="py-3 px-2 text-center text-muted-foreground">{data.deadlineGrandTotal.acima5dias}</td>
                                                <td className="py-3 px-2 text-center bg-primary/5">{data.deadlineGrandTotal.total}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Activity Feed */}
                    <Card className="lg:col-span-1 border-border shadow-sm">
                        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Bell className="h-4 w-4 text-primary" />
                                Atividade Recente
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {data.activityFeed.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">Nenhuma atividade recente</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/50 max-h-[350px] overflow-y-auto">
                                    {data.activityFeed.map((item: any) => {
                                        const targetPath = item.osId
                                            ? (item.type === 'CHECKLIST' ? `/os/${item.osId}/execution` : `/os/${item.osId}`)
                                            : '#';

                                        const isPhoto = item.title.toLowerCase().includes('foto');
                                        const isNOK = item.title.toLowerCase().includes('não concluída') || item.title.toLowerCase().includes('nao concluida') || item.title.toLowerCase().includes('não verificada') || item.title.toLowerCase().includes('nao verificada');
                                        const isReset = item.title.toLowerCase().includes('desmarcada');

                                        return (
                                            <Link
                                                key={item.id}
                                                href={targetPath}
                                                className={`flex gap-3 p-3 hover:bg-muted/50 transition-all ${item.osId ? 'cursor-pointer' : 'cursor-default'}`}
                                            >
                                                <div className="mt-1 shrink-0">
                                                    {isPhoto ? (
                                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-1.5 rounded-full"><Camera className="h-3 w-3 text-emerald-600" /></div>
                                                    ) : isNOK ? (
                                                        <div className="bg-rose-50 dark:bg-rose-900/20 p-1.5 rounded-full"><AlertTriangle className="h-3 w-3 text-rose-600" /></div>
                                                    ) : (item.title.toLowerCase().includes('certificada') || item.message.toLowerCase().includes('certificada')) ? (
                                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-1.5 rounded-full"><CheckCircle className="h-3 w-3 text-emerald-600" /></div>
                                                    ) : (item.title.toLowerCase().includes('concluída') || item.title.toLowerCase().includes('concluida') || item.message.toLowerCase().includes('concluiu')) ? (
                                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded-full"><CheckCircle className="h-3 w-3 text-blue-600" /></div>
                                                    ) : isReset ? (
                                                        <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full"><Trash2 className="h-3 w-3 text-slate-500" /></div>
                                                    ) : (
                                                        <div className={`h-2.5 w-2.5 rounded-full mt-1.5 ml-1.5 ${item.type === 'OS_CLOSE' ? 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]' : 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]'}`} />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-foreground truncate">
                                                        {item.title}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground truncate leading-relaxed">
                                                        {item.message}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                                        {timeAgo(item.createdAt)}
                                                    </p>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Daily Execution Performance (Grouped by OS) */}
                    <Card className="lg:col-span-1 border-border shadow-sm">
                        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                            <CardTitle className="text-base font-semibold flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                                    Execução {displayDate}
                                </div>
                                <div className="flex items-center gap-2">
                                    <DateSelector initialDate={displayDate} />
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold">{data.performanceByOS.length} OS</Badge>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {data.performanceByOS.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm italic">Nenhuma produtividade hoje</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/50 max-h-[350px] overflow-y-auto">
                                    {data.performanceByOS.map((os: any, i: number) => (
                                        <div key={i} className="p-3 hover:bg-muted/50 transition-colors">
                                            <div className="flex items-start gap-2 mb-2">
                                                <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-foreground uppercase tracking-tight leading-tight">
                                                        {os.title}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{os.pop}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-1 ml-4 border-l border-border pl-3">
                                                {os.teams.map((team: any, j: number) => (
                                                    <div key={j} className="flex items-center justify-between text-xs py-0.5">
                                                        <span className="text-muted-foreground font-medium truncate pr-2">
                                                            {team.name}
                                                        </span>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {team.caixas > 0 && (
                                                                <Badge variant="outline" className="text-[10px] h-5 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                                                    {team.caixas} cx
                                                                </Badge>
                                                            )}
                                                            {team.metrosLancados > 0 && (
                                                                <Badge variant="outline" className="text-[10px] h-5 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                                                                    {team.metrosLancados.toLocaleString('pt-BR')}m lanç
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* OS Table */}
                <Card className="border-border shadow-sm">
                    <CardHeader className="pb-4 border-b border-border/50">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Wrench className="h-4 w-4 text-primary" />
                                Ordens de Serviço
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 text-xs">
                        <DashboardOSTable initialOSList={data.osList} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
