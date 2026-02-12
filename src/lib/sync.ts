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
        let osCount = 0;

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
            osCount++;
        }

        // 2. Sync CaixaAlares Sheet
        const caixaSheet = workbook.Sheets['CaixaAlares'];
        const caixaRows: any[] = caixaSheet ? XLSX.utils.sheet_to_json(caixaSheet) : [];
        logger.info(`Found ${caixaRows.length} Caixa rows in Excel.`);
        let caixaCount = 0;

        // For Caixas, it might be better to clear and re-insert for a specific OS or use a mapping.
        // But since user wants to "atualizar o que foi acrescentado", we'll use IdCaixa if available.
        let rowIndex = 0;
        const osWithMarkedBoxes = new Set<string>();

        for (const row of caixaRows) {
            const currentIndex = rowIndex++;
            const osId = String(row.OS || '');
            if (!osId) continue;

            const boxStatus = String(row.Status || 'Pendente');
            if (boxStatus !== 'Pendente') {
                osWithMarkedBoxes.add(osId);
            }

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
                    status: boxStatus,
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
                    status: boxStatus,
                    excelId: excelId || null,
                }
            });
            caixaCount++;
        }

        // Update OS status for those that have marked boxes
        for (const osId of Array.from(osWithMarkedBoxes)) {
            const os = await prisma.orderOfService.findUnique({ where: { id: osId }, select: { status: true } });
            // Only update if not already concluded or cancelled in Excel (just to be safe, though user said 'muda o status')
            const currentStatus = (os?.status || '').toLowerCase();
            const isFinished = ['concluído', 'concluido', 'encerrada', 'cancelado'].includes(currentStatus);

            if (!isFinished) {
                await prisma.orderOfService.update({
                    where: { id: osId },
                    data: { status: 'Em execução' }
                });
            }
        }

        // 3. Sync LancaAlare (Future use)
        const lancaSheet = workbook.Sheets['LancaAlares'];
        if (lancaSheet) {
            const lancaRows: any[] = XLSX.utils.sheet_to_json(lancaSheet);
            logger.info(`Found ${lancaRows.length} Lanca rows in Excel.`);

            let lancaIndex = 0;
            for (const row of lancaRows) {
                const currentIndex = lancaIndex++;
                const osId = String(row.OS || '');
                const excelId = String(row.IdLanca || '');

                await prisma.lancaAlare.upsert({
                    where: { id: excelId || `lanca-${osId}-${currentIndex}` },
                    update: {
                        excelId: excelId || null,
                        osId: osId || null,
                        data: formatExcelDate(row.Data),
                        valor: typeof row.Valor === 'number' ? row.Valor : 0,
                        descricao: String(row.Descricao || ''),
                    },
                    create: {
                        id: excelId || `lanca-${osId}-${currentIndex}`,
                        excelId: excelId || null,
                        osId: osId || null,
                        data: formatExcelDate(row.Data),
                        valor: typeof row.Valor === 'number' ? row.Valor : 0,
                        descricao: String(row.Descricao || ''),
                    }
                });
            }
        }

        logger.info('Synchronization completed successfully.');
        return {
            success: true,
            message: `Sincronizado: ${osCount} OS e ${caixaCount} Caixas.`,
            stats: { osCount, caixaCount }
        };

    } catch (error) {
        logger.error('Error during synchronization', { error: String(error) });
        return { success: false, message: 'Erro ao sincronizar dados. Verifique o arquivo Excel.' };
    }
}
