import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CheckCircle, Clock, AlertTriangle, Wrench, LucideIcon } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Centralized logic to determine the display properties of an OS status.
 * Used by both OS List and OS Details pages.
 */
export function getOSStatusInfo(params: {
    osStatus: string;
    execution?: { status: string; obs?: string | null } | null;
}) {
    const { osStatus, execution } = params;

    const excelStatusUpper = (osStatus || '').toUpperCase().trim();
    const isExcelDone = ['CONCLUÍDO', 'CONCLUIDO'].includes(excelStatusUpper);
    const isExcelEmExecucao = ['EM EXECUÇÃO', 'EM EXECUCAO'].includes(excelStatusUpper);
    const isExcelCancelado = ['CANCELADO'].includes(excelStatusUpper);

    let label = osStatus || 'Pendente';
    let variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "orange" | "light-green" = "secondary";
    let icon: LucideIcon = AlertTriangle;

    if (execution) {
        let closureResult = 'Concluída';
        if (execution.obs) {
            const obsUpper = execution.obs.toUpperCase();
            const match = execution.obs.match(/Status: (.*?)\n/);
            if (match && match[1]) {
                closureResult = match[1];
            } else if (obsUpper.includes('SEM EXECUÇÃO') || obsUpper.includes('SEM EXECUCAO')) {
                closureResult = 'Sem Execução';
            }
        }

        const labelUpper = closureResult.toUpperCase().trim();

        // Priority 1: If Excel says it's officially CLOSED/DONE or CANCELLED
        if (isExcelDone || isExcelCancelado) {
            label = isExcelCancelado ? 'Cancelada' : closureResult;
            variant = (labelUpper.includes('SEM EXECUÇÃO') || labelUpper.includes('SEM EXECUCAO') || isExcelCancelado) ? 'destructive' : 'success';
            icon = (labelUpper.includes('SEM EXECUÇÃO') || labelUpper.includes('SEM EXECUCAO') || isExcelCancelado) ? AlertTriangle : CheckCircle;
        }
        // Priority 2: If App says it's DONE but Excel isn't updated yet, show "In Analysis"
        else if (execution.status === 'DONE') {
            label = `${closureResult} - Em análise`;
            variant = (labelUpper.includes('SEM EXECUÇÃO') || labelUpper.includes('SEM EXECUCAO')) ? 'orange' : 'light-green';
            icon = Clock;
        }
        // Priority 3: Ongoing execution
        else if (execution.status === 'PENDING' || isExcelEmExecucao) {
            label = 'Em execução';
            variant = 'warning';
            icon = Wrench;
        }
    } else if (isExcelEmExecucao) {
        label = 'Em execução';
        variant = 'warning';
        icon = Wrench;
    } else if (isExcelDone) {
        label = 'Concluída';
        variant = 'success';
        icon = CheckCircle;
    } else if (excelStatusUpper === 'CANCELADO') {
        label = 'Cancelada';
        variant = 'destructive';
        icon = AlertTriangle;
    }

    return { label, variant, icon };
}

/**
 * Returns the badge variant for a given status label.
 * Centralizes color logic for status badges.
 */
export function getStatusVariantFromLabel(label: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "orange" | "light-green" {
    const s = (label || '').toUpperCase().trim();

    if (s === 'CONCLUÍDA' || s === 'CONCLUIDA' || s === 'CONCLUÍDO' || s === 'CONCLUIDO') return 'success';
    if (s === 'SEM EXECUÇÃO' || s === 'SEM EXECUCAO' || s === 'CANCELADA' || s === 'CANCELADO') return 'destructive';
    if (s === 'EM EXECUÇÃO' || s === 'EM EXECUCAO') return 'warning';

    // Check for analytic/partial statuses
    if (s.includes('SEM EXECUÇÃO') || s.includes('SEM EXECUCAO')) {
        if (s.includes('EM ANÁLISE') || s.includes('EM ANALISE')) return 'orange';
        return 'destructive';
    }

    if (s.includes('EM ANÁLISE') || s.includes('EM ANALISE')) return 'light-green';

    return 'secondary';
}

/**
 * Returns today's date string in DD/MM/YYYY format for America/Sao_Paulo timezone.
 */
export function getTodaySP() {
    const str = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(new Date());
    // Normalize string (remove narrow non-breaking spaces or other hidden chars)
    return str.replace(/[^0-9/]/g, '').trim();
}

/**
 * Returns the date string in DD/MM/YYYY format for America/Sao_Paulo timezone for a given Date.
 */
export function getDateSP(date: Date | string | null | undefined) {
    if (!date) return '-';
    let d: Date;
    if (typeof date === 'string') {
        // If it's already DD/MM/YYYY, return as is (but normalized)
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return date.trim();
        d = new Date(date);
    } else {
        d = date;
    }

    if (isNaN(d.getTime())) return '-';

    const str = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(d);

    return str.replace(/[^0-9/]/g, '').trim();
}

/**
 * Checks if a given date (ISO string or Date object) matches a specific DD/MM/YYYY date in SP timezone.
 */
export function isSameDaySP(date: Date | string | null | undefined, targetDateBR: string) {
    if (!date || !targetDateBR) return false;
    const dateSP = getDateSP(date);
    const targetSP = targetDateBR.replace(/[^0-9/]/g, '').trim();
    return dateSP === targetSP;
}

/**
 * Formats a date (Date or ISO string) to DD/MM/YYYY in America/Sao_Paulo timezone.
 * Safe to use in both Client and Server components.
 */
export function formatDateSP(date: Date | string | null | undefined) {
    return getDateSP(date);
}

/**
 * Formats a date (Date or ISO string) to DD/MM/YYYY, HH:mm:ss in America/Sao_Paulo timezone.
 */
export function formatDateTimeSP(date: Date | string | null | undefined) {
    if (!date) return '-';
    let d: Date;
    if (typeof date === 'string') {
        d = new Date(date);
    } else {
        d = date;
    }

    if (isNaN(d.getTime())) return '-';

    return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(d);
}
/**
 * Calculates the number of days remaining until a deadline.
 * Returns negative numbers for overdue dates.
 */
export function getDaysRemaining(deadlineDate: string | null | undefined): number | null {
    if (!deadlineDate || deadlineDate === '-' || deadlineDate.trim() === '') return null;

    try {
        let deadline: Date;

        if (deadlineDate.includes('/')) {
            // Handle DD/MM/YYYY
            const parts = deadlineDate.split('/');
            if (parts.length !== 3) return null;
            const [day, month, year] = parts.map(Number);
            deadline = new Date(year, month - 1, day, 12, 0, 0);
        } else {
            // Handle ISO (YYYY-MM-DD)
            deadline = new Date(deadlineDate);
            deadline.setHours(12, 0, 0, 0);
        }

        if (isNaN(deadline.getTime())) return null;

        // Today in SP (noon)
        const todayStr = getTodaySP();
        const [tDay, tMonth, tYear] = todayStr.split('/').map(Number);
        const today = new Date(tYear, tMonth - 1, tDay, 12, 0, 0);

        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    } catch (e) {
        return null;
    }
}

/**
 * Returns a formatted message and color class for deadline info.
 */
export function getDeadlineInfo(deadlineDateBR: string | null | undefined) {
    const days = getDaysRemaining(deadlineDateBR);
    if (days === null) return null;

    if (days < 0) return { label: `Vencida há ${Math.abs(days)}d`, color: 'text-rose-600 dark:text-rose-400', isOverdue: true };
    if (days === 0) return { label: 'Vence hoje', color: 'text-amber-600 dark:text-amber-500', isOverdue: false };
    if (days === 1) return { label: 'Vence amanhã', color: 'text-blue-600 dark:text-blue-400', isOverdue: false };
    return { label: `Vence em ${days}d`, color: 'text-slate-500 dark:text-slate-400', isOverdue: false };
}
