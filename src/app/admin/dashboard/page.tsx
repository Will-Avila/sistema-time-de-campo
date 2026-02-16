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
import { getOSStatusInfo, getDaysRemaining } from '@/lib/utils';
import { EnrichedOS } from '@/lib/types';

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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors">
            <HeaderServer />

            <div className="container pt-20 space-y-6 pb-8">

                {/* Header */}
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            Dashboard
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Visão geral das operações • Atualizado em tempo real
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
                        <SyncDataButton />
                        <ExcelUploadButton />
                        <Link href="/os" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 h-11 px-6 transition-colors shadow-md whitespace-nowrap">
                            <Wrench className="h-4 w-4 shrink-0 text-slate-500" />
                            Ordens de Serviço
                        </Link>
                        <Link href="/admin/equipes" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-6 transition-colors shadow-md whitespace-nowrap">
                            <Users className="h-4 w-4 shrink-0" />
                            Usuários
                        </Link>
                    </div>
                </header>

                {/* Stats Grid - 6 cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* Total OS */}
                    <Link href="/os" className="block group">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all h-full hover:border-blue-200 dark:hover:border-blue-900/50">
                            <div className="flex items-center justify-between mb-2">
                                <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                    <LayoutDashboard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                            </div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{data.stats.open}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 font-semibold tracking-tight">OS Abertas</p>

                            <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                    {(data.stats.openUfBreakdown || []).map((item: any) => (
                                        <div key={item.uf} className="flex flex-col items-center min-w-[20px]">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">{item.uf}</span>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-none">{String(item.count).padStart(2, '0')}</span>
                                        </div>
                                    ))}
                                    {(!data.stats.openUfBreakdown || data.stats.openUfBreakdown.length === 0) && (
                                        <span className="text-[10px] text-slate-400 italic">Nenhuma OS aberta</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Concluídas Hoje */}
                    <Link href="/admin/today" className="block group">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all h-full hover:border-emerald-200 dark:hover:border-emerald-900/50">
                            <div className="flex items-center justify-between mb-2">
                                <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                            </div>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data.stats.completedToday}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 font-semibold tracking-tight">Encerradas Hoje</p>

                            <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/50 grid grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Concluídas</span>
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{data.stats.todayConcluidas}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Canceladas</span>
                                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{data.stats.todayCanceladas}</span>
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Em Execução (Excel) */}
                    <Link href="/admin/executing" className="block group">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all h-full hover:border-orange-200 dark:hover:border-orange-900/50">
                            <div className="flex items-center justify-between mb-2">
                                <div className="h-8 w-8 rounded-lg bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center">
                                    <Activity className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-orange-500 transition-colors" />
                            </div>
                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{data.stats.emExecucao}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 font-semibold tracking-tight">Em Execução</p>

                            <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                    {(data.stats.emExecucaoUfBreakdown || []).map((item: any) => (
                                        <div key={item.uf} className="flex flex-col items-center min-w-[20px]">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">{item.uf}</span>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-none">{String(item.count).padStart(2, '0')}</span>
                                        </div>
                                    ))}
                                    {(!data.stats.emExecucaoUfBreakdown || data.stats.emExecucaoUfBreakdown.length === 0) && (
                                        <span className="text-[10px] text-slate-400 italic">Nenhuma OS em execução</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Orçamento Mensal */}
                    <Link href="/admin/reports/monthly" className="block group">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all h-full hover:border-emerald-200 dark:hover:border-emerald-900/50">
                            <div className="flex items-center justify-between mb-2">
                                <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                                    <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                            </div>
                            <div className="space-y-1">
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold tracking-tight leading-none mb-1">Total Previsto</p>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.stats.budgetTotal)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold tracking-tight leading-none mb-1">Valor Concluído</p>
                                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.stats.budgetDone)}
                                    </p>
                                </div>
                                <p className="text-[10px] text-muted-foreground font-bold tracking-wider pt-1 border-t border-slate-100 dark:border-slate-800/50">MES: {data.stats.budgetMonth}</p>
                            </div>
                        </div>
                    </Link>

                    {/* Caixas do Mês */}
                    <Link href="/admin/reports/boxes" className="block group">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all h-full hover:border-blue-200 dark:hover:border-blue-900/50">
                            <div className="flex items-center justify-between mb-2">
                                <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                                    <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                            </div>
                            <div className="space-y-1">
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold tracking-tight leading-none mb-1">Caixas Planejadas</p>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white">
                                        {data.stats.boxesTotal}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold tracking-tight leading-none mb-1">Caixas Realizadas</p>
                                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                        {data.stats.boxesDone}
                                    </p>
                                </div>
                                <p className="text-[10px] text-muted-foreground font-bold tracking-wider pt-1 border-t border-slate-100 dark:border-slate-800/50">PRODUTIVIDADE {data.stats.budgetMonth}</p>
                            </div>
                        </div>
                    </Link>

                    {/* Facilidades do Mês */}
                    <Link href="/admin/reports/facilities" className="block group">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all h-full hover:border-amber-200 dark:hover:border-amber-900/50">
                            <div className="flex items-center justify-between mb-2">
                                <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center">
                                    <Wrench className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
                            </div>
                            <div className="space-y-1">
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold tracking-tight leading-none mb-1">Facilidades Planejadas</p>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white">
                                        {data.stats.facilitiesTotal}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold tracking-tight leading-none mb-1">Facilidades Realizadas</p>
                                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                                        {data.stats.facilitiesDone}
                                    </p>
                                </div>
                                <p className="text-[10px] text-muted-foreground font-bold tracking-wider pt-1 border-t border-slate-100 dark:border-slate-800/50">PRODUTIVIDADE {data.stats.budgetMonth}</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Completion Progress Bar */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Progresso Geral</span>
                        <span className="text-sm font-semibold text-primary">{data.stats.completionRate}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${data.stats.completionRate}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-2 text-[11px] text-muted-foreground">
                        <span>{data.stats.completedTotal} encerradas</span>
                        <span>{data.stats.total} ativas restantes</span>
                    </div>
                </div>

                {/* Middle Row: Activity Feed + UF Breakdown + Tech Performance */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* Prazo OS Abertas */}
                    <Card className="lg:col-span-1 dark:bg-slate-900 dark:border-slate-800 shadow-sm overflow-hidden">
                        <CardHeader className="pb-3 border-b dark:border-slate-800 bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-800/80 dark:to-slate-900/80">
                            <CardTitle className="text-sm font-bold flex items-center justify-between text-white">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-md bg-white/10 flex items-center justify-center">
                                        <Clock className="h-3.5 w-3.5 text-sky-400" />
                                    </div>
                                    Prazo OS Abertas
                                </div>
                                <Badge variant="outline" className="font-bold text-[10px] uppercase border-white/20 text-white/70">
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
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-[9px] font-bold uppercase tracking-wider text-center border-b border-slate-100 dark:border-slate-800">
                                                <th className="py-2.5 px-3 text-left font-extrabold text-slate-500 dark:text-slate-400">UF</th>
                                                <th className="py-2.5 px-2 font-extrabold text-rose-400">Vencido</th>
                                                <th className="py-2.5 px-2 font-extrabold text-amber-400">Hoje</th>
                                                <th className="py-2.5 px-2 font-extrabold text-sky-400">5 dias</th>
                                                <th className="py-2.5 px-2 font-extrabold text-slate-400">{'>'}5 dias</th>
                                                <th className="py-2.5 px-2 font-extrabold text-slate-500 dark:text-slate-400">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.deadlineUfBreakdown.map((item: any, i: number) => (
                                                <tr
                                                    key={item.uf}
                                                    className={`text-center text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${i % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-slate-50/50 dark:bg-slate-800/20'}`}
                                                >
                                                    <td className="py-2.5 px-3 text-left">
                                                        <span className="font-black text-slate-800 dark:text-slate-100 text-[11px] tracking-wide">{item.uf}</span>
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        {item.vencido > 0 ? (
                                                            <span className="inline-flex items-center justify-center min-w-[24px] h-6 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-black text-[11px] px-1.5">{item.vencido}</span>
                                                        ) : (
                                                            <span className="text-slate-200 dark:text-slate-700">–</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        {item.hoje > 0 ? (
                                                            <span className="inline-flex items-center justify-center min-w-[24px] h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-black text-[11px] px-1.5">{item.hoje}</span>
                                                        ) : (
                                                            <span className="text-slate-200 dark:text-slate-700">–</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        {item.em5dias > 0 ? (
                                                            <span className="inline-flex items-center justify-center min-w-[24px] h-6 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-bold text-[11px] px-1.5">{item.em5dias}</span>
                                                        ) : (
                                                            <span className="text-slate-200 dark:text-slate-700">–</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        {item.acima5dias > 0 ? (
                                                            <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">{item.acima5dias}</span>
                                                        ) : (
                                                            <span className="text-slate-200 dark:text-slate-700">–</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <span className="font-black text-slate-800 dark:text-white text-xs">{item.total}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-center text-xs">
                                                <td className="py-3 px-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">Total</td>
                                                <td className="py-3 px-2">
                                                    <span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-lg bg-rose-500 text-white font-black text-xs px-2 shadow-sm">{data.deadlineGrandTotal.vencido}</span>
                                                </td>
                                                <td className="py-3 px-2">
                                                    <span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-lg bg-amber-500 text-white font-black text-xs px-2 shadow-sm">{data.deadlineGrandTotal.hoje}</span>
                                                </td>
                                                <td className="py-3 px-2">
                                                    <span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-lg bg-sky-500 text-white font-black text-xs px-2 shadow-sm">{data.deadlineGrandTotal.em5dias}</span>
                                                </td>
                                                <td className="py-3 px-2">
                                                    <span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-lg bg-slate-400 dark:bg-slate-600 text-white font-black text-xs px-2 shadow-sm">{data.deadlineGrandTotal.acima5dias}</span>
                                                </td>
                                                <td className="py-3 px-2">
                                                    <span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-lg bg-slate-800 dark:bg-white text-white dark:text-slate-900 font-black text-sm px-2 shadow-sm">{data.deadlineGrandTotal.total}</span>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Activity Feed */}
                    <Card className="lg:col-span-1 dark:bg-slate-900 dark:border-slate-800 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 dark:text-white">
                                <Bell className="h-4 w-4 text-primary" />
                                Atividade Recente
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {data.activityFeed.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Nenhuma atividade recente</p>
                                </div>
                            ) : (
                                <div className="space-y-1 max-h-[320px] overflow-y-auto">
                                    {data.activityFeed.map((item: any) => {
                                        const targetPath = item.osId
                                            ? (item.type === 'CHECKLIST' ? `/os/${item.osId}/execution` : `/os/${item.osId}`)
                                            : '#';

                                        const isPhoto = item.title.toLowerCase().includes('foto');
                                        const isNOK = item.title.toLowerCase().includes('não verificada') || item.title.toLowerCase().includes('nao verificada');
                                        const isReset = item.title.toLowerCase().includes('desmarcada');

                                        return (
                                            <Link
                                                key={item.id}
                                                href={targetPath}
                                                className={`flex gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${item.osId ? 'cursor-pointer' : 'cursor-default'}`}
                                            >
                                                <div className={`mt-1 shrink-0`}>
                                                    {isPhoto ? (
                                                        <Camera className="h-4 w-4 text-emerald-500" />
                                                    ) : isNOK ? (
                                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                                    ) : isReset ? (
                                                        <Trash2 className="h-4 w-4 text-slate-500" />
                                                    ) : (
                                                        <div className={`h-2 w-2 rounded-full ${item.type === 'OS_CLOSE' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                                                        {item.title}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground truncate leading-relaxed">
                                                        {item.message}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
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
                    <Card className="lg:col-span-1 dark:bg-slate-900 dark:border-slate-800 shadow-sm overflow-hidden">
                        <CardHeader className="pb-3 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                            <CardTitle className="text-sm font-bold flex items-center justify-between dark:text-white">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                                    Execução {displayDate}
                                </div>
                                <div className="flex items-center gap-2">
                                    <DateSelector initialDate={displayDate} />
                                    <Badge variant="outline" className="font-bold text-[10px] uppercase">{data.performanceByOS.length} OS</Badge>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {data.performanceByOS.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground border-b dark:border-slate-800">
                                    <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm italic">Nenhuma produtividade hoje</p>
                                </div>
                            ) : (
                                <div className="divide-y dark:divide-slate-800 max-h-[350px] overflow-y-auto">
                                    {data.performanceByOS.map((os: any, i: number) => (
                                        <div key={i} className="p-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <div className="flex items-start gap-2 mb-2">
                                                <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-tight leading-tight">
                                                        {os.title}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{os.pop}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-1 ml-4 border-l border-slate-200 dark:border-slate-800 pl-3">
                                                {os.teams.map((team: any, j: number) => (
                                                    <div key={j} className="flex items-center justify-between text-xs py-0.5">
                                                        <span className="text-slate-600 dark:text-slate-400 font-medium truncate pr-2">
                                                            {team.name}
                                                        </span>
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-black whitespace-nowrap bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded text-[10px]">
                                                            {team.count} {team.count === 1 ? 'caixa' : 'caixas'}
                                                        </span>
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
                <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 dark:text-white">
                                <Wrench className="h-4 w-4 text-slate-500" />
                                Ordens de Serviço
                                <Badge variant="secondary" className="ml-2">{data.osList.length}</Badge>
                            </CardTitle>
                            <Link href="/os" className="text-xs text-primary font-medium flex items-center gap-1 hover:opacity-80 transition-all">
                                Ver todas <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="relative">
                            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 pb-2">
                                <div className="min-w-[800px]">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b dark:border-slate-700">
                                                <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">UF</th>
                                                <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">OS</th>
                                                <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Condomínio / POP</th>
                                                <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Entrada</th>
                                                <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Prazo</th>
                                                <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Caixas</th>
                                                <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                                                <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Observações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.osList.slice(0, 25).map((os: EnrichedOS) => {
                                                const progressPct = os.totalCaixas > 0 ? Math.round((os.checklistDone! / os.totalCaixas) * 100) : 0;

                                                return (
                                                    <tr
                                                        key={os.id}
                                                        className="border-b dark:border-slate-800 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                                                    >
                                                        <td className="py-3 px-3">
                                                            <Link href={`/os/${os.id}`} className="block w-full h-full">
                                                                <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{os.uf}</span>
                                                            </Link>
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <Link href={`/os/${os.id}`} className="font-mono text-[11px] text-primary group-hover:underline">
                                                                {os.protocolo || '-'}
                                                            </Link>
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <Link href={`/os/${os.id}`} className="block w-full h-full space-y-0.5">
                                                                {os.condominio && (
                                                                    <div className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase truncate max-w-[180px]">
                                                                        {os.condominio}
                                                                    </div>
                                                                )}
                                                                <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                                                                    {os.pop}
                                                                </div>
                                                            </Link>
                                                        </td>
                                                        <td className="py-3 px-3 text-[11px] text-muted-foreground hidden md:table-cell">
                                                            <Link href={`/os/${os.id}`} className="block w-full h-full">
                                                                {os.dataEntrante}
                                                            </Link>
                                                        </td>
                                                        <td className="py-3 px-3 text-[11px] text-muted-foreground hidden md:table-cell">
                                                            <Link href={`/os/${os.id}`} className="block w-full h-full">
                                                                {os.dataPrevExec}
                                                            </Link>
                                                        </td>
                                                        <td className="py-3 px-3 hidden md:table-cell">
                                                            <Link href={`/os/${os.id}`} className="block w-full h-full">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[60px]">
                                                                        <div
                                                                            className={`h-full rounded-full transition-all ${progressPct === 100 ? 'bg-emerald-500' : progressPct > 0 ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                                                            style={{ width: `${progressPct}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                                        {os.checklistDone}/{os.totalCaixas}
                                                                    </span>
                                                                </div>
                                                            </Link>
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <Link href={`/os/${os.id}`} className="block w-full h-full">
                                                                <StatusBadge
                                                                    label={os.executionStatus}
                                                                    showIcon={true}
                                                                    className="scale-90 origin-left"
                                                                />
                                                            </Link>
                                                        </td>
                                                        <td className="py-3 px-3 hidden lg:table-cell max-w-[200px]">
                                                            <Link href={`/os/${os.id}`} className="block w-full h-full">
                                                                <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2 italic" title={os.executionObs || os.observacoes || os.descricao || undefined}>
                                                                    {os.executionObs || os.observacoes || os.descricao || '-'}
                                                                </p>
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="flex md:hidden items-center justify-center gap-2 py-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-muted-foreground bg-slate-50/50 dark:bg-slate-800/20 -mx-6 px-6">
                                <ArrowRight className="h-3 w-3 animate-pulse" />
                                Deslize para ver mais detalhes
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
