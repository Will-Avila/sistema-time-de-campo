import { HeaderServer } from '@/components/layout/HeaderServer';
import { getMonthlyReportData, getAvailableMonths } from '@/actions/reports';
import { BudgetChartsClient } from './BudgetChartsClient';
import { MonthSelector } from '@/components/reports/MonthSelector';
import { TrendingUp, TrendingDown, Target, Landmark, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: { month?: string };
}

export default async function MonthlyReportPage({ searchParams }: PageProps) {
    // Determine default month
    const monthsShort = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const nowSP = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const defaultMonth = `${monthsShort[nowSP.getMonth()]}-${nowSP.getFullYear().toString().slice(-2)}`;

    const currentMonth = searchParams.month || defaultMonth;

    const [data, availableMonths] = await Promise.all([
        getMonthlyReportData(currentMonth),
        getAvailableMonths()
    ]);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    return (
        <div className="min-h-screen bg-background transition-colors">
            <HeaderServer />

            <div className="container pt-6 pb-8 space-y-8">
                {/* Header */}
                <header>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Relatório Mensal</h1>
                        <p className="text-muted-foreground mt-1">
                            Desempenho financeiro e análise de orçamento para <span className="font-bold text-primary">{currentMonth}</span>
                        </p>
                    </div>
                </header>

                <div className="flex items-center justify-between gap-4">
                    <Link
                        href="/admin/dashboard"
                        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors bg-card px-3 py-1.5 rounded-lg border border-border shadow-sm"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar para Dashboard
                    </Link>
                    <MonthSelector availableMonths={availableMonths} currentMonth={currentMonth} basePath="/admin/reports/monthly" />
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-card border-none shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <Target className="h-12 w-12 text-blue-600" />
                        </div>
                        <CardContent className="p-6">
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Previsto</p>
                            <p className="text-3xl font-bold text-foreground">{formatCurrency(data.summary.totalPrevisto)}</p>
                            <div className="flex items-center gap-1 mt-2 text-xs font-medium text-muted-foreground">
                                <span>Meta de faturamento do mês</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-none shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <Landmark className="h-12 w-12 text-emerald-600" />
                        </div>
                        <CardContent className="p-6">
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Valor Realizado</p>
                            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(data.summary.totalRealizado)}</p>
                            <div className="flex items-center gap-1 mt-2 text-xs font-medium text-emerald-500">
                                <TrendingUp className="h-3 w-3" />
                                <span>{data.summary.performance}% da meta atingida</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-none shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <TrendingDown className="h-12 w-12 text-orange-600" />
                        </div>
                        <CardContent className="p-6">
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Sem execução</p>
                            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(data.summary.totalCancelado)}</p>
                            <div className="flex items-center gap-1 mt-2 text-xs font-medium text-orange-500">
                                <span>Valor total de OS canceladas</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Area */}
                <BudgetChartsClient
                    dailyEvolution={data.dailyEvolution}
                    ufData={data.ufData}
                    teamData={data.teamData}
                />
            </div>
        </div>
    );
}
