
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to simulate the logic in lib/utils.ts (simplified for diag)
function getStatusLabel(osStatus, execution) {
    if (!execution) return 'Pendente';
    let closureResult = 'Concluída';
    if (execution.obs) {
        if (execution.obs.includes('Sem Execução')) {
            closureResult = 'Sem Execução';
        }
    }
    if (execution.status === 'DONE') {
        return `${closureResult} - Em análise`;
    }
    return 'Pendente';
}

async function main() {
    const todayISO = new Date().toISOString().split('T')[0];
    const todayDate = new Date().toLocaleDateString('pt-BR');

    console.log(`Server Today ISO: ${todayISO}`);
    console.log(`Server Today Date: ${todayDate}`);

    const osRecords = await prisma.orderOfService.findMany({
        where: {
            updatedAt: {
                gte: new Date(todayISO)
            }
        },
        include: { execution: true }
    });

    console.log('---DIAG_RESULTS---');
    osRecords.forEach(os => {
        const execLabel = getStatusLabel(os.status, os.execution);
        const lastUpdate = os.updatedAt.toISOString();
        const isAppToday = lastUpdate.startsWith(todayISO) && (execLabel.includes('Concluída') || execLabel.includes('Sem Execução'));

        console.log(JSON.stringify({
            id: os.id,
            pop: os.pop,
            rawStatus: os.status,
            updatedAt: lastUpdate,
            execStatus: os.execution?.status,
            calculatedLabel: execLabel,
            dataConclusao: os.dataConclusao,
            isAppToday,
            isExcelToday: os.dataConclusao === todayDate
        }));
    });
    console.log('---END---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
