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

    const excelStatusLower = (osStatus || '').toLowerCase();
    const isExcelDone = excelStatusLower === 'concluído' || excelStatusLower === 'concluido' || excelStatusLower === 'encerrada';
    const isExcelEncerrada = excelStatusLower === 'encerrada' || excelStatusLower === 'concluído' || excelStatusLower === 'concluido';
    const isExcelEmExecucao = excelStatusLower === 'em execução' || excelStatusLower === 'em execucao';

    let label = osStatus || 'Pendente';
    let variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "orange" | "light-green" = "secondary";
    let icon: LucideIcon = AlertTriangle;

    if (execution) {
        // ... (existing closure logic)
        let closureResult = 'Concluída';
        if (execution.obs) {
            const match = execution.obs.match(/Status: (.*?)\n/);
            if (match && match[1]) {
                closureResult = match[1];
            } else if (execution.obs.includes('Sem Execução')) {
                closureResult = 'Sem Execução';
            }
        }

        if (isExcelEncerrada) {
            label = closureResult;
            variant = label.includes('Sem Execução') ? 'destructive' : 'success';
            icon = CheckCircle;
        } else if (execution.status === 'DONE') {
            label = `${closureResult} - Em análise`;
            variant = label.includes('Sem Execução') ? 'orange' : 'light-green';
            icon = Clock;
        } else if (execution.status === 'PENDING' || isExcelEmExecucao) {
            label = 'Em execução';
            variant = 'warning';
            icon = Wrench;
        } else if (isExcelDone) {
            label = 'Concluída';
            variant = 'success';
            icon = CheckCircle;
        }
    } else if (isExcelEmExecucao) {
        label = 'Em execução';
        variant = 'warning';
        icon = Wrench;
    } else if (isExcelDone) {
        label = 'Concluída';
        variant = 'success';
        icon = CheckCircle;
    } else if (excelStatusLower === 'cancelado') {
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
    const s = (label || '').toLowerCase();

    if (s === 'concluída' || s === 'concluida') return 'success';
    if (s === 'sem execução' || s === 'cancelada') return 'destructive';
    if (s === 'em execução' || s === 'em execucao') return 'warning';

    // Check for analytic/partial statuses
    if (s.includes('sem execução - em análise') || s.includes('sem execucao - em analise')) return 'orange';
    if (s.includes('em análise') || s.includes('em analise')) return 'light-green';

    return 'secondary';
}
