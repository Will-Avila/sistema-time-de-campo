const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const allBoxes = await prisma.caixaAlare.findMany({
        where: { status: { in: ['OK', 'Concluído'] } },
        select: { data: true, osId: true }
    });

    const stats = {};
    allBoxes.forEach(b => {
        if (!b.data || b.data === '-') return;
        const parts = b.data.split('/');
        if (parts.length < 3) return;
        const monthYear = `${parts[1]}/${parts[2]}`;
        stats[monthYear] = (stats[monthYear] || 0) + 1;
    });

    console.log('--- PRODUÇÃO REAL (CAIXAS) POR MÊS/ANO ---');
    console.log(JSON.stringify(stats, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
