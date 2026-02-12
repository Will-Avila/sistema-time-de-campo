'use client';

import { useState, useRef } from 'react';
import { updateChecklistItem, deleteChecklistPhoto, resetChecklistItem, uploadChecklistPhotos } from '@/actions/checklist';
import Image from 'next/image';
import { Card, CardHeader } from '@/components/ui/card';
import { CheckCircle2, Circle, Eye, MapPin, Trash2, Undo2, Camera, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageViewer } from '@/components/ui/image-viewer';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { CaixaItemData, ChecklistData } from '@/lib/types';

interface CaixaItemProps {
    item: CaixaItemData;
    osId: string;
    technicianName?: string;
    initialChecklist?: ChecklistData | null;
}

type Status = 'DONE' | 'PENDING' | 'UNTOUCHED';

export default function CaixaItem({ item, osId, technicianName, initialChecklist }: CaixaItemProps) {
    const [isOpen, setIsOpen] = useState(false);

    let initialStatus: Status = 'UNTOUCHED';
    if (item.done) {
        initialStatus = 'DONE';
    } else if (initialChecklist) {
        initialStatus = initialChecklist.done ? 'DONE' : 'PENDING';
    }
    const [status, setStatus] = useState<Status>(initialStatus);

    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showPhotos, setShowPhotos] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);


    // Viewer state
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

    // Form data
    const [power, setPower] = useState(initialChecklist?.power || '');

    // Confirm modal state
    const [confirmAction, setConfirmAction] = useState<{
        title: string;
        message: string;
        action: () => void;
    } | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        formData.append('done', 'true');

        const result = await updateChecklistItem(null, formData);

        if (result.success) {
            setStatus('DONE');
            setIsOpen(false);
            toast('Caixa concluída!', 'success');
        } else {
            toast(result.message || 'Erro ao salvar.', 'error');
        }
        setIsLoading(false);
    }

    async function handleMarkPending() {
        setIsLoading(true);

        const formData = new FormData();
        formData.append('osId', osId);
        formData.append('itemId', String(item.id || item.cto));
        formData.append('done', 'false');

        const result = await updateChecklistItem(null, formData);

        if (result.success) {
            setStatus('PENDING');
            setIsOpen(false);
            toast('Marcada como pendente.', 'warning');
        } else {
            toast(result.message || 'Erro ao atualizar.', 'error');
        }
        setIsLoading(false);
    }

    function requestDeletePhoto(photoId: string) {
        setConfirmAction({
            title: 'Excluir Foto',
            message: 'Tem certeza que deseja apagar esta foto? Esta ação não pode ser desfeita.',
            action: () => executeDeletePhoto(photoId),
        });
    }

    async function executeDeletePhoto(photoId: string) {
        setConfirmAction(null);
        setIsLoading(true);

        const result = await deleteChecklistPhoto(photoId, osId);

        if (result.success) {
            toast('Foto removida.', 'success');
        } else {
            toast(result.message || 'Erro ao remover foto.', 'error');
        }
        setIsLoading(false);
    }

    function requestReset() {
        setConfirmAction({
            title: 'Desmarcar Caixa',
            message: 'Dados e fotos desta caixa serão removidos. Deseja continuar?',
            action: executeReset,
        });
    }

    async function executeReset() {
        setConfirmAction(null);
        setIsLoading(true);

        const result = await resetChecklistItem(osId, String(item.id || item.cto));

        if (result.success) {
            setStatus('UNTOUCHED');
            setPower('');
            setShowPhotos(false);
            setIsOpen(false);
            toast('Caixa desmarcada.', 'success');
        } else {
            toast(result.message || 'Erro ao desmarcar.', 'error');
        }
        setIsLoading(false);
    }

    async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length === 0) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('osId', osId);
        formData.append('itemId', String(item.id || item.cto));

        Array.from(e.target.files).forEach(file => {
            formData.append('photos', file);
        });

        const result = await uploadChecklistPhotos(formData);

        if (result.success) {
            toast('Fotos adicionadas!', 'success');
            // Removed auto-pending status update as requested
        } else {
            toast(result.message || 'Erro ao enviar fotos.', 'error');
        }
        setIsUploading(false);
        // Reset input
        e.target.value = '';
    }

    // Styles based on status

    // Styles based on status
    const getStatusColor = () => {
        if (status === 'DONE') return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
        if (status === 'PENDING') return 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800';
        return 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700';
    };

    return (
        <Card className={`rounded-xl shadow-sm border transition-all ${getStatusColor()}`}>
            <div className="p-6">
                {/* Header: Cto + Status Trigger */}
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{item.cto}</h3>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => document.getElementById(`file-upload-${item.cto}`)?.click()}
                            disabled={isLoading || isUploading}
                            title="Adicionar Fotos"
                        >
                            <Camera className="h-5 w-5" />
                        </Button>
                        <input
                            type="file"
                            id={`file-upload-${item.cto}`}
                            className="hidden"
                            onChange={handlePhotoUpload}
                            multiple
                            accept="image/*"
                        />

                        {/* Interactive Switch Replacement */}
                        <button
                            onClick={() => setIsOpen(true)}
                            className={`group relative flex h-6 w-11 items-center rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${status === 'DONE' ? 'bg-primary border-primary' : (status === 'PENDING' ? 'bg-destructive border-destructive' : 'bg-slate-200 border-transparent')}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${status === 'DONE' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                    </div>
                </div>

                {/* Sub-info */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-primary font-medium">
                        <Circle className="h-3 w-3 fill-current" />
                        <span>{item.chassiPath}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{item.endereco}</span>
                    </div>
                    {(item.lat && item.long) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Globe className="h-4 w-4 shrink-0" />
                            <span>{item.lat}, {item.long}</span>
                        </div>
                    )}
                </div>

                {/* Result Data (Compact) */}
                {status === 'DONE' && initialChecklist && (
                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                            <div className="font-medium text-slate-700 dark:text-slate-300">
                                {initialChecklist.power && (
                                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Signal: {initialChecklist.power} dBm</span>
                                )}
                            </div>
                            {initialChecklist.photos.length > 0 && (
                                <Button variant="ghost" size="sm" onClick={() => setShowPhotos(!showPhotos)} className="h-7 text-xs gap-1 text-primary">
                                    <Eye className="h-3 w-3" /> Ver {initialChecklist.photos.length} Fotos
                                </Button>
                            )}
                        </div>
                        {technicianName && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">Técnico: <span className="font-medium text-slate-700 dark:text-slate-300">{technicianName}</span></p>
                        )}
                    </div>
                )}

                {/* Always show photos if they exist, regardless of status */}
                {(showPhotos || (status !== 'DONE' && initialChecklist && initialChecklist.photos.length > 0)) && initialChecklist?.photos && (
                    <div className="mt-3 grid grid-cols-5 sm:grid-cols-6 gap-2 animate-in fade-in duration-300">
                        {initialChecklist.photos.map((p, idx) => (
                            <div key={p.id} className="relative aspect-square overflow-hidden rounded-md border border-slate-100 dark:border-slate-700 shadow-sm group/photo">
                                <Image
                                    src={p.path}
                                    alt="Foto"
                                    fill
                                    className="object-cover transition-transform hover:scale-110 cursor-pointer"
                                    onClick={() => {
                                        setViewerInitialIndex(idx);
                                        setViewerOpen(true);
                                    }}
                                />
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); requestDeletePhoto(p.id); }}
                                    className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-full opacity-0 group-hover/photo:opacity-100 transition-opacity hover:bg-red-600"
                                    title="Excluir foto"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Map Link */}
                {item.lat && item.long && (
                    <a
                        href={`https://www.google.com/maps?q=${item.lat},${item.long}`}
                        target="_blank"
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 dark:bg-blue-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 dark:hover:bg-blue-600 shadow-sm"
                    >
                        Abrir no Mapa
                    </a>
                )}
            </div>

            {/* Photo Viewer */}
            <ImageViewer
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                images={initialChecklist?.photos.map(p => p.path) || []}
                initialIndex={viewerInitialIndex}
            />

            {/* MODAL */}
            {
                isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <Card className="w-full max-w-md overflow-hidden relative shadow-2xl dark:bg-slate-900 dark:border-slate-700">
                            <CardHeader className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700 pb-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Atualizar Caixa {item.cto}</h3>
                                    <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">✕</button>
                                </div>
                            </CardHeader>

                            <div className="p-6">
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <input type="hidden" name="osId" value={osId} />
                                    <input type="hidden" name="itemId" value={String(item.id || item.cto)} />

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium leading-none text-slate-700 dark:text-slate-300">Potência (dBm)</label>
                                        <Input
                                            type="number"
                                            name="power"
                                            step="0.01"
                                            min="-50"
                                            max="-10"
                                            required={status !== 'PENDING'}
                                            value={power}
                                            onChange={e => setPower(e.target.value)}
                                            placeholder="-25"
                                            className="font-mono text-lg"
                                        />
                                        <p className="text-xs text-muted-foreground">Faixa aceita: -10 a -50 dBm</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            onClick={handleMarkPending}
                                            disabled={isLoading}
                                            className="w-full"
                                        >
                                            Marcar Pendente
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full"
                                        >
                                            {isLoading ? 'Salvando...' : 'Concluir'}
                                        </Button>
                                    </div>

                                    {(status === 'DONE' || status === 'PENDING') && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={requestReset}
                                            disabled={isLoading}
                                            className="w-full mt-2 gap-2 text-slate-500 dark:text-slate-400"
                                        >
                                            <Undo2 className="h-4 w-4" />
                                            Desmarcar
                                        </Button>
                                    )}
                                </form>
                            </div>
                        </Card>
                    </div>
                )
            }

            {/* Confirm Modal */}
            <ConfirmModal
                open={!!confirmAction}
                title={confirmAction?.title || ''}
                message={confirmAction?.message || ''}
                variant="danger"
                confirmLabel="Sim, continuar"
                onConfirm={() => confirmAction?.action()}
                onCancel={() => setConfirmAction(null)}
            />
        </Card >
    );
}
