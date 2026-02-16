'use client';

import { Calendar as CalendarIcon, X, CalendarDays } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';

export function DateSelector({ initialDate }: { initialDate: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const inputRef = useRef<HTMLInputElement>(null);

    // Initial date is in DD/MM/YYYY format from server
    // For <input type="date">, we need YYYY-MM-DD
    const toISODate = (brDate: string) => {
        const parts = brDate.split('/');
        if (parts.length !== 3) return '';
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    };

    const fromISODate = (isoDate: string) => {
        const parts = isoDate.split('-');
        if (parts.length !== 3) return '';
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = fromISODate(e.target.value);
        if (newDate) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('date', newDate);
            router.push(`?${params.toString()}`);
        }
    };

    const clearDate = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('date');
        router.push(`?${params.toString()}`);
    };

    const isFiltered = searchParams.has('date');

    // Trigger native date picker directly
    const openCalendar = () => {
        if (inputRef.current) {
            // Modern browsers support showPicker()
            if ('showPicker' in HTMLInputElement.prototype) {
                try {
                    inputRef.current.showPicker();
                } catch (e) {
                    inputRef.current.click();
                }
            } else {
                inputRef.current.click();
            }
        }
    };

    return (
        <div className="flex items-center gap-1">
            <div className="relative flex items-center">
                {/* Hidden input to trigger native behavior */}
                <input
                    ref={inputRef}
                    type="date"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer -z-10"
                    defaultValue={toISODate(initialDate)}
                    onChange={handleDateChange}
                />

                <button
                    onClick={openCalendar}
                    className={`flex items-center gap-2 px-2 py-1 rounded-md transition-all group ${isFiltered
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                        }`}
                >
                    <CalendarDays className={`h-4 w-4 ${isFiltered ? 'text-emerald-500' : 'group-hover:scale-110 transition-transform'}`} />
                    <span className="text-[11px] font-bold uppercase tracking-tight">
                        {initialDate}
                    </span>
                </button>
            </div>

            {isFiltered && (
                <button
                    onClick={clearDate}
                    className="p-1 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 rounded-md transition-colors"
                    title="Limpar filtro"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
}
