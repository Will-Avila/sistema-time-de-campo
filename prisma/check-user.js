const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'file:./will.db',
        },
    },
});

async function main() {
    const user = await prisma.equipe.findUnique({
        where: { name: 'willavila' },
    });
    console.log('User found:', user ? 'YES' : 'NO');
    if (user) {
        console.log('Name:', user.name);
        console.log('isAdmin:', user.isAdmin);
    }
}

main().finally(() => prisma.$disconnect());
