'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { refreshData } from '@/actions/dashboard';

export function SyncDataButton() {
    const [isSyncing, setIsSyncing] = useState(false);

    async function handleSync() {
        setIsSyncing(true);
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
            setIsSyncing(false);
        }
    }

    return (
        <Button
            variant="outline"
            disabled={isSyncing}
            onClick={handleSync}
            className="gap-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 h-11 px-6 transition-colors shadow-md font-semibold"
        >
            {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
                <RefreshCw className="h-4 w-4 text-primary" />
            )}
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
        </Button>
    );
}
