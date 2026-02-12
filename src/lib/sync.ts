import * as XLSX from 'xlsx';
import { readFile } from 'fs/promises';
import { prisma } from './db';
import { logger } from './logger';

const EXCEL_PATH = process.env.EXCEL_PATH || 'C:\\Programas\\PROJETOS\\planilha\\Os.xlsx';

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

/**
 * Synchronizes the Excel spreadsheet data into the Database.
 * This is meant to be called manually or as part of an update process.
 */
export async function syncExcelToDB() {
    try {
        logger.info('Starting Excel to DB synchronization...');

        const buffer = await readFile(EXCEL_PATH);
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        // 1. Sync OS Sheet
        const osSheet = workbook.Sheets['Os'];
        const osRows: any[] = osSheet ? XLSX.utils.sheet_to_json(osSheet) : [];
        logger.info(`Found ${osRows.length} OS rows in Excel.`);

        for (const row of osRows) {
            const osId = String(row.IdOs || row.ID || row.Pop || '');
            if (!osId) continue;

            await prisma.orderOfService.upsert({
                where: { id: osId },
                update: {
                    pop: String(row.POP || row.Pop || ''),
                    status: String(row.StatusOperacao || '').trim(),
                    uf: String(row.UF || ''),
                    dataEntrante: formatExcelDate(row['Entrante']),
                    dataPrevExec: formatExcelDate(row['Prev. Exec.']),
                    rawPrevExec: typeof row['Prev. Exec.'] === 'number' ? row['Prev. Exec.'] : 0,
                    dataConclusao: formatExcelDate(row['Conclusao']),
                    rawConclusao: typeof row['Conclusao'] === 'number' ? row['Conclusao'] : 0,
                    cenario: String(row.Cenario || ''),
                    protocolo: String(row.Protocolo || ''),
                },
                create: {
                    id: osId,
                    pop: String(row.POP || row.Pop || ''),
                    status: String(row.StatusOperacao || '').trim(),
                    uf: String(row.UF || ''),
                    dataEntrante: formatExcelDate(row['Entrante']),
                    dataPrevExec: formatExcelDate(row['Prev. Exec.']),
                    rawPrevExec: typeof row['Prev. Exec.'] === 'number' ? row['Prev. Exec.'] : 0,
                    dataConclusao: formatExcelDate(row['Conclusao']),
                    rawConclusao: typeof row['Conclusao'] === 'number' ? row['Conclusao'] : 0,
                    cenario: String(row.Cenario || ''),
                    protocolo: String(row.Protocolo || ''),
                }
            });
        }

        // 2. Sync CaixaAlares Sheet
        const caixaSheet = workbook.Sheets['CaixaAlares'];
        const caixaRows: any[] = caixaSheet ? XLSX.utils.sheet_to_json(caixaSheet) : [];
        logger.info(`Found ${caixaRows.length} Caixa rows in Excel.`);

        // For Caixas, it might be better to clear and re-insert for a specific OS or use a mapping.
        // But since user wants to "atualizar o que foi acrescentado", we'll use IdCaixa if available.
        let rowIndex = 0;
        for (const row of caixaRows) {
            const currentIndex = rowIndex++;
            const osId = String(row.OS || '');
            if (!osId) continue;

            // We need to ensure the OS exists first (it should if sheets are consistent)
            const osExists = await prisma.orderOfService.findUnique({ where: { id: osId } });
            if (!osExists) continue;

            const excelId = String(row.IdCaixa || '');

            // If no excelId, we might need a composite key or just insert. 
            // In the previous code, index was used as fallback ID.

            await prisma.caixaAlare.upsert({
                where: { id: excelId || `idx-${osId}-${currentIndex}` },
                update: {
                    osId,
                    cto: String(row.Cto || ''),
                    chassi: String(row.Chassi || ''),
                    placa: String(row.Placa || ''),
                    olt: String(row.OLT || ''),
                    endereco: String(row.Endereco || ''),
                    lat: row.Lat ? parseFloat(String(row.Lat)) : null,
                    long: row.Long ? parseFloat(String(row.Long)) : null,
                    status: String(row.Status || 'Pendente'),
                    excelId: excelId || null,
                },
                create: {
                    id: excelId || `idx-${osId}-${currentIndex}`,
                    osId,
                    cto: String(row.Cto || ''),
                    chassi: String(row.Chassi || ''),
                    placa: String(row.Placa || ''),
                    olt: String(row.OLT || ''),
                    endereco: String(row.Endereco || ''),
                    lat: row.Lat ? parseFloat(String(row.Lat)) : null,
                    long: row.Long ? parseFloat(String(row.Long)) : null,
                    status: String(row.Status || 'Pendente'),
                    excelId: excelId || null,
                }
            });
        }

        // 3. Sync LancaAlare (Future use)
        const lancaSheet = workbook.Sheets['LancaAlares'];
        if (lancaSheet) {
            const lancaRows: any[] = XLSX.utils.sheet_to_json(lancaSheet);
            logger.info(`Found ${lancaRows.length} Lanca rows in Excel.`);
            // Implementation for LancaAlare if needed soon
        }

        logger.info('Synchronization completed successfully.');
        return { success: true, message: 'Dados sincronizados com sucesso!' };

    } catch (error) {
        logger.error('Error during synchronization', { error: String(error) });
        return { success: false, message: 'Erro ao sincronizar dados. Verifique o arquivo Excel.' };
    }
}
