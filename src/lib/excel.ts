import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
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

const EXCEL_PATH = 'C:\\Programas\\PROJETOS\\planilha\\Os.xlsx';

function readExcelFile() {
    const buffer = readFileSync(EXCEL_PATH);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    return workbook;
}

export async function getExcelData() {
    const workbook = readExcelFile();

    const osSheet = workbook.Sheets['Os'];
    const osData: any[] = osSheet ? XLSX.utils.sheet_to_json(osSheet) : [];

    const caixaSheet = workbook.Sheets['CaixaAlares'];
    const caixaData: any[] = caixaSheet ? XLSX.utils.sheet_to_json(caixaSheet) : [];

    return { osData, caixaData };
}

export async function getAllOS(): Promise<OS[]> {
    const { osData, caixaData } = await getExcelData();

    // Map directly from 'Os' sheet where StatusOperacao exists
    return osData
        .map((row: any) => {
            // Excel dates are numbers (days since 1900). 
            // If string "JUN-25", it's a string.
            // Based on debug output: Entrante=45805, Prev. Exec.=45838 (Excel Serial Dates)

            const excelDateToJS = (serial: number) => {
                if (!serial || isNaN(serial)) return null;
                // Excel base date is 1899-12-30
                const utc_days = Math.floor(serial - 25569);
                const utc_value = utc_days * 86400;
                return new Date(utc_value * 1000);
            };

            const formatDate = (serial: any) => {
                if (typeof serial === 'number') {
                    const date = excelDateToJS(serial);
                    return date ? date.toLocaleDateString('pt-BR') : '-';
                }
                return String(serial || '-');
            };

            const osId = String(row.IdOs || row.ID || '');

            // Count caixas for this OS
            const totalCaixas = caixaData.filter((c: any) => String(c.OS) === osId).length;

            return {
                id: osId,
                pop: String(row.POP || row.Pop || ''),
                status: String(row.StatusOperacao || '').trim(),
                uf: String(row.UF || ''),
                // Column names from debug: 'Entrante', 'Prev. Exec.', 'Cenario'
                dataEntrante: formatDate(row['Entrante']),
                dataPrevExec: formatDate(row['Prev. Exec.']),
                // Keep raw value for sorting
                rawPrevExec: typeof row['Prev. Exec.'] === 'number' ? row['Prev. Exec.'] : 0,
                cenario: String(row.Cenario || ''),
                protocolo: String(row.Protocolo || ''),
                totalCaixas
            };
        })
        .filter((os) => {
            // Filter: Only show 'Iniciar' or 'Em Execução' (case insensitive)
            const statusLower = os.status.toLowerCase();
            return (statusLower === 'iniciar' || statusLower === 'em execução' || statusLower === 'em execucao') && os.pop;
        })
        .sort((a, b) => {
            // Sort by Prev. Exec. ascending (Oldest first)
            return a.rawPrevExec - b.rawPrevExec;
        });
}

export async function getOSById(id: string) {
    const { osData, caixaData } = await getExcelData();

    // Find OS in 'Os' sheet
    const osRow = osData.find((row: any) => String(row.IdOs || row.ID) === id || String(row.POP || row.Pop) === id);

    if (!osRow) return null;

    const osId = String(osRow.IdOs || osRow.ID);
    const pop = String(osRow.POP || osRow.Pop);

    // Find items in 'CaixaAlares' sheet matching by OS column (which corresponds to Os.IdOs)
    const items = caixaData
        .filter((row: any) => String(row.OS) === osId)
        .map((row: any, index: number) => {
            // Build chassi path: POP/Chassi/Placa/OLT/Cto
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
                // Parse coordinates - may be number or string in Excel
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
