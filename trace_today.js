
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const todayISO = new Date().toISOString().split('T')[0];
    const osRecords = await prisma.orderOfService.findMany({
        where: {
            updatedAt: {
                gte: new Date(todayISO)
            }
        },
        include: {
            execution: true,
            caixas: { select: { status: true } }
        }
    });

    console.log('---TODAY_OS_RECORDS---');
    osRecords.forEach(os => {
        console.log(JSON.stringify({
            id: os.id,
            pop: os.pop,
            rawStatus: os.status,
            updatedAt: os.updatedAt.toISOString(),
            execution: os.execution ? {
                status: os.execution.status,
                obs: os.execution.obs
            } : null
        }, null, 2));
    });
    console.log('---END---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
