import { getFacilitiesReportData, getAvailableMonths } from '@/actions/reports';
import { HeaderServer } from '@/components/layout/HeaderServer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, TrendingUp, Calendar, MapPin, CheckCircle2, ArrowLeft } from 'lucide-react';
import { FacilitiesChartsClient } from './FacilitiesChartsClient';
import { MonthSelector } from './MonthSelector';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface PageProps {
    searchParams: { month?: string };
}

export default async function FacilitiesReportPage({ searchParams }: PageProps) {
    const availableMonths = await getAvailableMonths();
    const currentMonth = searchParams.month || availableMonths[0] || '';
    const data = await getFacilitiesReportData(currentMonth);

    return (
        <div className="min-h-screen bg-background">
            <HeaderServer />

            <div className="container pt-6 pb-8 space-y-8">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Produtividade de Facilidades</h1>
                        <p className="text-muted-foreground mt-1">
                            Análise de infraestrutura planejada vs concluída para <span className="font-bold text-amber-600">{currentMonth}</span>
                        </p>
                    </div>
                    <MonthSelector availableMonths={availableMonths} currentMonth={currentMonth} />
                </header>

                <div>
                    <Link
                        href="/admin/dashboard"
                        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors bg-card px-3 py-1.5 rounded-lg border border-border shadow-sm"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar para Dashboard
                    </Link>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="bg-card border-none shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-muted-foreground" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Total Planejado
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-foreground">
                                {data.summary.totalPlanejado}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Facilidades previstas no mês</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-none shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Total Realizado
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                                {data.summary.totalRealizado}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Facilidades de OS concluídas</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-none shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Desempenho
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-600">
                                {data.summary.performance}%
                            </div>
                            <div className="flex items-center gap-1 mt-2 text-xs font-medium text-blue-500">
                                <TrendingUp className="h-3 w-3" />
                                <span>{data.summary.performance}% da meta de infra atingida</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Area */}
                <FacilitiesChartsClient
                    dailyEvolution={data.dailyEvolution}
                    ufData={data.ufData}
                    teamData={data.teamData}
                />
            </div>
        </div>
    );
}
