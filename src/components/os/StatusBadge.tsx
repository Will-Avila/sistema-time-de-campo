
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getOSStatusInfo, getStatusVariantFromLabel } from '@/lib/utils';
import { CheckCircle, Clock, AlertTriangle, Wrench, LucideIcon } from 'lucide-react';

interface StatusBadgeProps {
    label?: string; // Pre-calculated label (e.g. from server-side enrichment)
    osStatus?: string; // Raw OS status from Excel
    execution?: { status: string; obs?: string | null } | null; // DB execution
    className?: string;
    showIcon?: boolean;
}

export function StatusBadge({ label, osStatus, execution, className, showIcon = true }: StatusBadgeProps) {
    let displayLabel = label;
    let variant: any = 'secondary';
    let Icon: LucideIcon = AlertTriangle;

    if (label) {
        displayLabel = label;
        variant = getStatusVariantFromLabel(label);

        // Map icons for pre-calculated labels
        const s = label.toLowerCase();
        if (s.includes('concluí') || s.includes('conclui') || s.includes('encerrada')) Icon = CheckCircle;
        else if (s.includes('análise') || s.includes('analise')) Icon = Clock;
        else if (s.includes('execução') || s.includes('execucao')) Icon = Wrench;
    } else if (osStatus !== undefined) {
        const statusInfo = getOSStatusInfo({ osStatus, execution });
        displayLabel = statusInfo.label;
        variant = statusInfo.variant;
        Icon = statusInfo.icon;
    }

    // Abbreviate long labels
    if (displayLabel?.toLowerCase().includes('execução') || displayLabel?.toLowerCase().includes('execucao')) {
        displayLabel = 'Em Exec.';
    }

    return (
        <Badge variant={variant} className={className}>
            {showIcon && <Icon className="mr-1.5 h-3.5 w-3.5" />}
            {displayLabel}
        </Badge>
    );
}
