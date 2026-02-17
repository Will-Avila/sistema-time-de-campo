import { X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ImageViewerProps {
    isOpen: boolean;
    onClose: () => void;
    images: string[];
    initialIndex?: number;
    onDelete?: (index: number) => void;
    canDelete?: boolean;
}

export function ImageViewer({ isOpen, onClose, images, initialIndex = 0, onDelete, canDelete = false }: ImageViewerProps) {
    const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

    // Sync internal index if initialIndex changes when opening
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
        }
    }, [isOpen, initialIndex]);

    // Ensure index is valid if images change
    useEffect(() => {
        if (currentIndex >= images.length && images.length > 0) {
            setCurrentIndex(images.length - 1);
        } else if (images.length === 0 && isOpen) {
            onClose();
        }
    }, [images.length, currentIndex, isOpen, onClose]);

    const handleNext = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
    }, [images.length]);

    const handlePrev = useCallback(() => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    }, [images.length]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, handleNext, handlePrev]);

    if (!isOpen) return null;

    // Use portal to ensure it's on top of everything
    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors bg-black/20 p-2 rounded-full hover:bg-white/10 z-[10000]"
            >
                <X className="h-8 w-8" />
            </button>

            {/* Delete Button (Centralized) */}
            {onDelete && canDelete && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(currentIndex); }}
                    className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 hover:text-red-500 transition-all bg-black/20 p-3 rounded-full hover:bg-white/10 group z-[10000]"
                    title="Excluir foto"
                >
                    <Trash2 className="h-7 w-7 group-hover:scale-110" />
                </button>
            )}

            {/* Navigation Buttons */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                        className="absolute left-4 text-white/70 hover:text-white transition-colors hover:scale-110 p-2"
                    >
                        <ChevronLeft className="h-10 w-10 sm:h-12 sm:w-12" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        className="absolute right-4 text-white/70 hover:text-white transition-colors hover:scale-110 p-2"
                    >
                        <ChevronRight className="h-10 w-10 sm:h-12 sm:w-12" />
                    </button>
                </>
            )}

            {/* Image Container */}
            <div className="relative w-full h-full max-w-[90vw] max-h-[90vh] flex items-center justify-center pointer-events-none">
                <div className="relative w-full h-full pointer-events-auto">
                    <Image
                        src={images[currentIndex]}
                        alt={`Foto ${currentIndex + 1}`}
                        fill
                        className="object-contain"
                        quality={90}
                        priority
                    />
                </div>
            </div>

            {/* Counter */}
            {images.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 font-medium bg-black/40 px-3 py-1 rounded-full text-sm">
                    {currentIndex + 1} / {images.length}
                </div>
            )}
        </div>,
        document.body
    );
}

import * as React from 'react';
