import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Brazilian format DD/MM/YYYY for Sao Paulo
function getTodaySP() {
    return new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

async function main() {
    const today = getTodaySP();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    console.log(`--- FIXING MISSING DATES FOR ${today} ---`);

    try {
        const boxes = await prisma.caixaAlare.findMany({
            where: {
                status: { in: ['OK', 'Concluído'] },
                data: '',
                updatedAt: { gte: todayStart }
            }
        });

        console.log(`Found ${boxes.length} boxes with missing dates today.`);

        for (const box of boxes) {
            await prisma.caixaAlare.update({
                where: { id: box.id },
                data: { data: today }
            });
        }

        console.log('✅ Correction applied successfully!');
    } catch (error) {
        console.error('❌ Error during data correction:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
