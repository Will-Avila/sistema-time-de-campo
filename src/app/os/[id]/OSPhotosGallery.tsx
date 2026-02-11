'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImageViewer } from '@/components/ui/image-viewer';

interface Photo {
    id: string;
    path: string;
}

interface OSPhotosGalleryProps {
    photos: Photo[];
}

export function OSPhotosGallery({ photos }: OSPhotosGalleryProps) {
    const [viewerOpen, setViewerOpen] = useState(false);
    const [initialIndex, setInitialIndex] = useState(0);

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
        </>
    );
}
