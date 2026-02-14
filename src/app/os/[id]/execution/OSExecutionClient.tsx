'use client';

import { useState, useMemo } from 'react';
import { Search, Box, CheckCircle2, AlertCircle, Circle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import CaixaItem from '../CaixaItem';
import { CaixaItemData } from '@/lib/types';
import { Session } from '@/lib/auth';

interface OSExecutionClientProps {
    osId: string;
    protocolo: string;
    items: CaixaItemData[];
    equipeName?: string;
    session: Session | null;
}

export default function OSExecutionClient({
    osId,
    protocolo,
    items,
    equipeName,
    session
}: OSExecutionClientProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const enrichedItems = useMemo(() => {
        return items.map(item => {
            const itemId = String(item.id || item.cto);

            // Logic must match CaixaItem's initialStatus logic
            let executionStatus: 'DONE' | 'PENDING' | 'UNTOUCHED' = 'UNTOUCHED';
            if (item.done || item.status === 'OK') {
                executionStatus = 'DONE';
            } else if (item.status === 'NOK') {
                executionStatus = 'PENDING';
            }

            return {
                ...item,
                itemId,
                executionStatus
            };
        });
    }, [items]);

    const stats = useMemo(() => {
        const total = enrichedItems.length;
        const done = enrichedItems.filter(i => i.executionStatus === 'DONE').length;
        const pending = enrichedItems.filter(i => i.executionStatus === 'PENDING').length;
        const untouched = total - done - pending;

        return {
            total,
            done,
            pending,
            untouched,
            donePct: total > 0 ? (done / total) * 100 : 0,
            pendingPct: total > 0 ? (pending / total) * 100 : 0,
            untouchedPct: total > 0 ? (untouched / total) * 100 : 0,
        };
    }, [enrichedItems]);

    const filteredItems = useMemo(() => {
        if (!searchTerm) return enrichedItems;
        const lowerSearch = searchTerm.toLowerCase();
        return enrichedItems.filter(item =>
            item.cto.toLowerCase().includes(lowerSearch) ||
            (item.chassiPath && item.chassiPath.toLowerCase().includes(lowerSearch))
        );
    }, [enrichedItems, searchTerm]);

    return (
        <div className="space-y-6">
            {/* Progress Section */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Box className="h-5 w-5 text-blue-500" />
                        <h2 className="font-bold text-slate-800 dark:text-slate-100">Progresso da Execução</h2>
                    </div>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {stats.done} / {stats.total} concluídas
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                        className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                        style={{ width: `${stats.donePct}%` }}
                        title={`Concluídas: ${stats.done}`}
                    />
                    <div
                        className="h-full bg-rose-500 transition-all duration-500 ease-out"
                        style={{ width: `${stats.pendingPct}%` }}
                        title={`Pendentes: ${stats.pending}`}
                    />
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-4 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span className="text-slate-600 dark:text-slate-400">{stats.done} Concluídas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                        <span className="text-slate-600 dark:text-slate-400">{stats.pending} Pendentes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                        <span className="text-slate-600 dark:text-slate-400">{stats.untouched} A fazer</span>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                        placeholder="Buscar caixa (ex: FLA21-0123)..."
                        className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                            Limpar
                        </button>
                    )}
                </div>
            </div>

            {/* Caixa List */}
            <div className="pb-10 space-y-4">
                {filteredItems.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-10 text-center">
                        <div className="bg-slate-50 dark:bg-slate-800 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search className="h-6 w-6 text-slate-400" />
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">Nenhuma caixa encontrada</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Tente ajustar sua busca ou limpar o filtro.</p>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="mt-4 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                Ver todas as {stats.total} caixas
                            </button>
                        )}
                    </div>
                ) : (
                    filteredItems.map((item, idx) => (
                        <CaixaItem
                            key={item.itemId}
                            item={{ ...item, id: item.itemId }}
                            osId={osId}
                            equipeName={equipeName}
                            session={session}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
