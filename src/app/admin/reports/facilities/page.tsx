import { getFacilitiesReportData, getAvailableMonths } from '@/actions/reports';
import { HeaderServer } from '@/components/layout/HeaderServer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, TrendingUp, TrendingDown, Target, Calendar, MapPin, CheckCircle2, ArrowLeft } from 'lucide-react';
import { FacilitiesChartsClient } from './FacilitiesChartsClient';
import { MonthSelector } from '@/components/reports/MonthSelector';
import { PeriodSelector } from '@/components/reports/PeriodSelector';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: { month?: string; range?: string };
}

export default async function FacilitiesReportPage({ searchParams }: PageProps) {
    // Determine default month
    const monthsShort = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const nowSP = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const defaultMonth = `${monthsShort[nowSP.getMonth()]}-${nowSP.getFullYear().toString().slice(-2)}`;

    const currentMonth = searchParams.month || defaultMonth;
    const currentRange = parseInt(searchParams.range || '1');

    const [data, availableMonths] = await Promise.all([
        getFacilitiesReportData(currentMonth, currentRange),
        getAvailableMonths()
    ]);

    const isAggregate = currentRange > 1;
    const title = isAggregate ? 'Produtividade de Período (Infra)' : 'Produtividade de Facilidades';
    const periodLabel = isAggregate
        ? `Últimos ${currentRange} meses até ${currentMonth}`
        : `Mês de ${currentMonth}`;

    return (
        <div className="min-h-screen bg-background">
            <HeaderServer />

            <div className="container pt-6 pb-8 space-y-8">
                {/* Header */}
                <header>
                    <Link
                        href="/admin/dashboard"
                        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mb-3 group w-fit"
                    >
                        <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
                        Voltar ao painel
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">{title}</h1>
                            <p className="text-muted-foreground mt-1">
                                Análise de infraestrutura planejada vs concluída para <span className="font-bold text-amber-600">{periodLabel}</span>
                            </p>
                        </div>
                        <div className="grid grid-cols-2 md:flex md:items-center gap-2 md:gap-3 w-full md:w-auto">
                            <PeriodSelector
                                currentPeriod={currentRange.toString()}
                                basePath="/admin/reports/facilities"
                                maxAvailableMonths={availableMonths.length}
                            />
                            <MonthSelector
                                currentMonth={currentMonth}
                                availableMonths={availableMonths}
                                basePath="/admin/reports/facilities"
                            />
                        </div>
                    </div>
                </header>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-card border-none shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <Target className="h-12 w-12 text-blue-600" />
                        </div>
                        <CardContent className="p-6">
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Planejado</p>
                            <div className="text-3xl font-bold text-foreground">
                                {data.summary.totalPlanejado}
                            </div>
                            <div className="flex items-center gap-1 mt-2 text-xs font-medium text-muted-foreground">
                                <span>Infraestrutura prevista no período</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-none shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <Wrench className="h-12 w-12 text-amber-600" />
                        </div>
                        <CardContent className="p-6">
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Realizado</p>
                            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                                {data.summary.totalRealizado}
                            </div>
                            <div className="flex items-center gap-1 mt-2 text-xs font-medium text-amber-600">
                                <TrendingUp className="h-3 w-3" />
                                <span>{data.summary.performance}% da meta de infra atingida</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-none shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <TrendingDown className="h-12 w-12 text-orange-600" />
                        </div>
                        <CardContent className="p-6">
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Sem execução</p>
                            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                                {data.summary.totalCancelado}
                            </div>
                            <div className="flex items-center gap-1 mt-2 text-xs font-medium text-orange-500">
                                <span>Facilidades em OSs canceladas</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Area */}
                <FacilitiesChartsClient
                    dailyEvolution={data.dailyEvolution}
                    ufData={data.ufData}
                    teamData={data.teamData}
                    funnelData={data.funnelData}
                    isMonthly={currentRange > 1}
                />
            </div>
        </div>
    );
}
