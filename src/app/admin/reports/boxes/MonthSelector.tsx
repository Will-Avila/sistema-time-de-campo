'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar } from 'lucide-react';

interface MonthSelectorProps {
    availableMonths: string[];
    currentMonth: string;
}

export function MonthSelector({ availableMonths, currentMonth }: MonthSelectorProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const month = e.target.value;
        const params = new URLSearchParams(searchParams.toString());
        params.set('month', month);
        router.push(`/admin/reports/boxes?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <select
                value={currentMonth}
                onChange={handleMonthChange}
                className="bg-transparent text-sm font-medium text-foreground outline-none cursor-pointer min-w-[120px]"
            >
                {availableMonths.map((month) => (
                    <option key={month} value={month} className="bg-card text-foreground">
                        {month}
                    </option>
                ))}
            </select>
        </div>
    );
}
