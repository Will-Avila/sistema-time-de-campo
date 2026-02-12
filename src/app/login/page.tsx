'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { login } from '@/actions/auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Loader2 } from 'lucide-react';

const initialState = {
    message: '',
    errors: {} as Record<string, string[]>,
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                </>
            ) : (
                'Entrar na Plataforma'
            )}
        </Button>
    );
}

export default function LoginPage() {
    const [state, formAction] = useFormState(login, initialState);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-40">
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
            </div>

            <Card className="w-full max-w-md shadow-xl border-slate-200 relative z-10 bg-white/90 backdrop-blur-sm">
                <CardHeader className="text-center pb-2">
                    <div className="flex justify-center mb-4">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <ShieldCheck className="h-10 w-10 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">XON Serviços</CardTitle>
                    <CardDescription>
                        Acesso restrito para equipes e administradores
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="username">
                                Usuário
                            </label>
                            <Input
                                id="username"
                                name="username"
                                placeholder="Seu usuário de acesso"
                                required
                            />
                            {state?.errors?.username && (
                                <p className="text-sm text-destructive">{state.errors.username[0]}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">
                                Senha
                            </label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                            />
                            {state?.errors?.password && (
                                <p className="text-sm text-destructive">{state.errors.password[0]}</p>
                            )}
                        </div>

                        {state?.message && (
                            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20 text-center">
                                {state.message}
                            </div>
                        )}

                        <div className="pt-2">
                            <SubmitButton />
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="justify-center pt-0 pb-6">
                    <p className="text-xs text-muted-foreground text-center">
                        © 2026 XON Serviços. Todos os direitos reservados.
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
