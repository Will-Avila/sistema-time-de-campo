
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const username = 'willavila';
    console.log(`--- Force updating status for user ${username} ---`);
    const tech = await prisma.equipe.findUnique({ where: { name: username } });
    if (!tech) {
        console.log('User not found');
        return;
    }

    await prisma.equipe.update({
        where: { id: tech.id },
        data: { lastStatus: 'Concluídas' }
    });

    const updated = await prisma.equipe.findUnique({
        where: { id: tech.id },
        select: { name: true, lastStatus: true }
    });
    console.log('Updated user:', updated);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
