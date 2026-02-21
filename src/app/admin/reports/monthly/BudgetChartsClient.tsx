'use client';

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartProps {
    dailyEvolution: { date: string, value: number }[];
    ufData: { uf: string, previsto: number, realizado: number }[];
    teamData: { name: string, value: number }[];
    funnelData?: { name: string, value: number, color: string }[];
    isMonthly?: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function BudgetChartsClient({ dailyEvolution, ufData, teamData, funnelData, isMonthly }: ChartProps) {
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 1. Daily/Monthly Evolution */}
            <Card className="lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">
                        {isMonthly ? 'Evolução Mensal do Faturamento (Realizado)' : 'Evolução Diária do Faturamento (Realizado)'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <AreaChart data={dailyEvolution}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis
                                hide
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                formatter={(value: number) => [formatCurrency(value), 'Faturado']}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#10b981"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* 2. Budget by UF */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">Orçamento por UF (Previsto vs Realizado)</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={ufData} layout="vertical" margin={{ left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="uf" type="category" fontSize={12} tickLine={false} axisLine={false} width={40} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend verticalAlign="top" height={36} />
                            <Bar dataKey="previsto" name="Previsto" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                            <Bar dataKey="realizado" name="Realizado" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* 3. Funnel Data */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">Funil de Realização (Faturamento)</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px] flex flex-col items-center justify-center">
                    <ResponsiveContainer width="100%" height="80%">
                        <PieChart>
                            <Pie
                                data={funnelData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {funnelData?.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-4 mt-2">
                        {funnelData?.map((item, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs font-semibold">
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-muted-foreground">{item.name}:</span>
                                <span>{formatCurrency(item.value)}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
