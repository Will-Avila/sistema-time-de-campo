'use client';

import { formatDateSP, cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

interface OSClosureDateProps {
    dataConclusaoExcel?: string;
    executionUpdatedAt?: string | Date | null;
    closedAt?: string | null;
    showTime?: boolean;
    className?: string;
}

/**
 * Unified component to display the OS completion date.
 * Ensures consistent priority and timezone across the app.
 * Priority: App Execution Date (more precise) > Excel Date.
 */
export function OSClosureDate({
    dataConclusaoExcel,
    executionUpdatedAt,
    closedAt,
    className
}: OSClosureDateProps) {

    const baseClasses = cn("flex items-center gap-1.5 font-medium", className || "text-slate-700 dark:text-slate-300");

    // Technical record from App (direct or passed as ISO closedAt)
    const technicalDate = executionUpdatedAt || closedAt;

    // 1. Excel date has priority (as requested by user)
    if (dataConclusaoExcel && dataConclusaoExcel !== '-') {
        return (
            <div className={baseClasses}>
                <Calendar className="h-3 w-3 text-[#4da8bc]" />
                {dataConclusaoExcel}
            </div>
        );
    }

    // 2. Fallback to App Execution if Excel record is missing
    if (technicalDate) {
        return (
            <div className={baseClasses}>
                <Calendar className="h-3 w-3 text-[#4da8bc]" />
                {formatDateSP(technicalDate)}
            </div>
        );
    }

    // 3. Not closed yet
    return (
        <div className={baseClasses}>
            <Calendar className="h-3 w-3 text-primary" />
            -
        </div>
    );
}
