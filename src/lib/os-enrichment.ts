import { OS } from './excel';
import { EnrichedOS } from './types';
import { getOSStatusInfo } from './utils';

interface DbRecord {
    updatedAt: Date;
    caixas: { status: string; nomeEquipe: string }[];
    execution?: {
        status: string;
        updatedAt: Date;
        equipe?: {
            name: string;
            fullName: string | null;
            nomeEquipe: string | null;
        } | null;
    } | null;
}

/**
 * Enriches an OS from Excel with database records (caixas, execution).
 * Specifically aggregates all team names from the boxes marked as OK.
 */
export function enrichOS(os: OS, dbRecord?: DbRecord): EnrichedOS {
    let executionStatus = 'Pendente';
    let equipeName: string | undefined;
    let closedAt: string | undefined;
    let lastUpdateDate: Date | null = dbRecord?.updatedAt || null;
    let checklistTotal = 0;
    let checklistDone = 0;

    if (dbRecord) {
        const { execution, caixas } = dbRecord;

        // 1. Calculate Checklist Stats
        checklistTotal = caixas.length;
        checklistDone = caixas.filter(c => c.status === 'OK' || c.status === 'Concluído').length;

        // 2. Aggregate Team Names from Boxes (Unique and Non-Empty)
        const teamSet = new Set<string>();
        caixas.forEach(c => {
            if (c.status === 'OK' || c.status === 'Concluído') {
                const name = c.nomeEquipe?.trim();
                if (name && name !== '-') {
                    teamSet.add(name);
                }
            }
        });

        // 3. Fallback to Execution Team if boxes team is empty
        if (teamSet.size > 0) {
            equipeName = Array.from(teamSet).sort().join(', ');
        } else if (execution?.equipe) {
            equipeName = execution.equipe.fullName || execution.equipe.nomeEquipe || execution.equipe.name || '-';
        }

        // 4. Determine status and updates
        if (execution) {
            if (!lastUpdateDate || execution.updatedAt > lastUpdateDate) {
                lastUpdateDate = execution.updatedAt;
            }
            const statusInfo = getOSStatusInfo({ osStatus: os.status, execution });
            executionStatus = statusInfo.label;

            // Handle closure date
            const labelUpper = executionStatus.toUpperCase();
            if (labelUpper.includes('CONCLUÍDA') || labelUpper.includes('CONCLUIDA') || labelUpper.includes('SEM EXECUÇÃO') || labelUpper.includes('SEM EXECUCAO')) {
                closedAt = execution.updatedAt.toISOString();
            }
        }
    }

    return {
        ...os,
        executionStatus,
        equipeName,
        closedAt,
        lastUpdate: lastUpdateDate?.toISOString(),
        executionUpdatedAt: dbRecord?.execution?.updatedAt ? dbRecord.execution.updatedAt.toISOString() : null,
        checklistTotal,
        checklistDone
    };
}
