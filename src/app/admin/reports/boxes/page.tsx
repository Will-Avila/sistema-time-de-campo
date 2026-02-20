import { HeaderServer } from '@/components/layout/HeaderServer';
import { getBoxesReportData, getAvailableMonths } from '@/actions/reports';
import { BoxesChartsClient } from './BoxesChartsClient';
import { MonthSelector } from '@/components/reports/MonthSelector';
import { TrendingUp, Target, Package, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: { month?: string };
}

export default async function BoxesReportPage({ searchParams }: PageProps) {
    // Determine default month
    const monthsShort = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const nowSP = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const defaultMonth = `${monthsShort[nowSP.getMonth()]}-${nowSP.getFullYear().toString().slice(-2)}`;

    const currentMonth = searchParams.month || defaultMonth;

    const [data, availableMonths] = await Promise.all([
        getBoxesReportData(currentMonth),
        getAvailableMonths()
    ]);

    return (
        <div className="min-h-screen bg-background transition-colors">
            <HeaderServer />

            <div className="container pt-6 pb-8 space-y-8">
                {/* Header */}
                <header>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Produtividade de Caixas</h1>
                        <p className="text-muted-foreground mt-1">
                            Análise de caixas planejadas vs concluídas para <span className="font-bold text-primary">{currentMonth}</span>
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
                    <MonthSelector availableMonths={availableMonths} currentMonth={currentMonth} basePath="/admin/reports/boxes" />
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="bg-card border-none shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <Target className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <CardContent className="p-6">
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Planejado</p>
                            <p className="text-3xl font-bold text-foreground">{data.summary.totalPlanejado}</p>
                            <div className="flex items-center gap-1 mt-2 text-xs font-medium text-muted-foreground">
                                <span>Meta física do mês</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-none shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <Package className="h-12 w-12 text-blue-600" />
                        </div>
                        <CardContent className="p-6">
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Realizado</p>
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{data.summary.totalRealizado}</p>
                            <div className="flex items-center gap-1 mt-2 text-xs font-medium text-blue-500">
                                <TrendingUp className="h-3 w-3" />
                                <span>{data.summary.performance}% da meta física atingida</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Area */}
                <BoxesChartsClient
                    dailyEvolution={data.dailyEvolution}
                    ufData={data.ufData}
                    teamData={data.teamData}
                />
            </div>
        </div>
    );
}
