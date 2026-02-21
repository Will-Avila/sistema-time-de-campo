'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingBasket, Plus, Trash2, Clock, User } from 'lucide-react';
import { addOSMaterial, deleteOSMaterial, getOSMaterials } from '@/actions/material';
import { toast } from '@/components/ui/toast';
import { Session } from '@/lib/auth';
import { cn, formatDateTimeSP } from '@/lib/utils';
import { ConfirmModal } from '@/components/ui/confirm-modal';

interface MaterialManagerProps {
    osId: string;
    session: Session | null;
    triggerClassName?: string;
}

export default function MaterialManager({ osId, session, triggerClassName }: MaterialManagerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [materials, setMaterials] = useState<any[]>([]);
    const [newMaterial, setNewMaterial] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    const isAdmin = session?.isAdmin || session?.role === 'ADMIN';

    useEffect(() => {
        if (isOpen) {
            loadMaterials();
        }
    }, [isOpen]);

    async function loadMaterials() {
        const data = await getOSMaterials(osId);
        setMaterials(data);
    }

    async function handleAddMaterial() {
        if (!newMaterial.trim()) return;

        setIsLoading(true);
        const result = await addOSMaterial(osId, newMaterial);

        if (result.success) {
            setNewMaterial('');
            toast('Material adicionado!', 'success');
            loadMaterials();
        } else {
            toast(result.message || 'Erro ao adicionar.', 'error');
        }
        setIsLoading(false);
    }

    async function handleDelete(id: string) {
        setIsLoading(true);
        try {
            const result = await deleteOSMaterial(osId, id);

            if (result.success) {
                toast('Registro removido.', 'success');
                loadMaterials();
            } else {
                toast(result.message || 'Erro ao remover.', 'error');
            }
        } catch (error) {
            console.error('Error in handleDelete:', error);
            toast('Erro inesperado ao tentar excluir.', 'error');
        } finally {
            setItemToDelete(null);
            setIsLoading(false);
        }
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button size="lg" className={cn("w-full gap-2 bg-[#334155] hover:bg-[#1e293b] text-white h-11 shadow-sm border-none font-bold transition-all active:scale-[0.98]", triggerClassName)}>
                        <ShoppingBasket className="h-4 w-4" />
                        + Add Material
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-6 border-b border-border bg-muted/30">
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <ShoppingBasket className="h-6 w-6 text-[#4da8bc]" />
                            Materiais Utilizados
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* New Material Input */}
                        <div className="space-y-3 bg-card border border-border rounded-xl p-4 shadow-sm">
                            <label className="text-sm font-bold text-foreground">Novo Registro</label>
                            <Textarea
                                placeholder="Descreva o material utilizado (ex: 20m de drop, 2 conectores...)"
                                value={newMaterial}
                                onChange={(e) => setNewMaterial(e.target.value)}
                                className="min-h-[100px] resize-none focus-visible:ring-[#4da8bc]"
                            />
                            <Button
                                className="w-full bg-[#4da8bc] hover:bg-[#3d8a9b] text-white gap-2 font-bold"
                                onClick={handleAddMaterial}
                                disabled={isLoading || !newMaterial.trim()}
                            >
                                <Plus className="h-4 w-4" />
                                Adicionar Informação
                            </Button>
                        </div>

                        {/* List of Materials */}
                        <div className="space-y-4 pb-2">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Histórico de Materiais
                            </h3>

                            {materials.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl">
                                    <p className="text-sm italic">Nenhum material registrado ainda.</p>
                                </div>
                            ) : (
                                materials.map((m) => (
                                    <div key={m.id} className="relative group border border-border/60 rounded-xl p-4 bg-muted/10 hover:bg-muted/20 transition-colors">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1 space-y-2">
                                                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                                    {m.content}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-medium">
                                                    <span className="flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        {m.equipe?.fullName || m.equipe?.name}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDateTimeSP(m.createdAt)}
                                                    </span>
                                                </div>
                                            </div>

                                            {(isAdmin || m.equipeId === session?.id) && (
                                                <button
                                                    onClick={() => setItemToDelete(m.id)}
                                                    className={cn(
                                                        "p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all",
                                                        m.equipeId === session?.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                                    )}
                                                    title={isAdmin ? "Excluir (Admin)" : "Excluir meu registro"}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <ConfirmModal
                        open={!!itemToDelete}
                        title="Excluir Registro?"
                        message="Esta ação é irreversível e removerá este item do histórico de materiais."
                        variant="danger"
                        disabled={isLoading}
                        onConfirm={() => itemToDelete && handleDelete(itemToDelete)}
                        onCancel={() => setItemToDelete(null)}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}
