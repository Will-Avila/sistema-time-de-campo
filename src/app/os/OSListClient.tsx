'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EnrichedOS } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Filter, Calendar, MapPin, Box, Loader2, Building, Wrench, ArrowLeft, User } from 'lucide-react';
import { updatePreferences } from '@/actions/equipe';
import { getStatusVariantFromLabel, formatDateSP, cn, getDeadlineInfo } from '@/lib/utils';
import { StatusBadge } from '@/components/os/StatusBadge';
import { OSClosureDate } from '@/components/os/OSClosureDate';

interface OSListClientProps {
    initialOSList: EnrichedOS[];
    initialUf: string;
    initialSearch?: string;
    initialStatus?: string;
    isTodayPage?: boolean;
    extraFilters?: React.ReactNode;
}

export default function OSListClient({ initialOSList, initialUf, initialSearch, initialStatus, isTodayPage, extraFilters }: OSListClientProps) {
    const [selectedUF, setSelectedUF] = useState<string>(initialUf || 'Todos');
    const [searchTerm, setSearchTerm] = useState(initialSearch || '');
    const [statusFilter, setStatusFilter] = useState<string>(initialStatus || (isTodayPage ? 'Todas' : 'Abertas'));
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const router = useRouter();

    // Persistent search term (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== (initialSearch || '')) {
                updatePreferences('lastSearch', searchTerm).then(() => router.refresh());
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, initialSearch, router]);

    function handleUFChange(newUF: string) {
        setSelectedUF(newUF);
        setCurrentPage(1);
        updatePreferences('lastUf', newUF).then(() => router.refresh());
    }

    function handleStatusChange(newStatus: string) {
        setStatusFilter(newStatus);
        setCurrentPage(1);
        updatePreferences('lastStatus', newStatus).then(() => router.refresh());
    }

    const STATUS_GROUPS: Record<string, string[]> = isTodayPage
        ? {
            'Todas': [],
            'Concluídas': [],
            'Canceladas': [],
            'Em Análise': [],
        }
        : {
            'Abertas': ['INICIAR', 'EM EXECUÇÃO', 'EM EXECUCAO', 'PEND. CLIENTE'],
            'Concluídas': ['CONCLUÍDO', 'CONCLUIDO', 'CONCLUÍDA'],
            'Canceladas': ['CANCELADO'],
            'Todas': [],
        };

    // Get unique UFs
    const ufs = ['Todos', ...Array.from(new Set(initialOSList.map(os => os.uf).filter(Boolean))).sort()];

    const filteredList = initialOSList.filter(os => {
        const matchesUF = selectedUF === 'Todos' || os.uf === selectedUF;
        const searchUpper = searchTerm.toUpperCase().trim();
        const matchesSearch = searchUpper === '' ||
            (os.protocolo || '').toUpperCase().includes(searchUpper) ||
            (os.pop || '').toUpperCase().includes(searchUpper) ||
            (os.condominio || '').toUpperCase().includes(searchUpper);

        const allowedStatuses = STATUS_GROUPS[statusFilter];
        const rawStatus = (os.status || '').toUpperCase().trim();
        const execStatus = (os.executionStatus || '').toUpperCase().trim();

        let matchesStatus = statusFilter === 'Todas' || !allowedStatuses || allowedStatuses.includes(rawStatus);

        // Special logic for Today's Page (Execution-based filtering)
        if (isTodayPage) {
            const isCancellation = execStatus.includes('SEM EXECUÇ') || execStatus.includes('SEM EXECUC') || execStatus.includes('CANCELAD') || rawStatus === 'CANCELADO';

            if (statusFilter === 'Em Análise') {
                matchesStatus = execStatus.includes('EM ANÁLIS') || execStatus.includes('EM ANALIS');
            } else if (statusFilter === 'Concluídas') {
                matchesStatus = !isCancellation;
            } else if (statusFilter === 'Canceladas') {
                matchesStatus = isCancellation;
            } else if (statusFilter === 'Todas') {
                matchesStatus = true;
            }
        }

        return matchesUF && matchesSearch && matchesStatus;
    }).sort((a, b) => {
        const parseDate = (d: string | undefined) => {
            if (!d || d === '-') return Number.MAX_SAFE_INTEGER;
            // Handle ISO strings (e.g. 2024-02-13T...)
            if (d.includes('T') || (d.includes('-') && d.length > 8)) {
                return new Date(d).getTime();
            }
            // Handle BR strings (DD/MM/YYYY)
            const parts = d.split('/');
            if (parts.length < 3) return 0;
            const [day, month, year] = parts.map(Number);
            return new Date(year, month - 1, day).getTime();
        };

        // Special sort for 'Concluídas': most recent closure first
        if (statusFilter === 'Concluídas') {
            const dateA = parseDate(a.closedAt || a.dataConclusao);
            const dateB = parseDate(b.closedAt || b.dataConclusao);
            return dateB - dateA; // Descending
        }

        // Special sort for 'Canceladas' and 'Todas': entry date most recent first (descending)
        if (statusFilter === 'Canceladas' || statusFilter === 'Todas') {
            return parseDate(b.dataEntrante) - parseDate(a.dataEntrante);
        }

        // For 'Abertas': Pure sort by deadline (dataPrevExec) ascending
        if (statusFilter === 'Abertas') {
            const dateA = parseDate(a.dataPrevExec);
            const dateB = parseDate(b.dataPrevExec);

            if (dateA !== dateB) {
                return dateA - dateB;
            }
            return (a.pop || '').localeCompare(b.pop || '');
        }

        return 0;
    });

    const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE);
    const paginatedList = filteredList.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );


    function getDisplayStatus(os: EnrichedOS) {
        if (os.executionStatus && os.executionStatus !== 'Pendente') return os.executionStatus;
        const s = (os.status || '').toUpperCase().trim();
        if (s === 'CONCLUÍDO' || s === 'CONCLUIDO') return 'Concluída';
        if (s === 'CANCELADO') return 'Cancelada';
        return os.status || 'Pendente';
    }

    return (
        <div className={cn("min-h-screen bg-muted/30 pb-6 md:pb-8 space-y-6 transition-colors", isTodayPage && "min-h-0 bg-transparent")}>
            <div className={cn("container space-y-6", isTodayPage ? "pt-2" : "pt-6")}>
                {isTodayPage && (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/admin/dashboard')}
                            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors bg-background px-3 py-1.5 rounded-lg border border-border shadow-sm hover:bg-muted"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar para Dashboard
                        </button>
                    </div>
                )}
                {!isTodayPage && (
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Ordens de Serviço</h1>
                        </div>
                    </div>
                )}

                <Card className="bg-card border-border shadow-sm">
                    <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por protocolo, POP ou condomínio..."
                                className="pl-9 bg-background border-input focus:ring-primary/20 h-10"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <Filter className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
                                <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                                    <div className="relative w-full sm:w-auto">
                                        <select
                                            value={selectedUF}
                                            onChange={(e) => handleUFChange(e.target.value)}
                                            className="h-10 w-full sm:w-[150px] appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus:ring-2 focus:ring-primary/20 pr-8 cursor-pointer hover:bg-muted/50 transition-colors"
                                        >
                                            {ufs.map(uf => (
                                                <option key={uf} value={uf}>{uf === 'Todos' ? 'Todos os estados' : uf}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                                            <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                        </div>
                                    </div>

                                    {extraFilters}

                                    {!isTodayPage && (
                                        <div className="relative w-full sm:w-auto">
                                            <select
                                                value={statusFilter}
                                                onChange={(e) => handleStatusChange(e.target.value)}
                                                className="h-10 w-full sm:w-[130px] appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus:ring-2 focus:ring-primary/20 pr-8 cursor-pointer hover:bg-muted/50 transition-colors"
                                            >
                                                {Object.keys(STATUS_GROUPS).map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                                                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="text-sm font-medium text-muted-foreground bg-muted px-3 py-2 rounded-md whitespace-nowrap w-full sm:w-auto text-center border border-border">
                                {filteredList.length} resultados
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {paginatedList.map((os) => (
                        <div
                            key={os.id}
                            onClick={() => { setLoadingId(os.id); router.push(`/os/${os.id}`); }}
                            className="block group h-full cursor-pointer"
                        >
                            <Card className={cn(
                                "h-full relative transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 group-hover:bg-accent/5 flex flex-col border-border bg-card",
                                loadingId === os.id && "opacity-60 pointer-events-none"
                            )}>
                                {loadingId === os.id && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 rounded-xl backdrop-blur-[1px]">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                )}

                                <CardHeader className="p-5 pb-3 space-y-0 relative">
                                    <StatusBadge label={getDisplayStatus(os)} className="absolute top-5 right-5 z-10" />
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="space-y-1.5 flex-1 pr-24">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="secondary" className="font-mono text-xs font-bold text-[#4da8bc] bg-[#4da8bc]/10 border-[#4da8bc]/20 shadow-sm">
                                                    {os.protocolo || 'SEM PROTOCOLO'}
                                                </Badge>
                                                {os.uf && (
                                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold bg-muted text-muted-foreground">
                                                        {os.uf}
                                                    </Badge>
                                                )}
                                            </div>

                                            {os.condominio && (
                                                <div className="flex items-center gap-1.5 mb-0.5 mt-1">
                                                    <Building className="h-3.5 w-3.5 text-[#4da8bc]" />
                                                    <span className="text-xs font-bold text-foreground/80 uppercase tracking-wide truncate">
                                                        {os.condominio}
                                                    </span>
                                                </div>
                                            )}

                                            <CardTitle className="text-base font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2 text-foreground" title={os.pop || 'SEM POP'}>
                                                {os.pop || 'SEM POP'}
                                            </CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-5 pt-2 flex-1 flex flex-col justify-end space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-md border border-border/50">
                                            <Box className="h-4 w-4 text-[#4da8bc]" />
                                            <span className="font-medium text-foreground/70">{os.totalCaixas} caixas</span>
                                        </div>
                                        {os.tipoOs && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
                                                <Wrench className="h-3.5 w-3.5 text-[#4da8bc]" />
                                                <span className="truncate text-xs">{os.tipoOs}</span>
                                            </div>
                                        )}
                                        {os.equipeName && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
                                                <User className="h-3.5 w-3.5 text-[#4da8bc]" />
                                                <span className="text-xs">{os.equipeName}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50 text-xs mt-auto">
                                        <div>
                                            <span className="block text-muted-foreground/60 mb-0.5 text-[10px] uppercase font-bold tracking-wider">Entrada</span>
                                            <div className="flex items-center gap-1.5 font-medium text-foreground/80">
                                                <Calendar className="h-3 w-3 text-[#4da8bc]" />
                                                {os.dataEntrante}
                                            </div>
                                        </div>
                                        {(getDisplayStatus(os).includes('Concluíd') || getDisplayStatus(os).includes('Sem Execuç') || getDisplayStatus(os).includes('Cancelad') || getDisplayStatus(os).includes('Análise')) ? (
                                            <div>
                                                <span className="block text-muted-foreground/60 mb-0.5 text-[10px] uppercase font-bold tracking-wider">
                                                    {getDisplayStatus(os).includes('Cancelad') || getDisplayStatus(os).includes('Sem Execuç') ? 'Finalização' : 'Conclusão'}
                                                </span>
                                                <OSClosureDate
                                                    dataConclusaoExcel={os.dataConclusao}
                                                    executionUpdatedAt={os.executionUpdatedAt}
                                                    closedAt={os.closedAt}
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <span className="block text-muted-foreground/60 mb-0.5 text-[10px] uppercase font-bold tracking-wider">Prazo</span>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 font-medium text-foreground/80">
                                                        <Calendar className="h-3 w-3 text-[#4da8bc]" />
                                                        {os.dataPrevExec || '-'}
                                                    </div>
                                                    {getDeadlineInfo(os.dataPrevExec) && (
                                                        <span className={cn(
                                                            "text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-muted w-fit leading-none border border-border shadow-sm",
                                                            getDeadlineInfo(os.dataPrevExec)?.color
                                                        )}>
                                                            {getDeadlineInfo(os.dataPrevExec)?.label}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>

                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-6 border-t border-border mt-8">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                            >
                                Anterior
                            </button>
                            <div className="text-sm font-medium text-muted-foreground px-4">
                                Página {currentPage} de {totalPages}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                            >
                                Próximo
                            </button>
                        </div>
                    </div>
                )}

                {filteredList.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card rounded-lg border border-dashed border-border">
                        <div className="bg-muted p-4 rounded-full mb-4">
                            <Search className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <p className="text-xl font-semibold text-foreground">Nenhum resultado encontrado</p>
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
