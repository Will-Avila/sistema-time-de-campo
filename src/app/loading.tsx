import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm animate-pulse">Carregando...</p>
            </div>
        </div>
    );
}
