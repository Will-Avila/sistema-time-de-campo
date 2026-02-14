
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const statuses = await prisma.orderOfService.groupBy({
        by: ['status'],
        _count: {
            id: true
        }
    });
    console.log(JSON.stringify(statuses, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
