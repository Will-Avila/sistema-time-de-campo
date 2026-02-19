'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateLancaItem, resetLancaItem } from '@/actions/lanca';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Circle, Undo2, Loader2, User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Session } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface LancaItemProps {
    item: any;
    osId: string;
    session?: Session | null;
}

export default function LancaItem({ item, osId, session }: LancaItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const [metragem, setMetragem] = useState(item.lancado || '');
    const isDone = item.status === 'OK';

    // Confirm modal state
    const [confirmAction, setConfirmAction] = useState<{
        title: string;
        message: string;
        action: () => void;
    } | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await updateLancaItem(osId, item.id, {
                lancado: metragem,
                done: true
            });

            if (result.success) {
                setIsOpen(false);
                router.refresh();
                toast('Lançamento concluído!', 'success');
            } else {
                toast(result.message || 'Erro ao salvar.', 'error');
            }
        } catch (error) {
            console.error('Error saving launch:', error);
            toast('Erro inesperado ao salvar.', 'error');
        } finally {
            setIsLoading(false);
        }
    }

    function requestReset() {
        setConfirmAction({
            title: 'Desmarcar Lançamento',
            message: 'A metragem e o status deste lançamento serão removidos. Deseja continuar?',
            action: executeReset,
        });
    }

    async function executeReset() {
        setConfirmAction(null);
        setIsLoading(true);

        try {
            const result = await resetLancaItem(osId, item.id);

            if (result.success) {
                setMetragem('');
                setIsOpen(false);
                router.refresh();
                toast('Lançamento desmarcado.', 'success');
            } else {
                toast(result.message || 'Erro ao desmarcar.', 'error');
            }
        } catch (error) {
            console.error('Error resetting launch:', error);
            toast('Erro inesperado ao desmarcar.', 'error');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card className={cn(
            "rounded-xl shadow-sm border transition-all p-6",
            isDone ? "bg-emerald-500/10 border-emerald-500/20" : "bg-card border-border"
        )}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                    <h3 className="font-bold text-foreground text-base flex items-center gap-2 truncate">
                        {item.de} <span className="text-muted-foreground font-normal">→</span> {item.para}
                    </h3>
                    <p className="text-[11px] text-primary font-bold uppercase tracking-wider mt-0.5 opacity-80">{item.cabo}</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsOpen(true)}
                        className={cn(
                            "group relative flex h-6 w-11 items-center rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                            isDone ? 'bg-primary border-primary' : 'bg-primary/10 border-primary/20'
                        )}
                    >
                        <span className={cn(
                            "inline-block h-4 w-4 transform rounded-full shadow-sm ring-0 transition duration-200 ease-in-out",
                            isDone ? 'bg-background translate-x-5' : 'bg-primary translate-x-0.5'
                        )} />
                    </button>
                </div>
            </div>

            {/* Sub-info */}
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Previsão:</span> {item.previsao}
                </div>

                {isDone && (
                    <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                        {item.responsavel && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <User className="h-3 w-3 text-[#4da8bc]" />
                                <span>Responsável: <span className="font-bold text-foreground">{item.responsavel}</span></span>
                            </div>
                        )}
                        {item.data && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3 text-[#4da8bc]" />
                                <span>Concluído em: <span className="font-bold text-foreground">{item.data}</span></span>
                            </div>
                        )}

                        {item.lancado && (
                            <div className="mt-2 pt-2 border-t border-border/40 flex justify-between items-end">
                                <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest">Metragem Lançada</span>
                                <span className="text-2xl font-black text-emerald-600 leading-none drop-shadow-sm">
                                    {item.lancado}<span className="text-xs ml-0.5 font-bold">m</span>
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-md overflow-hidden relative shadow-2xl border-border bg-card">
                        <div className="p-6 border-b border-border bg-muted/40">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg text-foreground">Atualizar Lançamento</h3>
                                <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
                            </div>
                        </div>

                        <div className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none text-foreground">Metragem Lançada (m)</label>
                                    <Input
                                        type="text"
                                        value={metragem}
                                        onChange={e => setMetragem(e.target.value)}
                                        placeholder="Ex: 150"
                                        className="font-mono text-lg"
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-3 pt-2">
                                    <Button
                                        type="submit"
                                        className="w-full shadow-lg bg-emerald-600 hover:bg-emerald-700 h-10 text-white"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Salvando...' : (isDone ? 'Atualizar Metragem' : 'Concluir Lançamento')}
                                    </Button>

                                    {isDone && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={requestReset}
                                            disabled={isLoading}
                                            className="w-full gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                                        >
                                            <Undo2 className="h-4 w-4" />
                                            Desmarcar
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </Card>
                </div>
            )}

            {/* Confirm Modal */}
            <ConfirmModal
                open={!!confirmAction}
                title={confirmAction?.title || ''}
                message={confirmAction?.message || ''}
                variant="danger"
                confirmLabel="Sim, desmarcar"
                onConfirm={() => confirmAction?.action()}
                onCancel={() => setConfirmAction(null)}
            />
        </Card>
    );
}
