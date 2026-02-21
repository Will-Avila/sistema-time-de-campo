'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { refreshData, resetSyncProgress } from '@/actions/dashboard';

export function SyncDataButton() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, message: '', status: 'IDLE' });
    const pollingInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Check progress on mount
        const fetchInitial = async () => {
            try {
                const res = await fetch('/api/sync-progress');
                if (res.ok) {
                    const p = await res.json();
                    if (p.status === 'RUNNING') {
                        setIsSyncing(true);
                    }
                }
            } catch (e) { }
        };
        fetchInitial();

        return () => stopPolling();
    }, []);

    useEffect(() => {
        if (isSyncing) {
            pollingInterval.current = setInterval(async () => {
                try {
                    const res = await fetch('/api/sync-progress');
                    if (!res.ok) throw new Error('Failed to fetch progress');
                    const p = await res.json();
                    setProgress(p);
                    if (p.status === 'COMPLETED' || p.status === 'ERROR' || p.status === 'IDLE') {
                        setIsSyncing(false);
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
    }, [isSyncing]);

    const stopPolling = () => {
        if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
        }
    };

    async function handleSync() {
        setIsSyncing(true);
        setProgress({ current: 0, total: 0, message: 'Iniciando...', status: 'RUNNING' });
        try {
            const result = await refreshData();
            if (result.success) {
                toast(result.message || 'Sincronização concluída!', 'success');
            } else {
                toast(result.message || 'Erro na sincronização.', 'error');
            }
        } catch (error) {
            toast('Erro ao sincronizar. Verifique se o arquivo Excel está acessível.', 'error');
        } finally {
            // Wait a bit to show 100% before resetting
            setTimeout(() => {
                setIsSyncing(false);
                resetSyncProgress();
            }, 2000);
        }
    }

    const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

    return (
        <div className="w-full sm:w-auto flex-1">
            <Button
                variant="outline"
                disabled={isSyncing}
                onClick={handleSync}
                className="w-full h-[72px] flex flex-col items-center justify-center gap-1.5 shadow-sm border-border bg-white dark:bg-secondary hover:bg-muted/50 transition-all font-semibold active:scale-[0.98] px-1"
            >
                {isSyncing ? (
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                ) : (
                    <RefreshCw className="h-5 w-5 text-emerald-500" />
                )}
                <span className="text-[10px] leading-tight text-center">
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                </span>
            </Button>
        </div>
    );
}
