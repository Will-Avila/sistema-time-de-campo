'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, Wrench, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
    const [selectedMedicaoStatuses, setSelectedMedicaoStatuses] = useState<string[]>(['Todas']);
    const [isMedicaoOpen, setIsMedicaoOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedUF, selectedStatuses, selectedMedicaoStatuses]);

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

        let matchesMedicao = true;
        if (!selectedMedicaoStatuses.includes('Todas')) {
            matchesMedicao = selectedMedicaoStatuses.includes(os.statusMedicao || 'Vazio');
        }

        return matchesUF && matchesSearch && matchesStatus && matchesMedicao;
    });

    const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE);

    // Sort logic
    const sortedList = [...filteredList].sort((a, b) => {
        const parseDate = (d: string) => {
            if (!d || d === '-') return new Date(8640000000000000).getTime();
            const [day, month, year] = d.split('/').map(Number);
            return new Date(year, month - 1, day).getTime();
        };
        return parseDate(a.dataPrevExec) - parseDate(b.dataPrevExec);
    });

    const paginatedList = sortedList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const ufs = ['Todos', ...Array.from(new Set(initialOSList.map(os => os.uf).filter(Boolean))).sort()];
    const statuses = ['Todas', 'Iniciar', 'Em execução', 'Concluída', 'Cancelada'];
    const medicaoStatuses = ['Todas', ...Array.from(new Set(initialOSList.map(os => os.statusMedicao || 'Vazio'))).sort()];

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-center bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-200 dark:border-slate-800 relative z-30">
                <div className="shrink-0 flex items-center gap-2">
                    <Badge variant="secondary" className="px-2 py-0.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-sm animate-in fade-in zoom-in duration-300">
                        {filteredList.length}
                    </Badge>
                </div>
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Buscar protocolo, POP ou condomínio..."
                        className="pl-9 h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-40">
                        <select
                            value={selectedUF}
                            onChange={(e) => setSelectedUF(e.target.value)}
                            className="h-10 w-full appearance-none rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                        >
                            {ufs.map(uf => (
                                <option key={uf} value={uf}>{uf === 'Todos' ? 'Todas UFs' : uf}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                            <Filter className="h-3 w-3" />
                        </div>
                    </div>
                    <div className="relative flex-1 md:w-56">
                        <button
                            type="button"
                            onClick={() => setIsStatusOpen(!isStatusOpen)}
                            className="h-10 w-full flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer overflow-hidden"
                        >
                            <span className="truncate">
                                {selectedStatuses.includes('Todas') ? 'Todos Status' : selectedStatuses.join(', ')}
                            </span>
                            <Filter className="h-3 w-3 text-slate-400 shrink-0 ml-2" />
                        </button>

                        {isStatusOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsStatusOpen(false)}
                                />
                                <div className="absolute top-11 left-0 right-0 z-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg overflow-hidden animate-in fade-in zoom-in duration-100 origin-top">
                                    <div className="max-h-60 overflow-y-auto p-1">
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
                                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm transition-colors ${isChecked ? 'bg-primary/5 text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                                >
                                                    <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-all ${isChecked ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600'}`}>
                                                        {isChecked && (
                                                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
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

                    <div className="relative flex-1 md:w-56">
                        <button
                            type="button"
                            onClick={() => setIsMedicaoOpen(!isMedicaoOpen)}
                            className="h-10 w-full flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer overflow-hidden"
                        >
                            <span className="truncate">
                                {selectedMedicaoStatuses.includes('Todas') ? 'Todas Medições' : selectedMedicaoStatuses.join(', ')}
                            </span>
                            <Filter className="h-3 w-3 text-slate-400 shrink-0 ml-2" />
                        </button>

                        {isMedicaoOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsMedicaoOpen(false)}
                                />
                                <div className="absolute top-11 left-0 right-0 z-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg overflow-hidden animate-in fade-in zoom-in duration-100 origin-top">
                                    <div className="max-h-60 overflow-y-auto p-1">
                                        {medicaoStatuses.map(s => {
                                            const isChecked = selectedMedicaoStatuses.includes(s);
                                            return (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => {
                                                        if (s === 'Todas') {
                                                            setSelectedMedicaoStatuses(['Todas']);
                                                        } else {
                                                            let newSelection = selectedMedicaoStatuses.filter(item => item !== 'Todas');
                                                            if (isChecked) {
                                                                newSelection = newSelection.filter(item => item !== s);
                                                                if (newSelection.length === 0) newSelection = ['Todas'];
                                                            } else {
                                                                newSelection.push(s);
                                                                if (newSelection.length === medicaoStatuses.length - 1) newSelection = ['Todas'];
                                                            }
                                                            setSelectedMedicaoStatuses(newSelection);
                                                        }
                                                    }}
                                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm transition-colors ${isChecked ? 'bg-primary/5 text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                                >
                                                    <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-all ${isChecked ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600'}`}>
                                                        {isChecked && (
                                                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
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

            <div className="relative">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 pb-2">
                    <div className="min-w-[800px]">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b dark:border-slate-700">
                                    <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">UF</th>
                                    <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">OS</th>
                                    <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Condomínio / POP</th>
                                    <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Entrada</th>
                                    <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Prazo</th>
                                    <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Finalização</th>
                                    <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Caixas</th>
                                    <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                                    <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Medição</th>
                                    <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Observações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedList.map((os: EnrichedOS) => {
                                    const progressPct = os.totalCaixas > 0 ? Math.round((os.checklistDone! / os.totalCaixas) * 100) : 0;

                                    return (
                                        <tr
                                            key={os.id}
                                            className="border-b dark:border-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 bg-white dark:bg-slate-900 even:bg-slate-200 dark:even:bg-slate-800 transition-colors cursor-pointer group"
                                        >
                                            <td className="py-3 px-3">
                                                <Link href={`/os/${os.id}`} className="block w-full h-full">
                                                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{os.uf}</span>
                                                </Link>
                                            </td>
                                            <td className="py-3 px-3">
                                                <Link href={`/os/${os.id}`} className="font-mono text-[11px] text-primary group-hover:underline">
                                                    {os.protocolo || '-'}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-3">
                                                <Link href={`/os/${os.id}`} className="block w-full h-full space-y-0.5">
                                                    {os.condominio && (
                                                        <div className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase truncate max-w-[180px]">
                                                            {os.condominio}
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                                                        {os.pop}
                                                    </div>
                                                </Link>
                                            </td>
                                            <td className="py-3 px-3 text-[11px] text-muted-foreground hidden md:table-cell">
                                                <Link href={`/os/${os.id}`} className="block w-full h-full">
                                                    {os.dataEntrante}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-3 text-[11px] text-muted-foreground hidden md:table-cell">
                                                <Link href={`/os/${os.id}`} className="block w-full h-full">
                                                    {os.dataPrevExec}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-3 text-[11px] hidden md:table-cell">
                                                <Link href={`/os/${os.id}`} className={`block w-full h-full font-medium ${os.dataConclusao && os.dataConclusao !== '-' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                                    {os.dataConclusao || '-'}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-3 hidden md:table-cell">
                                                <Link href={`/os/${os.id}`} className="block w-full h-full">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[60px]">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${progressPct === 100 ? 'bg-emerald-500' : progressPct > 0 ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                                                style={{ width: `${progressPct}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                            {os.checklistDone}/{os.totalCaixas}
                                                        </span>
                                                    </div>
                                                </Link>
                                            </td>
                                            <td className="py-3 px-3">
                                                <Link href={`/os/${os.id}`} className="block w-full h-full">
                                                    <StatusBadge
                                                        label={os.executionStatus}
                                                        showIcon={true}
                                                        className="scale-90 origin-left"
                                                    />
                                                </Link>
                                            </td>
                                            <td className="py-3 px-3">
                                                <Link href={`/os/${os.id}`} className="block w-full h-full">
                                                    <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full w-fit ${os.statusMedicao === 'Pago' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : os.statusMedicao === 'Medido' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                        {os.statusMedicao || '-'}
                                                    </div>
                                                </Link>
                                            </td>
                                            <td className="py-3 px-3 hidden lg:table-cell max-w-[200px]">
                                                <Link href={`/os/${os.id}`} className="block w-full h-full">
                                                    <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2 italic" title={os.executionObs || os.observacoes || os.descricao || undefined}>
                                                        {os.executionObs || os.observacoes || os.descricao || '-'}
                                                    </p>
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredList.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="py-12 text-center text-muted-foreground italic">
                                            Nenhuma ordem encontrada com os filtros selecionados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 rounded-b-lg">
                        <div className="text-xs text-muted-foreground">
                            Mostrando <span className="font-medium text-slate-700 dark:text-slate-300">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> a <span className="font-medium text-slate-700 dark:text-slate-300">{Math.min(currentPage * ITEMS_PER_PAGE, filteredList.length)}</span> de <span className="font-medium text-slate-700 dark:text-slate-300">{filteredList.length}</span> ordens
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>

                            <div className="flex items-center gap-1 px-2">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    // Basic pagination logic to show current +/- 2
                                    let pageNum: number;
                                    if (totalPages <= 5) pageNum = i + 1;
                                    else if (currentPage <= 3) pageNum = i + 1;
                                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = currentPage - 2 + i;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-md text-xs font-medium transition-all ${currentPage === pageNum ? 'bg-primary text-white shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
