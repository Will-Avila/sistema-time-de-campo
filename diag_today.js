
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
        include: { execution: true }
    });
    console.log('---TODAY_OS---');
    osRecords.forEach(os => {
        console.log(`ID: ${os.id}, Pop: ${os.pop}, Status: ${os.status}, updatedAt: ${os.updatedAt.toISOString()}, ExecStatus: ${os.execution?.status}`);
    });
    console.log('---END---');
}
main().catch(console.error).finally(() => prisma.$disconnect());
