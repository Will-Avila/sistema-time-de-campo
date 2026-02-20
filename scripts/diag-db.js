const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const months = await prisma.orderOfService.findMany({
        distinct: ['mes'],
        select: { mes: true }
    });
    console.log('--- MESES ENCONTRADOS NO BANCO ---');
    console.log(JSON.stringify(months, null, 2));

    const sample = await prisma.orderOfService.findFirst({
        select: { mes: true, caixasPlanejadas: true, facilidadesPlanejadas: true }
    });
    console.log('--- AMOSTRA DE DADOS ---');
    console.log(JSON.stringify(sample, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
