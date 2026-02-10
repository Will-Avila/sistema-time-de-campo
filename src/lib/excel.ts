import * as XLSX from 'xlsx';
import { readFile } from 'fs/promises';
import path from 'path';

export interface OS {
    id: string;
    pop: string;
    status: string;
    uf: string;
    dataEntrante: string;
    dataPrevExec: string;
    rawPrevExec?: number;
    cenario: string;
    protocolo: string;
    totalCaixas: number;
}

export interface CaixaItem {
    id: string;
    cto: string;
    chassiPath: string;
    endereco: string;
    lat: number | null;
    long: number | null;
    status: string;
    done: boolean;
}

const EXCEL_PATH = process.env.EXCEL_PATH || 'C:\\Programas\\PROJETOS\\planilha\\Os.xlsx';

// ─── In-Memory Cache with TTL ───────────────────────────────────────
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

interface ExcelCache {
    osData: Record<string, any>[];
    caixaData: Record<string, any>[];
    timestamp: number;
}

let cache: ExcelCache | null = null;

function isCacheValid(): boolean {
    return cache !== null && (Date.now() - cache.timestamp) < CACHE_TTL_MS;
}

/** Invalidate cache manually (e.g., if the file is known to have changed) */
export function invalidateExcelCache() {
    cache = null;
}

// ─── Helper Functions ───────────────────────────────────────────────
function excelDateToJS(serial: number): Date | null {
    if (!serial || isNaN(serial)) return null;
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    return new Date(utc_value * 1000);
}

function formatExcelDate(serial: any): string {
    if (typeof serial === 'number') {
        const date = excelDateToJS(serial);
        return date ? date.toLocaleDateString('pt-BR') : '-';
    }
    return String(serial || '-');
}

// ─── Core Data Access ───────────────────────────────────────────────
async function readExcelData(): Promise<{ osData: Record<string, any>[]; caixaData: Record<string, any>[] }> {
    if (isCacheValid()) {
        return { osData: cache!.osData, caixaData: cache!.caixaData };
    }

    const buffer = await readFile(EXCEL_PATH);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const osSheet = workbook.Sheets['Os'];
    const osData: Record<string, any>[] = osSheet ? XLSX.utils.sheet_to_json(osSheet) : [];

    const caixaSheet = workbook.Sheets['CaixaAlares'];
    const caixaData: Record<string, any>[] = caixaSheet ? XLSX.utils.sheet_to_json(caixaSheet) : [];

    // Update cache
    cache = { osData, caixaData, timestamp: Date.now() };

    return { osData, caixaData };
}

// ─── Public API ─────────────────────────────────────────────────────
export async function getExcelData() {
    return readExcelData();
}

export async function getAllOS(): Promise<OS[]> {
    const { osData, caixaData } = await readExcelData();

    return osData
        .map((row) => {
            const osId = String(row.IdOs || row.ID || '');
            const totalCaixas = caixaData.filter((c) => String(c.OS) === osId).length;

            return {
                id: osId,
                pop: String(row.POP || row.Pop || ''),
                status: String(row.StatusOperacao || '').trim(),
                uf: String(row.UF || ''),
                dataEntrante: formatExcelDate(row['Entrante']),
                dataPrevExec: formatExcelDate(row['Prev. Exec.']),
                rawPrevExec: typeof row['Prev. Exec.'] === 'number' ? row['Prev. Exec.'] : 0,
                cenario: String(row.Cenario || ''),
                protocolo: String(row.Protocolo || ''),
                totalCaixas
            };
        })
        .filter((os) => {
            const statusLower = os.status.toLowerCase();
            return (statusLower === 'iniciar' || statusLower === 'em execução' || statusLower === 'em execucao');
        })
        .sort((a, b) => a.rawPrevExec - b.rawPrevExec);
}

export async function getOSById(id: string) {
    const { osData, caixaData } = await readExcelData();

    const osRow = osData.find((row) => String(row.IdOs || row.ID) === id || String(row.POP || row.Pop) === id);

    if (!osRow) return null;

    const osId = String(osRow.IdOs || osRow.ID);
    const pop = String(osRow.POP || osRow.Pop);

    const items: CaixaItem[] = caixaData
        .filter((row) => String(row.OS) === osId)
        .map((row, index) => {
            const chassiPath = [
                row.Pop || row.POP,
                row.Chassi,
                row.Placa,
                row.OLT,
                row.Cto
            ].filter(Boolean).join('/');

            return {
                id: String(row.IdCaixa || index),
                cto: String(row.Cto || ''),
                chassiPath,
                endereco: String(row.Endereco || ''),
                lat: row.Lat ? parseFloat(String(row.Lat)) : null,
                long: row.Long ? parseFloat(String(row.Long)) : null,
                status: String(row.Status || 'Pendente'),
                done: row.Status === 'OK'
            };
        });

    return {
        id: String(osRow.IdOs || osRow.ID || pop),
        pop,
        status: String(osRow.StatusOperacao || ''),
        protocolo: String(osRow.Protocolo || ''),
        items
    };
}
