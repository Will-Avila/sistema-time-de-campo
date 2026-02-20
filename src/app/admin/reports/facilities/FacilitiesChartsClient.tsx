'use client';

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartProps {
    dailyEvolution: { date: string, value: number }[];
    ufData: { uf: string, previsto: number, realizado: number }[];
    teamData: { name: string, value: number }[];
}

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'];

export function FacilitiesChartsClient({ dailyEvolution, ufData, teamData }: ChartProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 1. Daily Evolution */}
            <Card className="lg:col-span-2 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">Evolução Diária de Facilidades (Entregas)</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <AreaChart data={dailyEvolution}>
                            <defs>
                                <linearGradient id="colorValueFacs" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis
                                hide
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                formatter={(value: number) => [value, 'Facilidades Realizadas']}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorValueFacs)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* 2. Facilities by UF */}
            <Card className="lg:col-span-2 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">Distribuição por UF (Planejado vs Realizado)</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={ufData} layout="vertical" margin={{ left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="uf" type="category" fontSize={12} tickLine={false} axisLine={false} width={40} />
                            <Tooltip formatter={(value: number) => [value, 'Facilidades']} />
                            <Legend verticalAlign="top" height={36} />
                            <Bar dataKey="previsto" name="Planejado" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={12} />
                            <Bar dataKey="realizado" name="Realizado" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

        </div>
    );
}
