'use client';

import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'default';
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
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-sm shadow-2xl dark:bg-slate-900 dark:border-slate-700">
                <div className="p-6 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full shrink-0 ${variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                            <AlertTriangle className={`h-5 w-5 ${variant === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-slate-100">{title}</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{message}</p>
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                        <Button variant="outline" onClick={onCancel} className="dark:border-slate-600 dark:text-slate-300">
                            {cancelLabel}
                        </Button>
                        <Button
                            variant={variant === 'danger' ? 'destructive' : 'default'}
                            onClick={onConfirm}
                        >
                            {confirmLabel}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
