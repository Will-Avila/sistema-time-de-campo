import Link from 'next/link';
import { FileText, Wrench, ClipboardList, ShoppingBasket, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MaterialManager from './MaterialManager';
import OSClosureForm from './OSClosureForm';

interface OSActionMenuProps {
    osId: string;
    hasLanca: boolean;
    showClosure: boolean;
    session: any;
    activeTab?: 'detalhes' | 'caixas' | 'lanca' | 'material' | 'encerrar';
}

export function OSActionMenu({ osId, hasLanca, showClosure, session, activeTab }: OSActionMenuProps) {
    return (
        <div className="grid grid-cols-5 gap-1.5 w-full min-w-[280px]">
            <Link href={`/os/${osId}`} className="w-full">
                <Button variant="outline" className={`w-full h-[72px] flex flex-col items-center justify-center gap-1.5 shadow-sm transition-all font-semibold active:scale-[0.98] px-0.5 ${activeTab === 'detalhes' ? 'bg-primary/5 dark:bg-primary/10 border-primary/30 ring-1 ring-primary/20' : 'bg-white dark:bg-secondary border-border hover:bg-muted/50'}`}>
                    <FileText className={`h-5 w-5 ${activeTab === 'detalhes' ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span className="text-[9px] sm:text-[10px] leading-tight text-center">Detalhes</span>
                </Button>
            </Link>

            <Link href={`/os/${osId}/execution`} className="w-full">
                <Button variant="outline" className={`w-full h-[72px] flex flex-col items-center justify-center gap-1.5 shadow-sm transition-all font-semibold active:scale-[0.98] px-0.5 ${activeTab === 'caixas' ? 'bg-[#4da8bc]/5 dark:bg-[#4da8bc]/10 border-[#4da8bc]/30 ring-1 ring-[#4da8bc]/20' : 'bg-white dark:bg-secondary border-border hover:bg-muted/50'}`}>
                    <Wrench className={`h-5 w-5 ${activeTab === 'caixas' ? 'text-[#4da8bc]' : 'text-[#4da8bc]/70'}`} />
                    <span className="text-[9px] sm:text-[10px] leading-tight text-center">Caixas</span>
                </Button>
            </Link>

            {hasLanca || activeTab === 'lanca' ? (
                <Link href={`/os/${osId}/lanca`} className={`w-full ${activeTab === 'lanca' ? 'pointer-events-none' : ''}`}>
                    <Button variant="outline" className={`w-full h-[72px] flex flex-col items-center justify-center gap-1.5 shadow-sm transition-all font-semibold active:scale-[0.98] px-0.5 ${activeTab === 'lanca' ? 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/30 ring-1 ring-blue-500/20' : 'bg-white dark:bg-secondary border-border hover:bg-muted/50'}`}>
                        <ClipboardList className={`h-5 w-5 ${activeTab === 'lanca' ? 'text-blue-500' : 'text-blue-500/70'}`} />
                        <span className="text-[9px] sm:text-[10px] leading-tight text-center">Lança</span>
                    </Button>
                </Link>
            ) : (
                <Button variant="outline" disabled className="w-full h-[72px] flex flex-col items-center justify-center gap-1.5 shadow-none border-border/50 bg-white dark:bg-secondary opacity-60 font-semibold cursor-not-allowed px-0.5">
                    <ClipboardList className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[9px] sm:text-[10px] leading-tight text-center">Lança</span>
                </Button>
            )}

            <MaterialManager
                osId={osId}
                session={session}
                customTrigger={
                    <Button variant="outline" className={`w-full h-[72px] flex flex-col items-center justify-center gap-1.5 shadow-sm transition-all font-semibold active:scale-[0.98] px-0.5 ${activeTab === 'material' ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20' : 'bg-white dark:bg-secondary border-border hover:bg-muted/50'}`}>
                        <ShoppingBasket className={`h-5 w-5 ${activeTab === 'material' ? 'text-amber-500' : 'text-amber-500/80'}`} />
                        <span className="text-[9px] sm:text-[10px] leading-tight text-center">Material</span>
                    </Button>
                }
            />

            <OSClosureForm
                osId={osId}
                disabled={!showClosure}
                customTrigger={
                    <Button variant="outline" disabled={!showClosure} className="w-full h-[72px] flex flex-col items-center justify-center gap-1.5 shadow-sm border-border bg-white dark:bg-secondary hover:bg-emerald-500/10 hover:text-emerald-700 hover:border-emerald-500/30 transition-all font-semibold disabled:pointer-events-none disabled:opacity-60 px-0.5">
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                        <span className="text-[9px] sm:text-[10px] leading-tight text-center">Encerrar</span>
                    </Button>
                }
            />
        </div>
    );
}
