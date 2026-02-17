'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { login } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const initialState = {
    message: '',
    errors: {} as Record<string, string[]>,
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button
            type="submit"
            className="w-full h-12 text-base font-bold transition-all text-white bg-primary hover:bg-primary/90"
            disabled={pending}
        >
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Acessando...
                </>
            ) : (
                <span className="flex items-center gap-2 justify-center">
                    Acessar Plataforma
                    <ArrowRight className="h-4 w-4" />
                </span>
            )}
        </Button>
    );
}

export default function LoginPage() {
    const [state, formAction] = useFormState(login, initialState);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans p-4">

            <div className="w-full max-w-sm mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-slate-100 mb-6">
                    <ShieldCheck className="h-12 w-12 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                    X-ON Serviços
                </h1>
                <p className="text-slate-500 text-sm">
                    Gestão de Equipes e Ordens de Serviço
                </p>
            </div>

            <Card className="w-full max-w-sm shadow-xl shadow-slate-200/50 border-0 rounded-xl bg-white animate-in fade-in zoom-in-95 duration-500 delay-100 overflow-hidden">
                <div className="h-1 w-full bg-primary/80" />
                <CardHeader className="pb-2 text-center pt-8">
                    <CardTitle className="text-lg font-semibold text-slate-800">
                        Bem-vindo(a)
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-6">
                    <form action={formAction} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700" htmlFor="username">
                                Usuário
                            </label>
                            <Input
                                id="username"
                                name="username"
                                className="h-12 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all rounded-lg"
                                placeholder="Digite seu usuário"
                                required
                            />
                            {state?.errors?.username && (
                                <p className="text-xs font-medium text-destructive mt-1">
                                    {state.errors.username[0]}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-slate-700" htmlFor="password">
                                    Senha
                                </label>
                            </div>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                className="h-12 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all rounded-lg"
                                placeholder="Digite sua senha"
                                required
                            />
                            {state?.errors?.password && (
                                <p className="text-xs font-medium text-destructive mt-1">
                                    {state.errors.password[0]}
                                </p>
                            )}
                        </div>

                        {state?.message && (
                            <div className="bg-red-50 text-red-600 text-sm p-4 rounded-lg font-medium border border-red-100 flex items-center justify-center">
                                {state.message}
                            </div>
                        )}

                        <div className="pt-2">
                            <SubmitButton />
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="mt-8 text-center animate-in fade-in duration-700 delay-300">
                <p className="text-xs text-slate-400 font-medium">
                    © 2026 X-ON Serviços
                </p>
            </div>
        </div>
    );
}
