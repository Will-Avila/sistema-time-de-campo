import * as XLSX from 'xlsx';
import { readFile } from 'fs/promises';
import { prisma } from './db';
import { logger } from './logger';
import bcrypt from 'bcryptjs';
import { syncProgressStore } from '@/lib/sync-progress';
import { syncNewOSNotifications, cleanupOldNotifications } from '@/actions/notification';

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
        if (!date) return '-';

        // Use UTC values to avoid timezone shifts (e.g., BRT vs UTC)
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();

        return `${day}/${month}/${year}`;
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

        const caixaSheet = workbook.Sheets['CaixaAlares'];
        const caixaRows: any[] = caixaSheet ? XLSX.utils.sheet_to_json(caixaSheet) : [];

        const lancaSheet = workbook.Sheets['LancaAlares'];
        const lancaRows: any[] = lancaSheet ? XLSX.utils.sheet_to_json(lancaSheet) : [];

        const equipeSheet = workbook.Sheets['Equipes'];
        const equipeRows: any[] = equipeSheet ? XLSX.utils.sheet_to_json(equipeSheet) : [];

        const totalRows = osRows.length + caixaRows.length + lancaRows.length + equipeRows.length;
        let currentStep = 0;

        syncProgressStore.update({
            status: 'RUNNING',
            total: totalRows,
            current: 0,
            message: 'Iniciando sincronização...'
        });

        logger.info(`Found ${totalRows} total rows to sync.`);
        let osCount = 0;

        for (const row of osRows) {
            syncProgressStore.update({
                current: currentStep,
                message: `Processando OS: ${osCount + 1} de ${osRows.length}`
            });

            const osId = String(row.IdOs || row.ID || row.Pop || '');
            if (!osId) continue;

            const newData = {
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
                descricao: String(row['Descrição'] || row['Descricao'] || ''),
                observacoes: String(row['Observacoes'] || row['Observações'] || row['Observação'] || row['OBS'] || row['Obs'] || ''),
            };

            const existing = await prisma.orderOfService.findUnique({ where: { id: osId } });

            if (existing) {
                // Check if anything actually changed to avoid updating updatedAt
                const hasChanged =
                    existing.pop !== newData.pop ||
                    existing.status !== newData.status ||
                    existing.uf !== newData.uf ||
                    existing.dataEntrante !== newData.dataEntrante ||
                    existing.dataPrevExec !== newData.dataPrevExec ||
                    existing.dataConclusao !== newData.dataConclusao ||
                    existing.cenario !== newData.cenario ||
                    existing.protocolo !== newData.protocolo ||
                    existing.mes !== newData.mes ||
                    existing.valorServico !== newData.valorServico ||
                    existing.statusMedicao !== newData.statusMedicao ||
                    existing.statusFinal !== newData.statusFinal ||
                    existing.tempo !== newData.tempo ||
                    existing.facilidadesPlanejadas !== newData.facilidadesPlanejadas ||
                    existing.caixasPlanejadas !== newData.caixasPlanejadas ||
                    existing.tipoOs !== newData.tipoOs ||
                    existing.descricao !== newData.descricao ||
                    existing.observacoes !== newData.observacoes;

                if (hasChanged) {
                    await prisma.orderOfService.update({
                        where: { id: osId },
                        data: newData
                    });
                }
            } else {
                await prisma.orderOfService.create({
                    data: { ...newData, id: osId }
                });
            }
            osCount++;
            currentStep++;
        }

        // 2. Sync CaixaAlares Sheet
        logger.info(`Found ${caixaRows.length} Caixa rows in Excel.`);
        let caixaCount = 0;

        // For Caixas, it might be better to clear and re-insert for a specific OS or use a mapping.
        // But since user wants to "atualizar o que foi acrescentado", we'll use IdCaixa if available.
        let rowIndex = 0;
        const osWithMarkedBoxes = new Set<string>();

        for (const row of caixaRows) {
            syncProgressStore.update({
                current: currentStep,
                message: `Processando Caixas: ${caixaCount + 1} de ${caixaRows.length}`
            });

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
            const caixaId = excelId || `idx-${osId}-${currentIndex}`;
            const newData = {
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
            };

            const existing = await prisma.caixaAlare.findUnique({ where: { id: caixaId } });

            if (existing) {
                // BUG FIX: Don't let Excel overwrite field progress.
                // If technician already marked the box (OK/NOK), preserve it unless Excel explicitly has a status.
                const isMarkedByTech = ['OK', 'NOK'].includes(existing.status);
                const excelHasStatus = row.Status && String(row.Status).trim() !== '' && String(row.Status).trim() !== 'Pendente';

                // If marked by tech and Excel says 'Pendente', keep tech data.
                if (isMarkedByTech && !excelHasStatus) {
                    newData.status = existing.status;
                    newData.equipe = existing.equipe || newData.equipe;
                    newData.nomeEquipe = existing.nomeEquipe || newData.nomeEquipe;
                    newData.obs = existing.obs || newData.obs;
                    newData.potencia = existing.potencia || newData.potencia;
                    newData.data = existing.data || newData.data;
                }

                const hasChanged =
                    existing.osId !== newData.osId ||
                    existing.cto !== newData.cto ||
                    existing.pop !== newData.pop ||
                    existing.cidade !== newData.cidade ||
                    existing.uf !== newData.uf ||
                    existing.chassi !== newData.chassi ||
                    existing.placa !== newData.placa ||
                    existing.olt !== newData.olt ||
                    existing.cenario !== newData.cenario ||
                    existing.bairro !== newData.bairro ||
                    existing.endereco !== newData.endereco ||
                    existing.lat !== newData.lat ||
                    existing.long !== newData.long ||
                    existing.status !== newData.status ||
                    existing.valor !== newData.valor ||
                    existing.equipe !== newData.equipe ||
                    existing.obs !== newData.obs ||
                    existing.data !== newData.data ||
                    existing.nomeEquipe !== newData.nomeEquipe ||
                    existing.potencia !== newData.potencia ||
                    existing.excelId !== newData.excelId;

                if (hasChanged) {
                    await prisma.caixaAlare.update({
                        where: { id: caixaId },
                        data: newData
                    });
                }
            } else {
                await prisma.caixaAlare.create({
                    data: { ...newData, id: caixaId }
                });
            }
            caixaCount++;
            currentStep++;
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
        let lancaCount = 0;
        if (lancaRows.length > 0) {
            logger.info(`Found ${lancaRows.length} Lanca rows in Excel.`);

            let lancaIndex = 0;
            for (const row of lancaRows) {
                syncProgressStore.update({
                    current: currentStep,
                    message: `Processando Lançamentos: ${lancaCount + 1} de ${lancaRows.length}`
                });

                const currentIndex = lancaIndex++;
                const osId = String(row.Os || '');
                const excelId = String(row.IdLancamento || '');

                const existingLanca = await prisma.lancaAlare.findUnique({ where: { id: excelId || `lanca-${osId}-${currentIndex}` } });
                const updateLancaData: any = {
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
                };

                // Preservar dados de execução se o Excel vier vazio/pendente
                if (existingLanca && existingLanca.status !== '' && updateLancaData.status === '') {
                    updateLancaData.status = existingLanca.status;
                    updateLancaData.lancado = existingLanca.lancado || updateLancaData.lancado;
                    updateLancaData.cenarioReal = existingLanca.cenarioReal || updateLancaData.cenarioReal;
                    updateLancaData.valorReal = Number(existingLanca.valorReal) || updateLancaData.valorReal;
                }

                await prisma.lancaAlare.upsert({
                    where: { id: excelId || `lanca-${osId}-${currentIndex}` },
                    update: updateLancaData,
                    create: {
                        id: excelId || `lanca-${osId}-${currentIndex}`,
                        ...updateLancaData
                    }
                });
                lancaCount++;
                currentStep++;
            }
        }

        // 4. Sync Equipes
        let equipeCount = 0;
        if (equipeRows.length > 0) {
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
                currentStep++;
                syncProgressStore.update({
                    current: currentStep,
                    message: `Processando Equipes: ${equipeCount} de ${equipeRows.length}`
                });
            }
        }

        syncProgressStore.update({
            status: 'COMPLETED',
            current: totalRows,
            message: 'Sincronização concluída com sucesso!'
        });

        logger.info('Synchronization completed successfully.');

        // Trigger notifications and cleanup AFTER successful sync
        try {
            await syncNewOSNotifications();
            await cleanupOldNotifications();
        } catch (notifError) {
            logger.error('Error in post-sync notifications/cleanup', { error: String(notifError) });
        }

        return {
            success: true,
            message: `Sincronizado: ${osCount} OS, ${caixaCount} Caixas, ${lancaCount} Lançamentos e ${equipeCount} Equipes.`,
            stats: { osCount, caixaCount, lancaCount, equipeCount }
        };

    } catch (error) {
        logger.error('Error during synchronization', { error: String(error) });
        syncProgressStore.update({
            status: 'ERROR',
            message: 'Erro ao sincronizar dados.'
        });
        return { success: false, message: 'Erro ao sincronizar dados. Verifique o arquivo Excel.' };
    }
}
