
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getDateSP(date) {
    if (!date) return '-';
    return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(new Date(date));
}

function getTodaySP() {
    return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(new Date());
}

async function debug() {
    console.log('--- DETAILED OS TRACE ---');
    const today = getTodaySP();
    console.log('Today (SP):', today);

    const osRecords = await prisma.orderOfService.findMany({
        include: { execution: true },
        orderBy: { updatedAt: 'desc' }
    });

    console.log('Total records:', osRecords.length);

    osRecords.forEach(os => {
        const spDate = getDateSP(os.updatedAt);
        const spDay = spDate.split(' ')[0];
        const isToday = spDay === today;

        // Let's also check if the execution was updated today
        let execToday = false;
        if (os.execution) {
            execToday = getDateSP(os.execution.updatedAt).split(' ')[0] === today;
        }

        if (isToday || execToday || os.pop.includes('AQU')) {
            console.log(`POPS: ${os.pop} | ID: ${os.id}`);
            console.log(`  OS.updatedAt: ${os.updatedAt.toISOString()} (SP: ${spDate}) -> Today: ${isToday}`);
            if (os.execution) {
                console.log(`  Exec.updatedAt: ${os.execution.updatedAt.toISOString()} (SP: ${getDateSP(os.execution.updatedAt)}) -> Today: ${execToday}`);
                console.log(`  Exec.status: ${os.execution.status} | Obs: ${os.execution.obs?.substring(0, 30)}...`);
            }
            console.log('-------------------');
        }
    });
}

debug().catch(console.error).finally(() => prisma.$disconnect());
