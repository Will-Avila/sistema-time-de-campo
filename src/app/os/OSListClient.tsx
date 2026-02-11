'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EnrichedOS } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Filter, Calendar, MapPin, Box, Loader2, Building } from 'lucide-react';
import { updatePreferences } from '@/actions/technician';

interface OSListClientProps {
    initialOSList: EnrichedOS[];
    initialUf: string;
}

export default function OSListClient({ initialOSList, initialUf }: OSListClientProps) {
    const [selectedUF, setSelectedUF] = useState<string>(initialUf || 'Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('Abertas');
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const router = useRouter();

    const STATUS_GROUPS: Record<string, string[]> = {
        'Abertas': ['iniciar', 'em execução', 'em execucao', 'pend. cliente', 'concluída - em análise', 'sem execução - em análise'],
        'Concluídas': ['concluído', 'concluido', 'encerrada', 'concluída'],
        'Canceladas': ['cancelado'],
    };

    // Get unique UFs
    const ufs = ['Todos', ...Array.from(new Set(initialOSList.map(os => os.uf).filter(Boolean))).sort()];

    const filteredList = initialOSList.filter(os => {
        const matchesUF = selectedUF === 'Todos' || os.uf === selectedUF;
        const matchesSearch = searchTerm === '' ||
            os.protocolo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            os.pop?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            os.condominio?.toLowerCase().includes(searchTerm.toLowerCase()); // Include condo in search

        const allowedStatuses = STATUS_GROUPS[statusFilter];
        // If allowedStatuses is undefined (Todas), match everything. Otherwise check inclusion.
        const matchesStatus = !allowedStatuses || allowedStatuses.includes(os.status.toLowerCase());

        return matchesUF && matchesSearch && matchesStatus;
    }).sort((a, b) => {
        // Special sort for 'Concluídas': most recent first
        if (statusFilter === 'Concluídas') {
            // Priority: 1. App closedAt, 2. Excel Conclusao, 3. Fallback
            const dateA = a.closedAt ? new Date(a.closedAt).getTime() : (a.rawConclusao ? (a.rawConclusao - 25569) * 86400000 : 0);
            const dateB = b.closedAt ? new Date(b.closedAt).getTime() : (b.rawConclusao ? (b.rawConclusao - 25569) * 86400000 : 0);
            return dateB - dateA; // Descending
        }
        // Default sort: already sorted by prevExec in Excel parser, but we preserve it
        return 0;
    });

    function handleUFChange(newUF: string) {
        setSelectedUF(newUF);
        updatePreferences('lastUf', newUF);
    }

    /** Returns color classes for a date based on comparison with today */
    function getDateColor(excelSerial?: number): string {
        if (!excelSerial) return 'text-slate-700 dark:text-slate-300';
        const dateMs = (excelSerial - 25569) * 86400000;
        const date = new Date(dateMs);
        const today = new Date();
        // Compare only year/month/day
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (d.getTime() < t.getTime()) return 'text-rose-600 dark:text-rose-400';
        if (d.getTime() === t.getTime()) return 'text-amber-600 dark:text-amber-400';
        if (d.getTime() < t.getTime()) return 'text-rose-600 dark:text-rose-400';
        if (d.getTime() === t.getTime()) return 'text-amber-600 dark:text-amber-400';
        return 'text-slate-700 dark:text-slate-300';
    }

    function getDisplayStatus(os: EnrichedOS) {
        if (os.executionStatus && os.executionStatus !== 'Pendente') return os.executionStatus;
        const s = os.status.toLowerCase();
        if (s === 'concluído' || s === 'concluido' || s === 'encerrada') return 'Concluída';
        if (s === 'cancelado') return 'Cancelada';
        // If not concluded or cancelled, display the actual status from Excel (properly formatted is better, but raw is fine)
        // Capitalize first letter?
        return os.status || 'Pendente';
    }

    function getStatusVariant(status: string) {
        if (status === 'Concluída') return 'success';
        if (status === 'Sem Execução' || status === 'Cancelada') return 'destructive';
        if (status === 'Em Execução') return 'warning';
        if (status.includes('Sem Execução - Em análise')) return 'orange';
        if (status.includes('Em análise')) return 'light-green';
        return 'secondary';
    }

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 pb-6 md:pb-8 space-y-6 transition-colors">

            <div className="pt-20 px-6 md:px-8 space-y-6"> {/* Added padding top for fixed header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Ordens de Serviço</h1>
                    </div>
                </div>

                {/* Filters */}
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500 dark:text-slate-400" />
                            <Input
                                placeholder="Buscar por protocolo, POP ou condomínio..."
                                className="pl-9 bg-white border-slate-300 focus:bg-white transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:focus:bg-slate-950 dark:placeholder:text-slate-400 shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <div className="relative">
                                <select
                                    value={selectedUF}
                                    onChange={(e) => handleUFChange(e.target.value)}
                                    className="h-10 w-full md:w-[180px] appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pr-8 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                                >
                                    {ufs.map(uf => (
                                        <option key={uf} value={uf}>{uf === 'Todos' ? 'Todos os estados' : uf}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                                    <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="h-10 w-full md:w-[160px] appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pr-8 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                                >
                                    {Object.keys(STATUS_GROUPS).map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                                    <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="text-sm font-medium text-muted-foreground bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-3 py-2 rounded-md whitespace-nowrap">
                            {filteredList.length} resultados
                        </div>
                    </CardContent>
                </Card>

                {/* Grid */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredList.map((os) => (
                        <div
                            key={os.id}
                            onClick={() => { setLoadingId(os.id); router.push(`/os/${os.id}`); }}
                            className="block group h-full cursor-pointer"
                        >
                            <Card className={`h-full relative transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 group-hover:bg-slate-50/50 dark:group-hover:bg-slate-900/50 dark:bg-slate-950 dark:border-slate-800 flex flex-col ${loadingId === os.id ? 'opacity-60 pointer-events-none' : ''}`}>
                                {loadingId === os.id && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-slate-950/50 rounded-xl backdrop-blur-[1px]">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                )}
                                <CardHeader className="p-5 pb-3 space-y-0">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="outline" className="font-mono text-xs text-muted-foreground border-slate-200 dark:border-slate-700">
                                                    {os.protocolo || 'SEM PROTOCOLO'}
                                                </Badge>
                                                {os.uf && (
                                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                        {os.uf}
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Condo Name */}
                                            {os.condominio && (
                                                <div className="flex items-center gap-1.5 mb-0.5 mt-1">
                                                    <Building className="h-3.5 w-3.5 text-slate-500" />
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide truncate">
                                                        {os.condominio}
                                                    </span>
                                                </div>
                                            )}

                                            <CardTitle className="text-base font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2 dark:text-slate-100" title={os.pop || 'SEM POP'}>
                                                {os.pop || 'SEM POP'}
                                            </CardTitle>
                                        </div>
                                        <Badge variant={getStatusVariant(getDisplayStatus(os))} className="shrink-0">
                                            {getDisplayStatus(os)}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-5 pt-2 flex-1 flex flex-col justify-end space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-slate-50/80 dark:bg-slate-900/50 p-2 rounded-md border border-slate-100/50 dark:border-slate-800/50">
                                            <Box className="h-4 w-4 text-slate-400 shrink-0" />
                                            <span className="font-medium text-slate-600 dark:text-slate-400">{os.totalCaixas} caixas</span>
                                        </div>
                                        {os.cenario && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
                                                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span className="truncate text-xs">{os.cenario}</span>
                                            </div>
                                        )}
                                        {os.technicianName && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
                                                <span className="text-xs">👤 {os.technicianName}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs mt-auto">
                                        <div>
                                            <span className="block text-muted-foreground/60 mb-0.5 text-[10px] uppercase font-bold tracking-wider">Entrada</span>
                                            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                                                <Calendar className="h-3 w-3 text-slate-400" />
                                                {os.dataEntrante}
                                            </div>
                                        </div>
                                        {getDisplayStatus(os) === 'Concluída' ? (
                                            <div>
                                                <span className="block text-muted-foreground/60 mb-0.5 text-[10px] uppercase font-bold tracking-wider">Conclusão</span>
                                                <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                                                    <Calendar className="h-3 w-3 text-emerald-500/70" />
                                                    {os.closedAt ? new Date(os.closedAt).toLocaleDateString('pt-BR') : (os.dataConclusao || '-')}
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <span className="block text-muted-foreground/60 mb-0.5 text-[10px] uppercase font-bold tracking-wider">Prazo</span>
                                                <div className={`flex items-center gap-1.5 font-medium ${getDateColor(os.rawPrevExec)}`}>
                                                    <Calendar className="h-3 w-3 text-slate-400" />
                                                    {os.dataPrevExec}
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>

                {filteredList.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-800">
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-full mb-4">
                            <Search className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-xl font-semibold text-slate-700 dark:text-slate-200">Nenhum resultado encontrado</p>
                        <p className="text-sm mt-1 mb-6 max-w-sm text-center text-muted-foreground">Não encontramos nenhuma OS com os filtros atuais. Tente buscar por outro termo ou limpar os filtros.</p>
                        <button
                            onClick={() => { setSearchTerm(''); setSelectedUF('Todos') }}
                            className="text-primary hover:underline font-medium"
                        >
                            Limpar filtros
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
