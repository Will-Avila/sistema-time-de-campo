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
    const [touchStart, setTouchStart] = React.useState<{ x: number, y: number } | null>(null);
    const [touchEnd, setTouchEnd] = React.useState<{ x: number, y: number } | null>(null);
    const [scale, setScale] = React.useState(1);
    const [offset, setOffset] = React.useState({ x: 0, y: 0 });
    const [initialDistance, setInitialDistance] = React.useState<number | null>(null);

    // Sync internal index if initialIndex changes when opening
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            resetZoom();
        }
    }, [isOpen, initialIndex]);

    // Ensure index is valid if images change
    useEffect(() => {
        if (currentIndex >= images.length && images.length > 0) {
            setCurrentIndex(images.length - 1);
            resetZoom();
        } else if (images.length === 0 && isOpen) {
            onClose();
        }
    }, [images.length, currentIndex, isOpen, onClose]);

    const resetZoom = () => {
        setScale(1);
        setOffset({ x: 0, y: 0 });
    };

    const handleNext = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
        resetZoom();
    }, [images.length]);

    const handlePrev = useCallback(() => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
        resetZoom();
    }, [images.length]);

    // Minimum distance for a swipe to be recognized
    const minSwipeDistance = 50;

    const getDistance = (touches: React.TouchList) => {
        return Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY
        );
    };

    const onTouchStart = (e: React.TouchEvent) => {
        if (e.targetTouches.length === 2) {
            setInitialDistance(getDistance(e.targetTouches));
        } else {
            setTouchEnd(null);
            setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
        }
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (e.targetTouches.length === 2 && initialDistance) {
            const currentDistance = getDistance(e.targetTouches);
            const newScale = Math.max(1, Math.min(4, scale * (currentDistance / initialDistance)));
            setScale(newScale);
            setInitialDistance(currentDistance);
        } else if (e.targetTouches.length === 1 && touchStart) {
            const currentTouch = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
            setTouchEnd(currentTouch);

            if (scale > 1) {
                const deltaX = currentTouch.x - touchStart.x;
                const deltaY = currentTouch.y - touchStart.y;
                setOffset(prev => ({
                    x: prev.x + deltaX,
                    y: prev.y + deltaY
                }));
                setTouchStart(currentTouch);
            }
        }
    };

    const onTouchEnd = () => {
        setInitialDistance(null);
        if (!touchStart || !touchEnd || scale > 1) {
            setTouchStart(null);
            setTouchEnd(null);
            return;
        }

        const distance = touchStart.x - touchEnd.x;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            handleNext();
        } else if (isRightSwipe) {
            handlePrev();
        }

        setTouchStart(null);
        setTouchEnd(null);
    };

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
        <div
            className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200 touch-none select-none overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors bg-black/40 p-2 rounded-full hover:bg-white/10 z-[10000]"
            >
                <X className="h-8 w-8" />
            </button>

            {/* Delete Button (Centralized) */}
            {onDelete && canDelete && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(currentIndex); }}
                    className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 hover:text-red-500 transition-all bg-black/40 p-3 rounded-full hover:bg-white/10 group z-[10000]"
                    title="Excluir foto"
                >
                    <Trash2 className="h-7 w-7 group-hover:scale-110" />
                </button>
            )}

            {/* Navigation Buttons */}
            {images.length > 1 && scale === 1 && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                        className="absolute left-2 sm:left-4 text-white/80 hover:text-white transition-colors hover:scale-110 p-3 bg-black/20 rounded-full sm:bg-transparent z-10"
                    >
                        <ChevronLeft className="h-10 w-10 sm:h-12 sm:w-12" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        className="absolute right-2 sm:right-4 text-white/80 hover:text-white transition-colors hover:scale-110 p-3 bg-black/20 rounded-full sm:bg-transparent z-10"
                    >
                        <ChevronRight className="h-10 w-10 sm:h-12 sm:w-12" />
                    </button>
                </>
            )}

            {/* Image Container */}
            <div
                className="relative w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                }}
            >
                <div className="relative w-full h-full pointer-events-auto">
                    <Image
                        src={images[currentIndex]}
                        alt={`Foto ${currentIndex + 1}`}
                        fill
                        className="object-contain select-none"
                        quality={100}
                        priority
                        draggable={false}
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
