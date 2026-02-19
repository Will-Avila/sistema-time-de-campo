import { prisma } from '../lib/db';

async function main() {
    console.log('--- ADMIN USERS ---');
    const admins = await prisma.equipe.findMany({
        where: {
            OR: [
                { role: 'ADMIN' },
                { isAdmin: true }
            ]
        },
        select: { id: true, name: true, role: true, isAdmin: true }
    });
    console.log(admins);

    console.log('\n--- RECENT NOTIFICATIONS ---');
    const logs = await prisma.notification.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { equipe: { select: { name: true, role: true } } }
    });
    console.log(logs.map(n => ({
        id: n.id,
        title: n.title,
        to: n.equipe?.name,
        role: n.equipe?.role,
        createdAt: n.createdAt
    })));
}

main().finally(() => prisma.$disconnect());
