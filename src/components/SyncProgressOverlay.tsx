'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export function SyncProgressOverlay() {
    const [progress, setProgress] = useState({ current: 0, total: 0, message: '', status: 'IDLE', lastUpdate: 0 });
    const [isVisible, setIsVisible] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Polling contínuo: verifica o servidor a cada 2s, SEMPRE.
        // Isso garante que o overlay detecte qualquer sincronização iniciada.
        intervalRef.current = setInterval(async () => {
            try {
                const res = await fetch('/api/sync-progress');
                if (!res.ok) return;
                const p = await res.json();
                setProgress(p);

                if (p.status === 'RUNNING') {
                    setIsVisible(true);
                } else if (p.status === 'COMPLETED' || p.status === 'ERROR') {
                    // Mostra brevemente se foi recente (últimos 10s)
                    const isRecent = (Date.now() - p.lastUpdate) < 10000;
                    if (isRecent) {
                        setIsVisible(true);
                    } else {
                        setIsVisible(false);
                    }
                } else {
                    // IDLE
                    setIsVisible(false);
                }
            } catch (e) {
                // Silencioso em caso de erro de rede
            }
        }, 2000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    if (!isVisible) return null;

    const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

    return (
        <div className="fixed bottom-6 right-6 w-80 bg-card border border-border rounded-xl shadow-2xl p-4 z-[9999] animate-in slide-in-from-bottom-4 transition-all duration-500">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {progress.status === 'RUNNING' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {progress.status === 'COMPLETED' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    {progress.status === 'ERROR' && <AlertCircle className="h-4 w-4 text-rose-500" />}
                    <span className="text-sm font-bold text-foreground">
                        {progress.status === 'COMPLETED' ? 'Concluído' : progress.status === 'ERROR' ? 'Erro' : 'Sincronizando Dados'}
                    </span>
                </div>
                <span className="text-sm font-bold text-primary">{percentage}%</span>
            </div>

            <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-2">
                <div
                    className={`h-full transition-all duration-500 rounded-full ${progress.status === 'ERROR' ? 'bg-rose-500' : 'bg-primary'}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            <p className="text-[10px] text-muted-foreground truncate font-medium uppercase tracking-wider">
                {progress.message || 'Processando...'}
            </p>
        </div>
    );
}
