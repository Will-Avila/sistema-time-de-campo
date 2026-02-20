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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function BoxesChartsClient({ dailyEvolution, ufData, teamData }: ChartProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 1. Daily Evolution */}
            <Card className="lg:col-span-2 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">Evolução Diária de Caixas Concluídas</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <AreaChart data={dailyEvolution}>
                            <defs>
                                <linearGradient id="colorValueBoxes" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis
                                hide
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                formatter={(value: number) => [value, 'Caixas Realizadas']}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorValueBoxes)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* 2. Boxes by UF */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">Produtividade por UF (Planejado vs Realizado)</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={ufData} layout="vertical" margin={{ left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="uf" type="category" fontSize={12} tickLine={false} axisLine={false} width={40} />
                            <Tooltip formatter={(value: number) => [value, 'Caixas']} />
                            <Legend verticalAlign="top" height={36} />
                            <Bar dataKey="previsto" name="Planejado" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={12} />
                            <Bar dataKey="realizado" name="Realizado" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* 3. Team Ranking */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">Ranking de Equipes (Total de Caixas)</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={teamData} layout="vertical" margin={{ left: 10 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" fontSize={11} tickLine={false} axisLine={false} width={100} />
                            <Tooltip formatter={(value: number) => [value, 'Caixas']} />
                            <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={20}>
                                {teamData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

        </div>
    );
}
