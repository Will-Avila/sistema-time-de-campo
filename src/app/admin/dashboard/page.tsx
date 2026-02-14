import { getDashboardData } from '@/actions/dashboard';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    LayoutDashboard, CheckCircle, Clock, Users, TrendingUp,
    Activity, ArrowRight, AlertTriangle, Bell, Wrench, MapPin
} from 'lucide-react';
import { HeaderServer } from '@/components/layout/HeaderServer';
import { ExcelUploadButton } from '@/components/ExcelUploadButton';
import { SyncDataButton } from '@/components/SyncDataButton';
import { StatusBadge } from '@/components/os/StatusBadge';

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

export default async function DashboardPage() {
    const data = await getDashboardData();

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
                        <Link href="/os" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 h-9 px-4 transition-colors shadow-sm whitespace-nowrap">
                            <Wrench className="h-4 w-4 shrink-0" />
                            Ordens de Serviço
                        </Link>
                        <Link href="/admin/equipes" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 transition-colors shadow-sm whitespace-nowrap">
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

                    {/* Concluídas esse mês */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.stats.completedMonth}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Concluídas esse mês</p>
                    </div>

                    {/* Em Progresso */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-lg bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center">
                                <Activity className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{data.stats.inProgress}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Em Progresso</p>
                    </div>

                    {/* Pendentes */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center">
                                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.stats.pending}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Pendentes</p>
                    </div>

                    {/* Taxa de Conclusão */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-primary" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{data.stats.completionRate}%</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Conclusão</p>
                    </div>
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
                                    {data.activityFeed.map((item: any) => (
                                        <div key={item.id} className="flex gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${item.type === 'OS_CLOSE' ? 'bg-blue-500' : 'bg-amber-500'}`} />
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
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* UF Breakdown */}
                    <Card className="lg:col-span-1 dark:bg-slate-900 dark:border-slate-800 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 dark:text-white">
                                <MapPin className="h-4 w-4 text-violet-500" />
                                Distribuição por UF
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {data.ufBreakdown.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Nenhuma OS registrada</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[320px] overflow-y-auto">
                                    {data.ufBreakdown.map((uf: any) => {
                                        const pct = Math.round((uf.total / data.stats.total) * 100);
                                        return (
                                            <div key={uf.uf} className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 w-8">{uf.uf}</span>
                                                        <span className="text-xs text-muted-foreground">{uf.total} OS</span>
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-500">{pct}%</span>
                                                </div>
                                                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Technician Performance */}
                    <Card className="lg:col-span-1 dark:bg-slate-900 dark:border-slate-800 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 dark:text-white">
                                <Users className="h-4 w-4 text-blue-500" />
                                Desempenho das Equipes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {data.techPerformance.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Nenhuma atividade registrada</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[320px] overflow-y-auto">
                                    {data.techPerformance.map((tech: any, i: number) => (
                                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0 shadow-sm">
                                                {tech.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{tech.name}</p>
                                                <div className="flex gap-3 mt-0.5">
                                                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                        {tech.completed} encerradas
                                                    </span>
                                                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                                                        {tech.checklistItems} caixas
                                                    </span>
                                                </div>
                                            </div>
                                            {i === 0 && data.techPerformance.length > 1 && (
                                                <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                                                    Top
                                                </span>
                                            )}
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
                                                <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Protocolo</th>
                                                <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">POP</th>
                                                <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider hidden sm:table-cell">UF</th>
                                                <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Prazo</th>
                                                <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Caixas</th>
                                                <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Responsável</th>
                                                <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.osList.slice(0, 25).map((os: any) => {
                                                const progressPct = os.totalCaixas > 0 ? Math.round((os.checklistDone / os.totalCaixas) * 100) : 0;
                                                return (
                                                    <tr key={os.id} className="border-b dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="py-3 px-3">
                                                            <Link href={`/os/${os.id}`} className="font-mono text-xs text-primary hover:underline">
                                                                {os.protocolo || '-'}
                                                            </Link>
                                                        </td>
                                                        <td className="py-3 px-3 text-sm dark:text-slate-300">{os.pop}</td>
                                                        <td className="py-3 px-3 dark:text-slate-300 hidden sm:table-cell">
                                                            <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{os.uf}</span>
                                                        </td>
                                                        <td className="py-3 px-3 text-xs text-muted-foreground hidden md:table-cell">{os.dataPrevExec}</td>
                                                        <td className="py-3 px-3 hidden md:table-cell">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[60px]">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all ${progressPct === 100 ? 'bg-emerald-500' : progressPct > 0 ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                                                        style={{ width: `${progressPct}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                                                    {os.checklistDone}/{os.totalCaixas}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3 text-xs dark:text-slate-300 hidden lg:table-cell">{os.technicianName}</td>
                                                        <td className="py-3 px-3">
                                                            <StatusBadge
                                                                label={os.status === 'DONE' ? 'Concluída' : (os.checklistDone > 0 ? 'Em execução' : 'Pendente')}
                                                                showIcon={false}
                                                            />
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
