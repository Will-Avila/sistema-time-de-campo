'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Check, X, Loader2, UserPlus, Search } from 'lucide-react';
import { delegateOS, getTechnicianEquipes, getOSDelegations } from '@/actions/delegation';
import { toast } from '@/components/ui/toast';

interface Equipe {
    id: string;
    name: string;
    fullName: string | null;
    nomeEquipe: string | null;
}

interface Delegation {
    id: string;
    equipeId: string;
    equipeName: string;
    createdAt: Date;
}

interface DelegationPanelProps {
    osId: string;
    canDelegate: boolean;
}

export default function DelegationPanel({ osId, canDelegate }: DelegationPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [equipes, setEquipes] = useState<Equipe[]>([]);
    const [delegations, setDelegations] = useState<Delegation[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadDelegations();
    }, [osId]);

    async function loadDelegations() {
        const data = await getOSDelegations(osId);
        setDelegations(data);
    }

    async function openModal() {
        setLoading(true);
        try {
            const [techEquipes, currentDelegations] = await Promise.all([
                getTechnicianEquipes(),
                getOSDelegations(osId)
            ]);
            setEquipes(techEquipes);
            setDelegations(currentDelegations);
            setSelectedIds(new Set(currentDelegations.map(d => d.equipeId)));
            setIsOpen(true);
        } catch {
            toast('Erro ao carregar equipes.', 'error');
        } finally {
            setLoading(false);
        }
    }

    function toggleSelection(id: string) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    function deselectAll() {
        setSelectedIds(new Set());
    }

    async function handleSave() {
        setSaving(true);
        try {
            const result = await delegateOS(osId, [...selectedIds]);
            if (result.success) {
                toast(result.message || 'Equipes designadas!', 'success');
                await loadDelegations();
                setIsOpen(false);
            } else {
                toast(result.message || 'Erro ao designar.', 'error');
            }
        } catch {
            toast('Erro ao salvar designação.', 'error');
        } finally {
            setSaving(false);
        }
    }

    if (!canDelegate && delegations.length === 0) return null;

    return (
        <>
            {/* Delegation Status Card */}
            <Card className="border-border/60">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Equipes Designadas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {delegations.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {delegations.map(d => (
                                <Badge
                                    key={d.id}
                                    variant="secondary"
                                    className="px-3 py-1.5 text-xs font-medium gap-1.5 bg-primary/10 text-primary border border-primary/20"
                                >
                                    <UserPlus className="h-3 w-3" />
                                    {d.equipeName}
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma equipe designada.</p>
                    )}

                    {canDelegate && (
                        <Button
                            onClick={openModal}
                            disabled={loading}
                            className="mt-4 w-full gap-2"
                            variant="outline"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Users className="h-4 w-4" />
                            )}
                            Designar Equipes
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-md relative shadow-xl max-h-[80vh] flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between pb-3 shrink-0">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                Designar Equipes
                            </CardTitle>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4 overflow-hidden">
                            {/* Deselect All */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    {selectedIds.size} de {equipes.length} selecionadas
                                </span>
                                {selectedIds.size > 0 && (
                                    <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                                        Desmarcar Todas
                                    </Button>
                                )}
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar técnico ou equipe..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8"
                                />
                            </div>

                            {/* Equipe List */}
                            <div className="overflow-y-auto max-h-[50vh] space-y-1 pr-1 -mr-1">
                                {equipes.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-8">
                                        Nenhuma equipe técnica cadastrada.
                                    </p>
                                ) : (
                                    equipes
                                        .filter(equipe => {
                                            const term = searchTerm.toLowerCase();
                                            return (
                                                equipe.name.toLowerCase().includes(term) ||
                                                (equipe.fullName || '').toLowerCase().includes(term) ||
                                                (equipe.nomeEquipe || '').toLowerCase().includes(term)
                                            );
                                        })
                                        .map(equipe => {
                                            const isSelected = selectedIds.has(equipe.id);
                                            return (
                                                <button
                                                    key={equipe.id}
                                                    type="button"
                                                    onClick={() => toggleSelection(equipe.id)}
                                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${isSelected
                                                        ? 'bg-primary/10 border border-primary/30 shadow-sm'
                                                        : 'hover:bg-muted border border-transparent'
                                                        }`}
                                                >
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isSelected
                                                        ? 'bg-primary border-primary'
                                                        : 'border-muted-foreground/30'
                                                        }`}>
                                                        {isSelected && (
                                                            <Check className="h-3 w-3 text-primary-foreground" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">
                                                            {equipe.fullName || equipe.nomeEquipe || equipe.name}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            @{equipe.name}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2 border-t shrink-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    className="flex-1 gap-2"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-4 w-4" />
                                            Confirmar ({selectedIds.size})
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}
