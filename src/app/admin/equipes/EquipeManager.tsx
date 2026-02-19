'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createEquipe, deleteEquipe, updateEquipe } from '@/actions/equipe';
import { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserPlus, Shield, Pencil, X, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';

function SubmitButton({ label = 'Adicionar Usuário', icon = UserPlus }: { label?: string, icon?: any }) {
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

export default function EquipeManager({ equipes }: { equipes: any[] }) {
    const ref = useRef<HTMLFormElement>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [editTarget, setEditTarget] = useState<any | null>(null);

    // Create Action
    const [createState, createAction] = useFormState(async (prevState: any, formData: FormData) => {
        const result = await createEquipe(prevState, formData);
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
            role: formData.get('role') as string
        };
        const password = formData.get('password') as string;
        if (password) data.password = password;

        if (!/^[a-zA-Z0-9]+$/.test(data.name)) {
            toast('Nome de usuário inválido (apenas letras e números).', 'error');
            return;
        }

        const result = await updateEquipe(editTarget.id, data);
        if (result.success) {
            setEditTarget(null);
            toast('Usuário atualizado!', 'success');
        } else {
            toast(result.message || 'Erro ao atualizar.', 'error');
        }
    }

    async function executeDelete() {
        if (!deleteTarget) return;
        await deleteEquipe(deleteTarget.id);
        setDeleteTarget(null);
        toast('Usuário removido.', 'success');
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
                    <CardTitle>Adicionar Novo Usuário / Equipe</CardTitle>
                    <CardDescription>Crie uma conta de acesso para os técnicos (equipes) ou administradores.</CardDescription>
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
                                <label className="text-sm font-medium leading-none block">Cargo / Permissão</label>
                                <select
                                    name="role"
                                    className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="USER">Equipe / Técnico</option>
                                    <option value="SUPERVISOR">Gestor</option>
                                    <option value="ADMIN">Administrador</option>
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
                    {/* Desktop View (Table) */}
                    <div className="hidden md:block rounded-md border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b">
                                <tr className="text-left">
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Usuário</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Nome Completo</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Telefone</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-32">Nível</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {equipes.map((equipe) => (
                                    <tr key={equipe.id} className="transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle font-medium">{equipe.name}</td>
                                        <td className="p-4 align-middle">{equipe.fullName || '-'}</td>
                                        <td className="p-4 align-middle">
                                            {equipe.phone ? (
                                                <a
                                                    href={`https://wa.me/55${equipe.phone.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 text-muted-foreground hover:text-green-600 transition-colors group"
                                                >
                                                    <svg
                                                        viewBox="0 0 24 24"
                                                        fill="currentColor"
                                                        className="h-5 w-5 text-green-500/80 group-hover:text-green-600 transition-all"
                                                    >
                                                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.585 1.85.892 2.796.892 3.183 0 5.768-2.586 5.768-5.766-5e-4-3.18-2.585-5.779-5.768-5.779zm0 10c-.793 0-1.551-.237-2.181-.61l-.147-.091-1.492.391.398-1.455-.098-.168c-.461-.795-.71-1.579-.711-2.301.001-2.327 1.896-4.225 4.231-4.225 2.329 0 4.226 1.896 4.226 4.227 0 2.331-1.899 4.232-4.226 4.232zm2.149-3.297c-.113-.057-.667-.329-.771-.367-.103-.038-.179-.057-.254.057-.076.114-.291.368-.358.444-.067.076-.134.086-.247.029-.115-.057-.49-.181-.925-.568-.34-.303-.57-.677-.635-.792-.067-.114-.007-.176.05-.233.05-.05.113-.133.171-.199.057-.067.075-.114.113-.19.038-.076.019-.143-.01-.199-.029-.057-.254-.613-.349-.838-.093-.221-.188-.191-.257-.195l-.219-.005c-.076 0-.199.028-.303.143-.105.114-.403.394-.403.96 0 .567.412 1.115.47 1.191.058.077.81 1.238 1.965 1.737.954.412.954.275 1.309.256.354-.019 1.115-.456 1.229-.896.114-.44.114-.818.08-.875-.034-.057-.125-.091-.238-.148z" />
                                                    </svg>
                                                    {equipe.phone}
                                                </a>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 align-middle">
                                            {equipe.role === 'ADMIN' ? (
                                                <Badge className="bg-primary">Admin</Badge>
                                            ) : equipe.role === 'SUPERVISOR' ? (
                                                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Gestor</Badge>
                                            ) : (
                                                <Badge variant="secondary">Equipe</Badge>
                                            )}
                                        </td>
                                        <td className="p-4 align-middle text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    onClick={() => setEditTarget(equipe)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => setDeleteTarget({ id: equipe.id, name: equipe.name })}
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

                    {/* Mobile View (Cards) */}
                    <div className="md:hidden space-y-4">
                        {equipes.map((equipe) => (
                            <div key={equipe.id} className="p-4 border rounded-lg space-y-3 bg-card shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-foreground">{equipe.name}</p>
                                        <p className="text-xs text-muted-foreground">{equipe.fullName || 'Sem nome completo'}</p>
                                    </div>
                                    {equipe.role === 'ADMIN' ? (
                                        <Badge className="bg-primary">Admin</Badge>
                                    ) : equipe.role === 'SUPERVISOR' ? (
                                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Gestor</Badge>
                                    ) : (
                                        <Badge variant="secondary">Equipe</Badge>
                                    )}
                                </div>

                                {equipe.phone && (
                                    <div className="pt-1">
                                        <a
                                            href={`https://wa.me/55${equipe.phone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-green-600"
                                        >
                                            <svg
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                                className="h-5 w-5 text-green-500"
                                            >
                                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.585 1.85.892 2.796.892 3.183 0 5.768-2.586 5.768-5.766-5e-4-3.18-2.585-5.779-5.768-5.779zm0 10c-.793 0-1.551-.237-2.181-.61l-.147-.091-1.492.391.398-1.455-.098-.168c-.461-.795-.71-1.579-.711-2.301.001-2.327 1.896-4.225 4.231-4.225 2.329 0 4.226 1.896 4.226 4.227 0 2.331-1.899 4.232-4.226 4.232zm2.149-3.297c-.113-.057-.667-.329-.771-.367-.103-.038-.179-.057-.254.057-.076.114-.291.368-.358.444-.067.076-.134.086-.247.029-.115-.057-.49-.181-.925-.568-.34-.303-.57-.677-.635-.792-.067-.114-.007-.176.05-.233.05-.05.113-.133.171-.199.057-.067.075-.114.113-.19.038-.076.019-.143-.01-.199-.029-.057-.254-.613-.349-.838-.093-.221-.188-.191-.257-.195l-.219-.005c-.076 0-.199.028-.303.143-.105.114-.403.394-.403.96 0 .567.412 1.115.47 1.191.058.077.81 1.238 1.965 1.737.954.412.954.275 1.309.256.354-.019 1.115-.456 1.229-.896.114-.44.114-.818.08-.875-.034-.057-.125-.091-.238-.148z" />
                                            </svg>
                                            {equipe.phone}
                                        </a>
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2 border-t">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 h-9 gap-1.5 text-blue-600 border-blue-100 hover:bg-blue-50"
                                        onClick={() => setEditTarget(equipe)}
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                        Editar
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 h-9 gap-1.5 text-destructive border-destructive/10 hover:bg-destructive/5"
                                        onClick={() => setDeleteTarget({ id: equipe.id, name: equipe.name })}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Remover
                                    </Button>
                                </div>
                            </div>
                        ))}
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
                                    <label className="text-sm font-medium leading-none">Cargo / Permissão</label>
                                    <select
                                        name="role"
                                        defaultValue={editTarget.role || (editTarget.isAdmin ? 'ADMIN' : 'USER')}
                                        className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <option value="USER">Equipe / Responsável</option>
                                        <option value="SUPERVISOR">Gestor</option>
                                        <option value="ADMIN">Administrador</option>
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
