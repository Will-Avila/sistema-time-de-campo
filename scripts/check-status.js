const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const statusCounts = await prisma.orderOfService.groupBy({
        by: ['status'],
        _count: {
            id: true
        }
    });
    console.log('Status Counts in OrderOfService table:');
    console.dir(statusCounts, { depth: null });

    const executions = await prisma.serviceExecution.groupBy({
        by: ['status'],
        _count: {
            id: true
        }
    });
    console.log('\nStatus Counts in ServiceExecution table:');
    console.dir(executions, { depth: null });
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
