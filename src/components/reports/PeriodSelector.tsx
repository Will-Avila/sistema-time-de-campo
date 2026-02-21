'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Layers, ChevronDown } from 'lucide-react';

interface PeriodSelectorProps {
    currentPeriod: string;
    basePath: string;
    maxAvailableMonths?: number;
}

export function PeriodSelector({ currentPeriod, basePath, maxAvailableMonths = 12 }: PeriodSelectorProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Define base periods
    const basePeriods = [
        { label: 'Mes Indiv.', value: '1' },
        { label: '3 Meses', value: '3' },
        { label: '6 Meses', value: '6' },
        { label: '1 Ano', value: '12' },
        { label: '2 Anos', value: '24' },
        { label: '3 Anos', value: '36' },
        { label: '4 Anos', value: '48' },
        { label: '5 Anos', value: '60' },
    ];

    // Filter periods based on available data to avoid redundancy
    // We show a period if its value is <= maxAvailableMonths
    // However, if maxAvailableMonths is between two values, we show the next one as "All"?
    // User said: "1 ano e 2 anos tem os mesmos dados... deixe para mais anos só quando eles passarem"
    const filteredPeriods = basePeriods.filter((p, index) => {
        const val = parseInt(p.value);
        if (val === 1) return true;

        // Show if we have at least 80% of the period's data or if it's the 3/6 month options which are standard
        if (val <= 6) return maxAvailableMonths >= val - 1;

        // For years, only show if we have data passing the previous year mark
        const prevVal = parseInt(basePeriods[index - 1].value);
        return maxAvailableMonths > prevVal;
    });

    const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const period = e.target.value;
        const params = new URLSearchParams(searchParams.toString());
        params.set('range', period);
        router.push(`${basePath}?${params.toString()}`);
    };

    return (
        <div className="w-full md:w-auto">
            <div className="group relative flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5 shadow-sm hover:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all cursor-pointer">
                <Layers className="h-4 w-4 text-primary shrink-0" />

                <select
                    value={currentPeriod}
                    onChange={handlePeriodChange}
                    className="w-full appearance-none bg-transparent text-sm font-bold text-foreground outline-none cursor-pointer pr-6"
                >
                    {filteredPeriods.map((period) => (
                        <option key={period.value} value={period.value} className="bg-card text-foreground">
                            {period.label}
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
