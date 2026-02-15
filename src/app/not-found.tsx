import Link from 'next/link';
import { MapPinOff, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeaderServer } from '@/components/layout/HeaderServer';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />

            <HeaderServer />

            <main className="flex-1 flex items-center justify-center p-6 relative z-10">
                <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center justify-center blur-2xl opacity-20">
                            <span className="text-[180px] font-black text-primary select-none">404</span>
                        </div>
                        <div className="relative flex justify-center">
                            <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-slate-800/50 p-8 rounded-3xl shadow-2xl">
                                <MapPinOff className="h-16 w-16 text-primary animate-bounce" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Página não encontrada
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 text-lg">
                            Parece que você se perdeu em campo. O endereço que você procura não existe ou foi movido.
                        </p>
                    </div>

                    <div className="flex justify-center pt-8">
                        <Link href="/">
                            <Button
                                size="lg"
                                className="h-14 px-10 rounded-full font-bold text-white bg-gradient-to-r from-primary to-primary/80 shadow-[0_10px_30px_-10px_rgba(var(--primary),0.5)] hover:shadow-xl hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all duration-300 group"
                            >
                                <Home className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                                Voltar ao Início
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>

            <footer className="p-8 text-center text-sm text-slate-400/60 dark:text-slate-600">
                &copy; {new Date().getFullYear()} XON Serviços - Sistema Time de Campo
            </footer>
        </div>
    );
}
