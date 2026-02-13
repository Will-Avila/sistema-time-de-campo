import { prisma } from './db';

export interface OS {
    id: string;
    pop: string;
    status: string;
    uf: string;
    dataEntrante: string;
    dataPrevExec: string;
    dataConclusao?: string;
    mes?: string;
    valorServico?: number;
    statusMedicao?: string;
    statusFinal?: string;
    tempo?: string;
    facilidadesPlanejadas?: number;
    caixasPlanejadas?: number;
    tipoOs?: string;
    cenario: string;
    protocolo: string;
    totalCaixas: number;
    // Extra Info
    condominio?: string;
    descricao?: string;
    anexos?: { id: string; name: string; path: string; size: number; type: string }[];
}

export interface CaixaItem {
    id: string;
    cto: string;
    pop: string;
    cidade: string;
    uf: string;
    chassi?: string;
    placa?: string;
    olt?: string;
    cenario: string;
    bairro: string;
    chassiPath: string;
    endereco: string;
    lat: number | null;
    long: number | null;
    status: string;
    valor: number;
    equipe: string;
    obs: string;
    data: string;
    nomeEquipe: string;
    potencia: string;
    done: boolean;
}

export const ALLOWED_STATUSES = ['iniciar', 'em execução', 'em execucao', 'pend. cliente', 'concluída', 'concluido', 'encerrada', 'cancelado'];

function formatExcelDate(date: string | null): string {
    return date || '-';
}

/**
 * Fetch all OS from the Database.
 */
export async function getAllOS(): Promise<OS[]> {
    const osRecords = await prisma.orderOfService.findMany({
        include: {
            caixas: { select: { id: true } },
            extraInfo: { include: { attachments: true } }
        },
        orderBy: { pop: 'asc' }
    });

    return osRecords.map(rec => ({
        id: rec.id,
        pop: rec.pop,
        status: rec.status,
        uf: rec.uf,
        dataEntrante: rec.dataEntrante,
        dataPrevExec: rec.dataPrevExec,
        dataConclusao: rec.dataConclusao,
        mes: rec.mes,
        valorServico: rec.valorServico,
        statusMedicao: rec.statusMedicao,
        statusFinal: rec.statusFinal,
        tempo: rec.tempo,
        facilidadesPlanejadas: rec.facilidadesPlanejadas,
        caixasPlanejadas: rec.caixasPlanejadas,
        tipoOs: rec.tipoOs,
        cenario: rec.cenario,
        protocolo: rec.protocolo,
        totalCaixas: rec.caixas.length,
        condominio: rec.extraInfo?.condominio || undefined,
        descricao: rec.extraInfo?.descricao || undefined,
        anexos: rec.extraInfo?.attachments.map(a => ({ id: a.id, name: a.name, path: a.path, size: a.size, type: a.type }))
    }));
}

/**
 * Fetch a single OS by ID (IdOs) or POP name.
 */
export async function getOSById(id: string) {
    const os = await prisma.orderOfService.findFirst({
        where: {
            OR: [
                { id: id },
                { pop: id }
            ]
        },
        include: {
            caixas: true,
            extraInfo: { include: { attachments: true } }
        }
    });

    if (!os) return null;

    // Fetch équipes for name resolution
    const equipes = await prisma.equipe.findMany({
        select: { id: true, fullName: true, nomeEquipe: true, name: true }
    });
    const equipeMap = new Map<string, string>();
    equipes.forEach(e => {
        equipeMap.set(e.id, e.fullName || e.nomeEquipe || e.name);
    });

    const items: CaixaItem[] = os.caixas.map(c => {
        const pathParts = [];
        pathParts.push(os.pop);
        if (c.chassi) pathParts.push(c.chassi);
        if (c.placa) pathParts.push(c.placa);
        if (c.olt) pathParts.push(c.olt);
        pathParts.push(c.cto);

        // Resolve team name from map if possible
        const resolvedNomeEquipe = (c.equipe && equipeMap.get(c.equipe)) || c.nomeEquipe;

        return {
            id: c.id,
            cto: c.cto,
            pop: c.pop,
            cidade: c.cidade,
            uf: c.uf,
            chassi: c.chassi || undefined,
            placa: c.placa || undefined,
            olt: c.olt || undefined,
            cenario: c.cenario,
            bairro: c.bairro,
            chassiPath: pathParts.filter(Boolean).join('/'),
            endereco: c.endereco || '',
            lat: c.lat,
            long: c.long,
            status: c.status,
            valor: c.valor,
            equipe: c.equipe,
            obs: c.obs,
            data: c.data,
            nomeEquipe: resolvedNomeEquipe,
            potencia: c.potencia,
            done: c.status === 'OK'
        };
    });

    return {
        id: os.id,
        pop: os.pop,
        status: os.status,
        protocolo: os.protocolo,
        uf: os.uf,
        dataEntrante: os.dataEntrante,
        dataPrevExec: os.dataPrevExec,
        dataConclusao: os.dataConclusao,
        mes: os.mes,
        valorServico: os.valorServico,
        statusMedicao: os.statusMedicao,
        statusFinal: os.statusFinal,
        tempo: os.tempo,
        facilidadesPlanejadas: os.facilidadesPlanejadas,
        caixasPlanejadas: os.caixasPlanejadas,
        tipoOs: os.tipoOs,
        cenario: os.cenario,
        totalCaixas: items.length,
        items,
        condominio: os.extraInfo?.condominio || undefined,
        descricao: os.extraInfo?.descricao || undefined,
        anexos: os.extraInfo?.attachments.map(a => ({ id: a.id, name: a.name, path: a.path, size: a.size, type: a.type }))
    };
}

/** 
 * Export placeholders or helpers needed by other modules
 */
export function invalidateExcelCache() {
    // No-op now that we use DB
}
