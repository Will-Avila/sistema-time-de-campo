import * as XLSX from 'xlsx';
import { readFile } from 'fs/promises';
import { prisma } from './db';
import { logger } from './logger';
import bcrypt from 'bcryptjs';

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
                    dataConclusao: formatExcelDate(row['Conclusao']),
                    cenario: String(row.Cenario || ''),
                    protocolo: String(row.Protocolo || ''),
                    mes: String(row.Mes || row.MES || ''),
                    valorServico: typeof row.ValorServico === 'number' ? row.ValorServico : 0,
                    statusMedicao: String(row.StatusMedicao || ''),
                    statusFinal: String(row.StatusFinal || ''),
                    tempo: String(row.Tempo || ''),
                    facilidadesPlanejadas: typeof row.FacilidadesPlanejadas === 'number' ? row.FacilidadesPlanejadas : 0,
                    caixasPlanejadas: typeof row.CaixasPlanejadas === 'number' ? row.CaixasPlanejadas : 0,
                    tipoOs: String(row.TipoOs || ''),
                },
                create: {
                    id: osId,
                    pop: String(row.POP || row.Pop || ''),
                    status: String(row.StatusOperacao || '').trim(),
                    uf: String(row.UF || ''),
                    dataEntrante: formatExcelDate(row['Entrante']),
                    dataPrevExec: formatExcelDate(row['Prev. Exec.']),
                    dataConclusao: formatExcelDate(row['Conclusao']),
                    cenario: String(row.Cenario || ''),
                    protocolo: String(row.Protocolo || ''),
                    mes: String(row.Mes || row.MES || ''),
                    valorServico: typeof row.ValorServico === 'number' ? row.ValorServico : 0,
                    statusMedicao: String(row.StatusMedicao || ''),
                    statusFinal: String(row.StatusFinal || ''),
                    tempo: String(row.Tempo || ''),
                    facilidadesPlanejadas: typeof row.FacilidadesPlanejadas === 'number' ? row.FacilidadesPlanejadas : 0,
                    caixasPlanejadas: typeof row.CaixasPlanejadas === 'number' ? row.CaixasPlanejadas : 0,
                    tipoOs: String(row.TipoOs || ''),
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
                    pop: String(row.Pop || ''),
                    cidade: String(row.Cidade || ''),
                    uf: String(row.UF || ''),
                    chassi: String(row.Chassi || ''),
                    placa: String(row.Placa || ''),
                    olt: String(row.OLT || ''),
                    cenario: String(row.Cenario || ''),
                    bairro: String(row.Bairro || ''),
                    endereco: String(row.Endereco || ''),
                    lat: row.Lat ? parseFloat(String(row.Lat)) : null,
                    long: row.Long ? parseFloat(String(row.Long)) : null,
                    status: boxStatus,
                    valor: typeof row.Valor === 'number' ? row.Valor : 0,
                    equipe: String(row.Equipe || ''),
                    obs: String(row.OBS || ''),
                    data: formatExcelDate(row.Data),
                    nomeEquipe: String(row.NomeEquipe || ''),
                    potencia: String(row.Potência || ''),
                    excelId: excelId || null,
                },
                create: {
                    id: excelId || `idx-${osId}-${currentIndex}`,
                    osId,
                    cto: String(row.Cto || ''),
                    pop: String(row.Pop || ''),
                    cidade: String(row.Cidade || ''),
                    uf: String(row.UF || ''),
                    chassi: String(row.Chassi || ''),
                    placa: String(row.Placa || ''),
                    olt: String(row.OLT || ''),
                    cenario: String(row.Cenario || ''),
                    bairro: String(row.Bairro || ''),
                    endereco: String(row.Endereco || ''),
                    lat: row.Lat ? parseFloat(String(row.Lat)) : null,
                    long: row.Long ? parseFloat(String(row.Long)) : null,
                    status: boxStatus,
                    valor: typeof row.Valor === 'number' ? row.Valor : 0,
                    equipe: String(row.Equipe || ''),
                    obs: String(row.OBS || ''),
                    data: formatExcelDate(row.Data),
                    nomeEquipe: String(row.NomeEquipe || ''),
                    potencia: String(row.Potência || ''),
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

        // 3. Sync LancaAlare
        const lancaSheet = workbook.Sheets['LancaAlares'];
        let lancaCount = 0;
        if (lancaSheet) {
            const lancaRows: any[] = XLSX.utils.sheet_to_json(lancaSheet);
            logger.info(`Found ${lancaRows.length} Lanca rows in Excel.`);

            let lancaIndex = 0;
            for (const row of lancaRows) {
                const currentIndex = lancaIndex++;
                const osId = String(row.Os || '');
                const excelId = String(row.IdLancamento || '');

                await prisma.lancaAlare.upsert({
                    where: { id: excelId || `lanca-${osId}-${currentIndex}` },
                    update: {
                        excelId: excelId || null,
                        osId: osId || null,
                        de: String(row.De || ''),
                        para: String(row.Para || ''),
                        previsao: String(row.Previsao || ''),
                        cenario: String(row.Cenario || ''),
                        valor: typeof row.Valor === 'number' ? row.Valor : 0,
                        cabo: String(row.Cabo || ''),
                        status: String(row.Status || ''),
                        lancado: String(row.Lancado || ''),
                        cenarioReal: String(row.CenarioReal || ''),
                        valorReal: typeof row.ValorReal === 'number' ? row.ValorReal : 0,
                        difLanc: typeof row.DifLanc === 'number' ? row.DifLanc : 0,
                        orcadoAtual: typeof row.OrcadoAtual === 'number' ? row.OrcadoAtual : 0,
                        data: formatExcelDate(row.Data),
                        equipe: String(row.Equipe || ''),
                    },
                    create: {
                        id: excelId || `lanca-${osId}-${currentIndex}`,
                        excelId: excelId || null,
                        osId: osId || null,
                        de: String(row.De || ''),
                        para: String(row.Para || ''),
                        previsao: String(row.Previsao || ''),
                        cenario: String(row.Cenario || ''),
                        valor: typeof row.Valor === 'number' ? row.Valor : 0,
                        cabo: String(row.Cabo || ''),
                        status: String(row.Status || ''),
                        lancado: String(row.Lancado || ''),
                        cenarioReal: String(row.CenarioReal || ''),
                        valorReal: typeof row.ValorReal === 'number' ? row.ValorReal : 0,
                        difLanc: typeof row.DifLanc === 'number' ? row.DifLanc : 0,
                        orcadoAtual: typeof row.OrcadoAtual === 'number' ? row.OrcadoAtual : 0,
                        data: formatExcelDate(row.Data),
                        equipe: String(row.Equipe || ''),
                    }
                });
                lancaCount++;
            }
        }

        // 4. Sync Equipes
        const equipeSheet = workbook.Sheets['Equipes'];
        let equipeCount = 0;
        if (equipeSheet) {
            const equipeRows: any[] = XLSX.utils.sheet_to_json(equipeSheet);
            logger.info(`Found ${equipeRows.length} Equipe rows in Excel.`);

            const defaultPassword = await bcrypt.hash('12345678', 10);

            for (const row of equipeRows) {
                const excelId = String(row.IdEquipe || '');
                if (!excelId) continue;

                const nomeEquipe = String(row.NomeEquipe || '');

                // Helper to generate a default login name if it's new
                const generateName = (nome: string) => {
                    return nome.toLowerCase()
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^a-z0-9]/g, '');
                };

                const existing = await prisma.equipe.findUnique({ where: { excelId } });

                if (existing) {
                    await prisma.equipe.update({
                        where: { excelId },
                        data: {
                            codEquipe: String(row.CodEquipe || ''),
                            nomeEquipe: nomeEquipe,
                            prestadora: String(row.Prestadora || ''),
                            classificacao: String(row.Classificacao || ''),
                            unidade: String(row.Unidade || ''),
                            descEquipe: String(row.DescEquipe || ''),
                            centro: String(row.Centro || ''),
                        }
                    });
                } else {
                    let baseName = generateName(nomeEquipe) || `eq${row.CodEquipe || excelId}`;
                    let finalName = baseName;
                    let counter = 1;
                    while (await prisma.equipe.findUnique({ where: { name: finalName } })) {
                        finalName = `${baseName}${counter}`;
                        counter++;
                    }

                    await prisma.equipe.create({
                        data: {
                            excelId,
                            codEquipe: String(row.CodEquipe || ''),
                            nomeEquipe: nomeEquipe,
                            name: finalName,
                            password: defaultPassword,
                            isAdmin: false,
                            prestadora: String(row.Prestadora || ''),
                            classificacao: String(row.Classificacao || ''),
                            unidade: String(row.Unidade || ''),
                            descEquipe: String(row.DescEquipe || ''),
                            centro: String(row.Centro || ''),
                        }
                    });
                }
                equipeCount++;
            }
        }

        logger.info('Synchronization completed successfully.');
        return {
            success: true,
            message: `Sincronizado: ${osCount} OS, ${caixaCount} Caixas, ${lancaCount} Lançamentos e ${equipeCount} Equipes.`,
            stats: { osCount, caixaCount, lancaCount, equipeCount }
        };

    } catch (error) {
        logger.error('Error during synchronization', { error: String(error) });
        return { success: false, message: 'Erro ao sincronizar dados. Verifique o arquivo Excel.' };
    }
}
