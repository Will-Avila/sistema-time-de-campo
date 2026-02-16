import { OS, CaixaItem } from './excel';

// ─── ActionResult ──────────────────────────────────────
/**
 * Standardized return type for all server actions.
 * Use `ActionResult<T>` when you need to return data, or plain `ActionResult` for void.
 */
export type ActionResult<T = void> =
    | { success: true; data?: T; message?: string }
    | { success: false; message: string; errors?: Record<string, string[]> };

// ─── Enriched OS (OS + execution status) ───────────────
/**
 * An OS from the Excel data enriched with execution status from the database.
 * Used in OS list pages and dashboard.
 */
export interface EnrichedOS extends OS {
    executionStatus: string;
    equipeName?: string;
    closedAt?: string;
    lastUpdate?: string | null;
    executionUpdatedAt?: string | null;
    checklistTotal?: number;
    checklistDone?: number;
    executionObs?: string | null;
    observacoes?: string | null;
}

// ─── Caixa Item Data (typed Excel item) ────────────────
/**
 * Typed version of Excel caixa item, used in CaixaItem component.
 * We now rely on the central CaixaItem definition from excel.ts.
 */
export type CaixaItemData = CaixaItem;

// ─── Checklist State ───────────────────────────────────
// ChecklistData is deprecated as we merged Checklist into CaixaAlare.
// Use CaixaItemData (which is CaixaItem) instead.

// ─── Equipe / Usuário (safe, no password) ──────────────
/**
 * Equipe data as returned by getEquipes() — excludes password.
 */
export interface SafeEquipe {
    id: string;
    name: string;
    fullName: string | null;
    nomeEquipe: string | null;
    phone: string | null;
    isAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
}
