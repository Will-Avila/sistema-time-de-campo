'use client';

import { useState } from 'react';
import { updateProfile } from '@/actions/equipe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Save, User as UserIcon, Phone, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProfileFormProps {
    user: {
        name: string;
        fullName: string | null;
        phone: string | null;
    };
}

export default function ProfileForm({ user }: ProfileFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setMessage(null);

        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (password && password !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            setIsLoading(false);
            return;
        }

        const res = await updateProfile({
            name: formData.get('name') as string,
            fullName: formData.get('fullName') as string,
            phone: formData.get('phone') as string,
            password: password || undefined,
        });

        if (res.success) {
            setMessage({ type: 'success', text: res.message || 'Perfil atualizado!' });
            router.refresh();
        } else {
            setMessage({ type: 'error', text: res.message || 'Erro ao atualizar.' });
        }
        setIsLoading(false);
    }

    return (
        <Card className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <UserIcon className="h-6 w-6 text-primary" />
                    Editar Perfil
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                    Atualize suas informações pessoais e credenciais de acesso.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form action={handleSubmit} className="space-y-6">
                    {message && (
                        <div className={`p-3 rounded-md text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none text-slate-700 dark:text-slate-300">Nome Completo</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    name="fullName"
                                    defaultValue={user.fullName || ''}
                                    placeholder="Seu nome completo"
                                    className="pl-9 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none text-slate-700 dark:text-slate-300">Telefone</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    name="phone"
                                    defaultValue={user.phone || ''}
                                    placeholder="(00) 00000-0000"
                                    className="pl-9 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none text-slate-700 dark:text-slate-300">Nome de Usuário (Login)</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    name="name"
                                    defaultValue={user.name}
                                    required
                                    placeholder="usuario.sistema"
                                    className="pl-9 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                                />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Este é o nome usado para entrar no sistema.</p>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <Lock className="h-4 w-4 text-slate-400" />
                                Alterar Senha
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none text-slate-700 dark:text-slate-300">Nova Senha</label>
                                    <Input
                                        name="password"
                                        type="password"
                                        placeholder="Min. 6 caracteres"
                                        minLength={6}
                                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none text-slate-700 dark:text-slate-300">Confirmar Senha</label>
                                    <Input
                                        name="confirmPassword"
                                        type="password"
                                        placeholder="Repita a senha"
                                        minLength={6}
                                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Deixe em branco se não quiser alterar a senha.</p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={isLoading} className="min-w-[120px]">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Salvar Alterações
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
