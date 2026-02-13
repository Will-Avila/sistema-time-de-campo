'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImageViewer } from '@/components/ui/image-viewer';

import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Trash2 } from 'lucide-react';
import { deleteExecutionPhoto } from '@/actions/execution';
import { toast } from '@/components/ui/toast';

interface Photo {
    id: string;
    path: string;
    caixaId?: string | null;
}

interface OSPhotosGalleryProps {
    photos: Photo[];
    osId: string;
    allowDelete?: boolean;
}

export function OSPhotosGallery({ photos, osId, allowDelete = false }: OSPhotosGalleryProps) {
    const [viewerOpen, setViewerOpen] = useState(false);
    const [initialIndex, setInitialIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const [confirmAction, setConfirmAction] = useState<{
        title: string;
        message: string;
        action: () => void;
    } | null>(null);

    function requestDeletePhoto(photoId: string) {
        setConfirmAction({
            title: 'Excluir Foto',
            message: 'Tem certeza que deseja apagar esta foto permanently? Esta ação não pode ser desfeita.',
            action: () => executeDeletePhoto(photoId),
        });
    }

    async function executeDeletePhoto(photoId: string) {
        setConfirmAction(null);
        setIsLoading(true);

        const result = await deleteExecutionPhoto(photoId, osId);

        if (result.success) {
            toast('Foto removida.', 'success');
        } else {
            toast(result.message || 'Erro ao remover foto.', 'error');
        }
        setIsLoading(false);
    }

    if (photos.length === 0) return null;

    return (
        <>
            <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                    Evidências Fotográficas
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {photos.map((photo, idx) => (
                        <div
                            key={photo.id}
                            className="relative aspect-square group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer"
                            onClick={() => {
                                setInitialIndex(idx);
                                setViewerOpen(true);
                            }}
                        >
                            <Image
                                src={photo.path}
                                alt="Evidência"
                                fill
                                className="object-cover transition-transform hover:scale-105"
                            />
                            {allowDelete && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        requestDeletePhoto(photo.id);
                                    }}
                                    className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                                    title="Excluir foto"
                                    disabled={isLoading}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <ImageViewer
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                images={photos.map(p => p.path)}
                initialIndex={initialIndex}
            />

            <ConfirmModal
                open={!!confirmAction}
                title={confirmAction?.title || ''}
                message={confirmAction?.message || ''}
                variant="danger"
                confirmLabel="Sim, excluir"
                onConfirm={() => confirmAction?.action()}
                onCancel={() => setConfirmAction(null)}
            />
        </>
    );
}
