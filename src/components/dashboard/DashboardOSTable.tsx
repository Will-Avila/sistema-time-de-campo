'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, Wrench, ArrowRight, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/os/StatusBadge';
import { EnrichedOS } from '@/lib/types';

interface DashboardOSTableProps {
    initialOSList: EnrichedOS[];
}

export function DashboardOSTable({ initialOSList }: DashboardOSTableProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUF, setSelectedUF] = useState('Todos');
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['Todas']);
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState<'dataEntrante' | 'dataPrevExec' | 'dataConclusao'>('dataEntrante');
    const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
    const ITEMS_PER_PAGE = 50;

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedUF, selectedStatuses]);

    // Filter Logic
    const filteredList = initialOSList.filter(os => {
        const matchesUF = selectedUF === 'Todos' || os.uf === selectedUF;

        const searchUpper = searchTerm.toUpperCase().trim();
        const matchesSearch = searchUpper === '' ||
            (os.protocolo || '').toUpperCase().includes(searchUpper) ||
            (os.pop || '').toUpperCase().includes(searchUpper) ||
            (os.condominio || '').toUpperCase().includes(searchUpper);

        const execStatus = (os.executionStatus || '').toUpperCase().trim();
        let matchesStatus = true;

        if (!selectedStatuses.includes('Todas')) {
            let matchesAny = false;
            for (const status of selectedStatuses) {
                if (status === 'Concluída') {
                    if (execStatus.includes('CONCLUÍD') || execStatus.includes('CONCLUID')) matchesAny = true;
                } else if (status === 'Em execução') {
                    if (execStatus === 'EM EXECUÇÃO' || execStatus === 'EM EXECUCAO') matchesAny = true;
                } else if (status === 'Iniciar') {
                    if (execStatus === 'PENDENTE' || execStatus === 'INICIAR' || execStatus === '') matchesAny = true;
                } else if (status === 'Cancelada') {
                    if (execStatus.includes('CANCELAD') || execStatus.includes('SEM EXECUÇ') || execStatus.includes('SEM EXECUC')) matchesAny = true;
                }
            }
            matchesStatus = matchesAny;
        }

        return matchesUF && matchesSearch && matchesStatus;
    });
    const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE);

    // Sort logic
    const sortedList = [...filteredList].sort((a, b) => {
        const parseDate = (d?: string) => {
            if (!d || d === '-' || d === 'N/A' || d === '') {
                // Return extreme values to keep empty dates at the bottom or top depending on direction
                return sortDirection === 'asc' ? 8640000000000000 : 0;
            }
            const [day, month, year] = d.split('/').map(Number);
            return new Date(year, month - 1, day).getTime();
        };

        const dateA = parseDate(a[sortField]);
        const dateB = parseDate(b[sortField]);

        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    });

    const paginatedList = sortedList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const ufs = ['Todos', ...Array.from(new Set(initialOSList.map(os => os.uf).filter(Boolean))).sort()];
    const statuses = ['Todas', 'Iniciar', 'Em execução', 'Concluída', 'Cancelada'];

    return (
        <div className="space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-3 flex-1 group">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <Input
                            placeholder="Buscar por protocolo, POP ou condomínio..."
                            className="pl-9 h-10 w-full bg-background border-border focus:ring-primary/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-2 md:flex gap-3 items-center">
                    <div className="relative w-full md:w-36">
                        <select
                            value={selectedUF}
                            onChange={(e) => setSelectedUF(e.target.value)}
                            className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all cursor-pointer hover:bg-accent hover:text-accent-foreground"
                        >
                            {ufs.map(uf => (
                                <option key={uf} value={uf}>{uf === 'Todos' ? 'Todas UFs' : uf}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                            <Filter className="h-3 w-3" />
                        </div>
                    </div>

                    <div className="relative w-full md:w-48">
                        <button
                            type="button"
                            onClick={() => setIsStatusOpen(!isStatusOpen)}
                            className="h-10 w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all cursor-pointer hover:bg-accent hover:text-accent-foreground"
                        >
                            <span className="truncate">
                                {selectedStatuses.includes('Todas') ? 'Todos Status' : selectedStatuses.join(', ')}
                            </span>
                            <Filter className="h-3 w-3 text-muted-foreground shrink-0 ml-2" />
                        </button>

                        {isStatusOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsStatusOpen(false)}
                                />
                                <div className="absolute top-12 left-0 right-0 z-20 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top p-1">
                                    <div className="max-h-60 overflow-y-auto space-y-0.5">
                                        {statuses.map(s => {
                                            const isChecked = selectedStatuses.includes(s);
                                            return (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => {
                                                        if (s === 'Todas') {
                                                            setSelectedStatuses(['Todas']);
                                                        } else {
                                                            let newSelection = selectedStatuses.filter(item => item !== 'Todas');
                                                            if (isChecked) {
                                                                newSelection = newSelection.filter(item => item !== s);
                                                                if (newSelection.length === 0) newSelection = ['Todas'];
                                                            } else {
                                                                newSelection.push(s);
                                                                if (newSelection.length === statuses.length - 1) newSelection = ['Todas'];
                                                            }
                                                            setSelectedStatuses(newSelection);
                                                        }
                                                    }}
                                                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors ${isChecked ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isChecked ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                                                        {isChecked && (
                                                            <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    {s}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Advanced Sorting Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/30 p-3 rounded-lg border border-border/50">
                <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap">Ordenar por:</span>
                    <div className="relative w-36 xs:w-44">
                        <select
                            value={sortField}
                            onChange={(e) => setSortField(e.target.value as any)}
                            className="h-8 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-7 py-0 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all cursor-pointer hover:bg-accent"
                        >
                            <option value="dataEntrante">Data de Entrada</option>
                            <option value="dataPrevExec">Prazo (Prev. Execução)</option>
                            <option value="dataConclusao">Finalização (Concluída)</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                            <Filter className="h-2.5 w-2.5" />
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                        onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                        title={sortDirection === 'asc' ? 'Ordem Crescente' : 'Ordem Decrescente'}
                    >
                        {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                    </Button>
                </div>

                <div className="hidden md:flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-background rounded border border-border/50">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {filteredList.length} registros encontrados
                    </div>
                </div>
            </div>

            <div className="relative">
                {/* Scrollable Table Container */}
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 pb-4">
                    <div className="min-w-[1100px]">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/50">
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-foreground/80 uppercase tracking-wider">UF</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-foreground/80 uppercase tracking-wider">OS</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-foreground/80 uppercase tracking-wider">Condomínio / POP</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-foreground/80 uppercase tracking-wider">Entrada</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-foreground/80 uppercase tracking-wider">Prazo</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-foreground/80 uppercase tracking-wider">Finalização</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-foreground/80 uppercase tracking-wider">Caixas</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-foreground/80 uppercase tracking-wider">Status</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-foreground/80 uppercase tracking-wider">Cenário</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-foreground/80 uppercase tracking-wider">Observações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedList.map((os: EnrichedOS) => {
                                    const progressPct = os.totalCaixas > 0 ? Math.round((os.checklistDone! / os.totalCaixas) * 100) : 0;

                                    return (
                                        <tr
                                            key={os.id}
                                            className="border-b border-border/40 hover:bg-muted/30 even:bg-muted/10 transition-colors cursor-pointer group"
                                        >
                                            <td className="py-3 px-4">
                                                <Link href={`/os/${os.id}`} className="block w-full h-full">
                                                    <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground">{os.uf}</span>
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4">
                                                <Link href={`/os/${os.id}`} className="font-mono text-[11px] text-primary font-bold hover:underline decoration-primary/80 underline-offset-4 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                                                    {os.protocolo || '-'}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4">
                                                <Link href={`/os/${os.id}`} className="block w-full h-full space-y-0.5">
                                                    {os.condominio && (
                                                        <div className="text-[10px] font-bold text-foreground uppercase truncate max-w-[180px]">
                                                            {os.condominio}
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                                                        {os.pop}
                                                    </div>
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4 text-[11px] text-muted-foreground">
                                                <Link href={`/os/${os.id}`} className="block w-full h-full">
                                                    {os.dataEntrante}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4 text-[11px] text-muted-foreground">
                                                <Link href={`/os/${os.id}`} className="block w-full h-full">
                                                    {os.dataPrevExec}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4 text-[11px]">
                                                <Link href={`/os/${os.id}`} className={`block w-full h-full font-medium ${os.dataConclusao && os.dataConclusao !== '-' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                                    {os.dataConclusao || '-'}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4">
                                                <Link href={`/os/${os.id}`} className="block w-full h-full">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[60px]">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${progressPct === 100 ? 'bg-emerald-500' : progressPct > 0 ? 'bg-blue-500' : 'bg-muted-foreground/30'}`}
                                                                style={{ width: `${progressPct}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">
                                                            {os.checklistDone}/{os.totalCaixas}
                                                        </span>
                                                    </div>
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4">
                                                <Link href={`/os/${os.id}`} className="block w-full h-full">
                                                    <StatusBadge
                                                        label={os.executionStatus}
                                                        showIcon={true}
                                                        className="scale-90 origin-left shadow-none"
                                                    />
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4">
                                                <Link href={`/os/${os.id}`} className="block w-full h-full">
                                                    <div className="text-[10px] font-bold px-2 py-0.5 rounded w-fit bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                                                        {os.tipoOs || '-'}
                                                    </div>
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4 max-w-[250px]">
                                                <Link href={`/os/${os.id}`} className="block w-full h-full">
                                                    <p className="text-[10px] text-muted-foreground line-clamp-2" title={os.executionObs || os.observacoes || os.descricao || undefined}>
                                                        {os.executionObs || os.observacoes || os.descricao || '-'}
                                                    </p>
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {paginatedList.length === 0 && (
                    <div className="py-16 text-center text-muted-foreground bg-card border border-border rounded-xl border-dashed">
                        <div className="flex flex-col items-center gap-2">
                            <Search className="h-8 w-8 opacity-20" />
                            <p>Nenhuma ordem encontrada com os filtros selecionados.</p>
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedUF('Todos');
                                    setSelectedStatuses(['Todas']);
                                }}
                                className="text-xs text-primary font-semibold hover:underline mt-1"
                            >
                                Limpar filtros
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-border">
                    <div className="text-xs text-muted-foreground">
                        Mostrando <span className="font-medium text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> a <span className="font-medium text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, filteredList.length)}</span> de <span className="font-medium text-foreground">{filteredList.length}</span> ordens
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-1 px-2">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) pageNum = i + 1;
                                else if (currentPage <= 3) pageNum = i + 1;
                                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                else pageNum = currentPage - 2 + i;

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-md text-xs font-medium transition-all ${currentPage === pageNum ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
