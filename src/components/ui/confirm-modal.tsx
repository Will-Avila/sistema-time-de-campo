'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'default';
    disabled?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmModal({
    open,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'default',
    disabled,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!open || !mounted) return null;

    // Renderizamos inline (sem Portal) para evitar conflitos com o Focus Trap do Radix/Dialog.
    // O Z-index alto garante que fique acima de tudo no contexto atual.
    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-sm shadow-2xl border-border bg-card">
                <div className="p-6 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full shrink-0 ${variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                            <AlertTriangle className={`h-5 w-5 ${variant === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">{title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{message}</p>
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                        <Button variant="outline" onClick={onCancel} disabled={disabled}>
                            {cancelLabel}
                        </Button>
                        <Button
                            variant={variant === 'danger' ? 'destructive' : 'default'}
                            onClick={onConfirm}
                            disabled={disabled}
                            autoFocus
                        >
                            {confirmLabel}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
