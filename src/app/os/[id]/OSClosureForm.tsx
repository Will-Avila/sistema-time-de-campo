'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { closeOS } from '@/actions/execution';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, Camera, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import type { ActionResult } from '@/lib/types';
import { cn } from '@/lib/utils';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full h-11 text-base shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white">
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                </>
            ) : (
                'Confirmar Encerramento'
            )}
        </Button>
    );
}

interface OSClosureFormProps {
    osId: string;
    triggerClassName?: string;
    triggerSize?: "default" | "sm" | "lg" | "icon" | null | undefined;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    disabled?: boolean;
    customTrigger?: React.ReactNode;
}

export default function OSClosureForm({
    osId,
    triggerClassName,
    triggerSize = "sm",
    open: controlledOpen,
    onOpenChange,
    disabled,
    customTrigger
}: OSClosureFormProps) {
    const [internalOpen, setInternalOpen] = useState(false);

    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setIsOpen = (value: boolean) => {
        if (onOpenChange) onOpenChange(value);
        setInternalOpen(value);
    };

    const router = useRouter();
    const ref = useRef<HTMLFormElement>(null);

    const [state, formAction] = useFormState(async (prev: ActionResult | null, formData: FormData) => {
        const result = await closeOS(prev, formData);
        if (result.success) {
            toast('OS encerrada com sucesso!', 'success');
            router.push('/os');
        }
        return result;
    }, null);

    return (
        <>
            {/* Compact trigger button */}
            {customTrigger ? (
                <div onClick={() => !disabled && setIsOpen(true)} className={cn("w-full cursor-pointer", disabled && "opacity-50 cursor-not-allowed pointer-events-none")}>
                    {customTrigger}
                </div>
            ) : (
                <Button
                    onClick={() => setIsOpen(true)}
                    size={triggerSize}
                    className={triggerClassName || "shrink-0 text-sm font-semibold shadow-sm gap-2 h-11"}
                    disabled={disabled}
                >
                    <CheckCircle2 className="h-4 w-4" />
                    Encerrar OS
                </Button>
            )}

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-md overflow-hidden relative shadow-2xl bg-card border-border">
                        <CardHeader className="bg-muted/40 border-b border-border pb-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                    Encerrar Ordem de Serviço
                                </h3>
                                <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">✕</button>
                            </div>
                        </CardHeader>

                        <div className="p-6">
                            <form ref={ref} action={formAction} className="space-y-5">
                                <input type="hidden" name="osId" value={osId} />

                                <div className="space-y-3">
                                    <label className="text-sm font-medium leading-none text-foreground">Situação Final</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="relative flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer hover:bg-muted/50 transition-all border-border has-[:checked]:bg-primary/5 has-[:checked]:border-primary has-[:checked]:text-primary">
                                            <input type="radio" name="status" value="Concluída" className="sr-only" defaultChecked />
                                            <CheckCircle2 className="h-6 w-6 mb-2 text-muted-foreground" />
                                            <span className="font-bold text-sm">Concluída</span>
                                        </label>
                                        <label className="relative flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer hover:bg-muted/50 transition-all border-border has-[:checked]:bg-destructive/10 has-[:checked]:border-destructive has-[:checked]:text-destructive">
                                            <input type="radio" name="status" value="Sem Execução" className="sr-only" />
                                            <XCircle className="h-6 w-6 mb-2 text-muted-foreground" />
                                            <span className="font-bold text-sm">Não Executada</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none text-foreground">Observações</label>
                                    <Textarea
                                        name="obs"
                                        placeholder="Descreva os detalhes do serviço realizado, materiais utilizados, etc..."
                                        className="bg-background border-input"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none text-foreground flex items-center gap-2">
                                        <Camera className="h-4 w-4" />
                                        Fotos do Serviço
                                    </label>
                                    <Input
                                        type="file"
                                        name="photos"
                                        multiple
                                        accept="image/*"
                                        className="cursor-pointer file:cursor-pointer file:text-primary file:bg-primary/10 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold h-auto py-2 bg-background border-input"
                                    />
                                </div>

                                {state?.message && (
                                    <div className={cn(
                                        "p-4 rounded-lg text-sm flex items-center gap-3 border",
                                        state.success ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'
                                    )}>
                                        {state.success ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                                        {state.message}
                                    </div>
                                )}

                                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsOpen(false)}
                                        className="w-full sm:flex-1 h-11 border-border text-foreground hover:bg-muted"
                                    >
                                        Cancelar
                                    </Button>
                                    <div className="w-full sm:flex-1">
                                        <SubmitButton />
                                    </div>
                                </div>
                            </form>
                        </div>
                    </Card>
                </div>
            )}
        </>
    );
}
