'use client';

import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';

interface DateSelectorProps {
    currentDate: string; // DD/MM/YYYY
}

export function DateSelector({ currentDate }: DateSelectorProps) {
    const router = useRouter();

    // Convert DD/MM/YYYY to YYYY-MM-DD for input type="date"
    const [day, month, year] = currentDate.split('/');
    const dateValue = `${year}-${month}-${day}`;

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value; // YYYY-MM-DD
        if (!newDate) return;

        const [y, m, d] = newDate.split('-');
        const formattedDate = `${d}/${m}/${y}`;

        router.push(`/admin/today?date=${formattedDate}`);
    };

    return (
        <div className="relative w-full sm:w-auto">
            <input
                type="date"
                value={dateValue}
                onChange={handleDateChange}
                className="h-10 w-full sm:w-[150px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 cursor-pointer shadow-sm"
            />
        </div>
    );
}
