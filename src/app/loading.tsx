import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-slate-500 dark:text-slate-400 text-sm animate-pulse">Carregando...</p>
            </div>
        </div>
    );
}
