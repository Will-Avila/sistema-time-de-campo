'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createTechnician, deleteTechnician, updateTechnician } from '@/actions/technician';
import { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserPlus, Shield, Pencil, X, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';

function SubmitButton({ label = 'Adicionar Técnico', icon = UserPlus }: { label?: string, icon?: any }) {
    const { pending } = useFormStatus();
    const Icon = icon;
    return (
        <Button type="submit" disabled={pending} className="w-full md:w-auto min-w-[140px]">
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                </>
            ) : (
                <>
                    <Icon className="mr-2 h-4 w-4" />
                    {label}
                </>
            )}
        </Button>
    );
}

function HiddenSubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="flex-1" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                </>
            ) : (
                'Salvar Alterações'
            )}
        </Button>
    )
}

export default function TechnicianManager({ technicians }: { technicians: any[] }) {
    const ref = useRef<HTMLFormElement>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [editTarget, setEditTarget] = useState<any | null>(null);

    // Create Action
    const [createState, createAction] = useFormState(async (prevState: any, formData: FormData) => {
        const result = await createTechnician(prevState, formData);
        if (result.success) {
            ref.current?.reset();
            toast(result.message || 'Usuário criado!', 'success');
        } else {
            toast(result.message || 'Erro ao criar.', 'error');
        }
        return result;
    }, null);

    // Edit Action
    async function handleEditSubmit(formData: FormData) {
        if (!editTarget) return;
        const data: any = {
            name: formData.get('name') as string,
            fullName: formData.get('fullName') as string,
            phone: formData.get('phone') as string,
            isAdmin: formData.get('isAdmin') === 'true'
        };
        const password = formData.get('password') as string;
        if (password) data.password = password;

        if (!/^[a-zA-Z0-9]+$/.test(data.name)) {
            toast('Nome de usuário inválido (apenas letras e números).', 'error');
            return;
        }

        const result = await updateTechnician(editTarget.id, data);
        if (result.success) {
            setEditTarget(null);
            toast('Usuário atualizado!', 'success');
        } else {
            toast(result.message || 'Erro ao atualizar.', 'error');
        }
    }

    async function executeDelete() {
        if (!deleteTarget) return;
        await deleteTechnician(deleteTarget.id);
        setDeleteTarget(null);
        toast('Técnico removido.', 'success');
    }

    const [usernameError, setUsernameError] = useState('');

    function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
        const val = e.target.value;
        if (val && !/^[a-zA-Z0-9]+$/.test(val)) {
            setUsernameError('Apenas letras e números, sem espaços.');
        } else {
            setUsernameError('');
        }
    }

    return (
        <div className="space-y-6">
            {/* Create Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Adicionar Novo Usuário</CardTitle>
                    <CardDescription>Crie uma conta de acesso para os técnicos ou administradores.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form ref={ref} action={createAction} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none">Nome de Usuário (Login)</label>
                                <Input
                                    name="name"
                                    type="text"
                                    placeholder="ex: joaosilva"
                                    required
                                    className={usernameError ? "border-red-500" : ""}
                                    onChange={handleUsernameChange}
                                />
                                {usernameError && <p className="text-xs text-red-500">{usernameError}</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none">Senha</label>
                                <Input name="password" type="text" placeholder="Min. 6 caracteres" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none">Nome Completo</label>
                                <Input name="fullName" type="text" placeholder="Ex: João da Silva" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none">Telefone</label>
                                <Input name="phone" type="text" placeholder="(DD) 99999-9999" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none block">Permissão</label>
                                <select
                                    name="isAdmin"
                                    className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="false">Técnico</option>
                                    <option value="true">Admin</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <SubmitButton label="Criar Usuário" icon={UserPlus} />
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* List */}
            <Card>
                <CardHeader>
                    <CardTitle>Usuários Cadastrados</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b">
                                <tr className="text-left">
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Usuário</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Nome Completo</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-32">Permissão</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {technicians.map((tech) => (
                                    <tr key={tech.id} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle font-medium">
                                            {tech.name}
                                            <div className="text-xs text-muted-foreground md:hidden">{tech.fullName}</div>
                                        </td>
                                        <td className="p-4 align-middle hidden md:table-cell">{tech.fullName || '-'}</td>
                                        <td className="p-4 align-middle">
                                            {tech.isAdmin ? (
                                                <Badge className="bg-slate-900">Admin</Badge>
                                            ) : (
                                                <Badge variant="secondary">Técnico</Badge>
                                            )}
                                        </td>
                                        <td className="p-4 align-middle text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    onClick={() => setEditTarget(tech)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => setDeleteTarget({ id: tech.id, name: tech.name })}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Modal */}
            {editTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-md relative shadow-xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle>Editar Usuário</CardTitle>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTarget(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <form action={handleEditSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none">Nome de Usuário</label>
                                    <Input name="name" defaultValue={editTarget.name} required pattern="[a-zA-Z0-9]+" title="Apenas letras e números, sem espaços" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none">Nome Completo</label>
                                    <Input name="fullName" defaultValue={editTarget.fullName} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none">Telefone</label>
                                    <Input name="phone" defaultValue={editTarget.phone} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none">Senha</label>
                                    <Input name="password" type="text" placeholder="Nova senha (deixe em branco para manter)" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none">Permissão</label>
                                    <select
                                        name="isAdmin"
                                        defaultValue={String(editTarget.isAdmin)}
                                        className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <option value="false">Técnico</option>
                                        <option value="true">Admin</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <Button type="button" variant="outline" className="flex-1" onClick={() => setEditTarget(null)}>Cancelar</Button>
                                    <HiddenSubmitButton />
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Confirm Delete Modal */}
            <ConfirmModal
                open={!!deleteTarget}
                title="Remover Usuário"
                message={`Tem certeza que deseja remover "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
                variant="danger"
                confirmLabel="Remover"
                onConfirm={executeDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
