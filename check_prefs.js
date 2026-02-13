
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking Equipe preferences ---');
    const equipes = await prisma.equipe.findMany({
        select: { id: true, name: true, lastUf: true, lastSearch: true, lastStatus: true }
    });

    console.log(JSON.stringify(equipes, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
