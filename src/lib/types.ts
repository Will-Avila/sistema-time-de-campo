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
}

// ─── Caixa Item Data (typed Excel item) ────────────────
/**
 * Typed version of Excel caixa item, used in CaixaItem component.
 * Replaces `item: any` throughout the codebase.
 */
export interface CaixaItemData {
    id: string;
    cto: string;
    chassiPath: string;
    endereco: string;
    lat: number | null;
    long: number | null;
    status: string;
    done: boolean;
    nomeEquipe?: string;
    equipe?: string;
    potencia?: string;
    obs?: string;
    certified?: boolean;
}

// ─── Checklist State ───────────────────────────────────
/**
 * Shape of checklist data passed from server to CaixaItem component.
 */
export interface ChecklistData {
    done: boolean;
    power?: string | null;
    obs?: string | null;
    photos: { id: string; path: string; equipeId?: string | null }[];
    certified?: boolean;
}

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
