'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UploadCloud, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { uploadExcel } from '@/actions/excel';
import { resetSyncProgress } from '@/actions/dashboard';

export function ExcelUploadButton() {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, message: '', status: 'IDLE' });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollingInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Check progress on mount
        const fetchInitial = async () => {
            try {
                const res = await fetch('/api/sync-progress');
                if (res.ok) {
                    const p = await res.json();
                    if (p.status === 'RUNNING') {
                        setIsUploading(true);
                    }
                }
            } catch (e) { }
        };
        fetchInitial();

        return () => stopPolling();
    }, []);

    useEffect(() => {
        if (isUploading) {
            pollingInterval.current = setInterval(async () => {
                try {
                    const res = await fetch('/api/sync-progress');
                    if (!res.ok) throw new Error('Failed to fetch progress');
                    const p = await res.json();
                    setProgress(p);
                    if (p.status === 'COMPLETED' || p.status === 'ERROR' || p.status === 'IDLE') {
                        setIsUploading(false);
                        stopPolling();
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 800);
        } else {
            stopPolling();
        }

        return () => stopPolling();
    }, [isUploading]);

    const stopPolling = () => {
        if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
        }
    };

    async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.xlsx')) {
            toast('Por favor, selecione um arquivo .xlsx', 'error');
            return;
        }

        setIsUploading(true);
        setProgress({ current: 0, total: 0, message: 'Enviando arquivo...', status: 'RUNNING' });

        const formData = new FormData();
        formData.append('file', file);

        try {
            const result = await uploadExcel(formData);
            if (result.success) {
                toast(result.message || 'Base atualizada!', 'success');
            } else {
                toast(result.message || 'Erro ao atualizar.', 'error');
            }
        } catch (error) {
            toast('Erro de conexão ao enviar arquivo.', 'error');
        } finally {
            // Wait a bit to show 100%
            setTimeout(() => {
                setIsUploading(false);
                resetSyncProgress();
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }, 2000);
        }
    }

    const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

    return (
        <div className="w-full sm:w-auto flex-1">
            <input
                type="file"
                accept=".xlsx"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />
            <Button
                variant="outline"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-[72px] flex flex-col items-center justify-center gap-1.5 shadow-sm border-border bg-white dark:bg-secondary hover:bg-muted/50 transition-all font-semibold active:scale-[0.98] px-1"
            >
                {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-sky-500" />
                ) : (
                    <UploadCloud className="h-5 w-5 text-sky-500" />
                )}
                <span className="text-[10px] leading-tight text-center">
                    {isUploading ? 'Enviando...' : 'Atualizar Base'}
                </span>
            </Button>
        </div>
    );
}
