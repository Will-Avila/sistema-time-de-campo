'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, ChevronDown } from 'lucide-react';

interface MonthSelectorProps {
    availableMonths: string[];
    currentMonth: string;
    basePath: string;
}

export function MonthSelector({ availableMonths, currentMonth, basePath }: MonthSelectorProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const month = e.target.value;
        const params = new URLSearchParams(searchParams.toString());
        params.set('month', month);
        router.push(`${basePath}?${params.toString()}`);
    };

    return (
        <div className="w-1/2 md:w-auto">
            <div className="group relative flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5 shadow-sm hover:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all cursor-pointer">
                <Calendar className="h-4 w-4 text-primary shrink-0" />

                <select
                    value={currentMonth}
                    onChange={handleMonthChange}
                    className="w-full appearance-none bg-transparent text-sm font-bold text-foreground outline-none cursor-pointer pr-6"
                >
                    {availableMonths.map((month) => (
                        <option key={month} value={month} className="bg-card text-foreground">
                            {month}
                        </option>
                    ))}
                </select>

                <div className="absolute right-4 pointer-events-none text-muted-foreground group-hover:text-primary transition-colors">
                    <ChevronDown className="h-4 w-4" />
                </div>
            </div>
        </div>
    );
}
