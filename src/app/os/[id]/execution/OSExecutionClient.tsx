'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Box, CheckCircle2, AlertCircle, Circle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import CaixaItem from '../CaixaItem';
import { CaixaItemData } from '@/lib/types';
import { Session } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import MaterialManager from '../MaterialManager';
import { getOSStatusInfo } from '@/lib/utils';

interface OSExecutionClientProps {
    osId: string;
    protocolo: string;
    items: CaixaItemData[];
    equipeName?: string;
    session: Session | null;
    osStatus: string;
    execution: any;
}

export default function OSExecutionClient({
    osId,
    protocolo,
    items,
    equipeName,
    session,
    osStatus,
    execution
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

    const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const totalMarked = stats.done + stats.pending;
    const prevMarkedRef = useRef(totalMarked);
    const isInitialMount = useRef(true);

    const { label: displayStatus } = getOSStatusInfo({ osStatus, execution });
    const isClosed = displayStatus.includes('Concluída') || displayStatus.includes('Encerrada') || displayStatus.includes('Cancelada');

    useEffect(() => {
        // Trigger if total of marked items (DONE or PENDING) reached total items
        // AND if it's not already closed
        if (!isInitialMount.current && prevMarkedRef.current < stats.total && totalMarked === stats.total && !isClosed) {
            setIsPromptOpen(true);
        }

        prevMarkedRef.current = totalMarked;
        isInitialMount.current = false;
    }, [totalMarked, stats.total, isClosed]);

    return (
        <div className="space-y-6">
            <ConfirmModal
                open={isPromptOpen}
                title="Checklist Finalizado!"
                message="Todas as caixas foram marcadas. Gostaria de realizar o encerramento da OS agora?"
                confirmLabel="Sim, encerrar OS"
                cancelLabel="Agora não"
                onConfirm={() => {
                    setIsPromptOpen(false);
                    setIsClosureModalOpen(true);
                }}
                onCancel={() => setIsPromptOpen(false)}
            />

            {!isClosed && (
                <MaterialManager
                    osId={osId}
                    session={session}
                />
            )}

            {/* Progress Section */}
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Box className="h-5 w-5 text-[#4da8bc]" />
                        <h2 className="font-bold text-foreground">Progresso da Execução</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {totalMarked} / {stats.total}
                        </span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
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
                        <span className="text-muted-foreground">{stats.done} Concluídas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                        <span className="text-muted-foreground">{stats.pending} Pendentes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-muted" />
                        <span className="text-muted-foreground">{stats.untouched} A fazer</span>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                    <Input
                        placeholder="Buscar caixa (ex: FLA21-0123)..."
                        className="pl-10 h-11 bg-muted border-border shadow-sm rounded-xl ring-1 ring-border focus-visible:ring-blue-500 focus-visible:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                            Limpar
                        </button>
                    )}
                </div>
            </div>

            {/* Caixa List */}
            <div className="pb-10 space-y-4">
                {filteredItems.length === 0 ? (
                    <div className="bg-card rounded-xl border border-dashed border-border p-10 text-center">
                        <div className="bg-muted h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="font-bold text-foreground mb-1">Nenhuma caixa encontrada</h3>
                        <p className="text-muted-foreground text-sm">Tente ajustar sua busca ou limpar o filtro.</p>
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
