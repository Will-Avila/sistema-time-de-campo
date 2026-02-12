'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { saveOSAdminInfo } from '@/actions/os-extra';
import { Upload, X, Save, Paperclip } from 'lucide-react';
import { toast } from 'sonner';

interface OSAttachment {
    id: string;
    name: string;
    path: string;
    size: number;
    type: string;
}

interface OSAdminEditFormProps {
    osId: string;
    initialData?: {
        condominio?: string | null;
        descricao?: string | null;
        attachments?: OSAttachment[];
    } | null;
}

export function OSAdminEditForm({ osId, initialData }: OSAdminEditFormProps) {
    const [loading, setLoading] = useState(false);
    const [condominio, setCondominio] = useState(initialData?.condominio || '');
    const [descricao, setDescricao] = useState(initialData?.descricao || '');
    const [files, setFiles] = useState<File[]>([]);
    // Cast initialData.attachments to OSAttachment[] to ensure type safety
    const [existingFiles, setExistingFiles] = useState<OSAttachment[]>((initialData?.attachments as OSAttachment[]) || []);
    const [deletedFileIds, setDeletedFileIds] = useState<string[]>([]);
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
        }
    };

    const removeNewFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleDeleteExisting = (fileId: string) => {
        setExistingFiles(prev => prev.filter(f => f.id !== fileId));
        setDeletedFileIds(prev => [...prev, fileId]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData();
        formData.append('osId', osId);
        formData.append('condominio', condominio);
        formData.append('descricao', descricao);
        files.forEach(file => {
            formData.append('files', file);
        });
        deletedFileIds.forEach(id => {
            formData.append('deletedFileIds', id);
        });

        const result = await saveOSAdminInfo(formData);

        if (result.success) {
            toast.success('Informações atualizadas com sucesso!');
            router.push(`/os/${osId}`);
            router.refresh();
        } else {
            toast.error(result.message || 'Erro ao salvar informações.');
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Nome do Condomínio
                </label>
                <Input
                    value={condominio}
                    onChange={e => setCondominio(e.target.value)}
                    placeholder="Ex: Condomínio Garden Park"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Descrição / Observações
                </label>
                <Textarea
                    value={descricao}
                    onChange={e => setDescricao(e.target.value)}
                    placeholder="Informações adicionais para a equipe..."
                    className="h-40 resize-y"
                />
            </div>

            <div className="space-y-3">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Anexos
                </label>

                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors relative group">
                    <input
                        type="file"
                        multiple
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        onChange={handleFileChange}
                    />
                    <div className="flex flex-col items-center gap-2">
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                            <Upload className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                Clique para fazer upload
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                ou arraste e solte arquivos aqui
                            </p>
                        </div>
                    </div>
                </div>

                {/* File List */}
                {(existingFiles.length > 0 || files.length > 0) && (
                    <div className="space-y-2 mt-4">
                        {existingFiles.map(file => (
                            <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{file.name}</span>
                                        <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    onClick={() => handleDeleteExisting(file.id)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        {files.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <Upload className="h-4 w-4 text-blue-500 shrink-0" />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{file.name}</span>
                                        <span className="text-xs text-blue-600 dark:text-blue-400">Novo arquivo</span>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    onClick={() => removeNewFile(idx)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-4">
                <Button
                    type="submit"
                    disabled={loading}
                    className="min-w-[140px] bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    size="lg"
                >
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Salvando...
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Save className="h-4 w-4" />
                            Salvar Alterações
                        </div>
                    )}
                </Button>
            </div>
        </form>
    );
}
