
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getTodaySP() {
    return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(new Date());
}

function getDateSP(date) {
    if (!date) return '-';
    let d;
    if (typeof date === 'string') {
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return date;
        d = new Date(date);
    } else {
        d = date;
    }
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(d);
}

function isSameDaySP(date, targetDateBR) {
    if (!date) return false;
    const res = getDateSP(date) === targetDateBR;
    return res;
}

// Replicate the exact logic from dashboard.ts getOSStatusInfo
function getOSStatusInfo({ osStatus, execution }) {
    if (osStatus === 'CANCELADO') return { label: 'Cancelada' };
    if (!execution) return { label: 'Pendente' };

    // This is from dashboard.ts:79 -> uses getOSStatusInfo from lib/utils
    // Let's assume the execution has the status we need.
    // Actually, dashboard.ts uses getOSStatusInfo({ osStatus, execution }).label
    // I need to see what's in 'os.execution.obs' or 'os.execution.status'

    // From my previous trace_today.js:
    // execution: { status: "DONE", obs: "Status: Concluída\nteste" }

    const obs = (execution.obs || '').toUpperCase();
    if (obs.includes('STATUS: CONCLUÍDA') || obs.includes('STATUS: CONCLUIDA')) return { label: 'Concluída' };
    if (obs.includes('STATUS: SEM EXECUÇÃO') || obs.includes('STATUS: SEM EXECUCAO')) return { label: 'Sem Execução' };
    if (obs.includes('STATUS: EM ANÁLISE') || obs.includes('STATUS: EM ANALISE')) return { label: 'Em Análise' };

    return { label: execution.status === 'DONE' ? 'Concluída' : 'Pendente' };
}

async function debug() {
    console.log('--- DEBUG DASHBOARD COUNT ---');
    const todayDate = getTodaySP();
    console.log('Today (SP):', todayDate);

    const osRecords = await prisma.orderOfService.findMany({
        include: { execution: true }
    });

    const osList = osRecords.map(os => {
        const execution = os.execution;
        return {
            id: os.id,
            pop: os.pop,
            rawStatus: os.status,
            dataConclusao: os.dataConclusao || '-',
            lastUpdate: os.updatedAt ? os.updatedAt.toISOString() : null,
            executionStatus: execution ? getOSStatusInfo({ osStatus: os.status, execution }).label : 'Pendente',
        };
    });

    const completedToday = osList.filter(os => {
        const isExcelToday = os.dataConclusao === todayDate;
        const s = (os.executionStatus || '').toUpperCase().trim();

        // This is the logic currently in dashboard.ts
        const isAppToday = os.lastUpdate && isSameDaySP(os.lastUpdate, todayDate) &&
            (s.includes('CONCLUÍDA') || s.includes('CONCLUIDA') || s.includes('SEM EXECUÇÃO') || s.includes('SEM EXECUCAO') || s.includes('EM ANÁLISE') || s.includes('EM ANALISE'));

        if (isExcelToday || isAppToday || (os.pop === 'NTL17' || os.id.includes('AQU01'))) {
            console.log(`OS: ${os.pop} (${os.id}) | Excel: ${os.dataConclusao} | AppStatus: ${os.executionStatus} | LastUpdate: ${os.lastUpdate} | isSameDay: ${isSameDaySP(os.lastUpdate, todayDate)}`);
            console.log(`  -> isExcelToday: ${isExcelToday} | isAppToday: ${isAppToday}`);
        }

        return isExcelToday || isAppToday;
    });

    console.log('\n--- SUMMARY ---');
    console.log('Count:', completedToday.length);
    console.log('Items:', completedToday.map(i => i.pop).join(', '));
}

debug().catch(console.error).finally(() => prisma.$disconnect());
