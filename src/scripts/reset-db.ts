import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- RESETTING DATABASE (PRESERVING TEAMS) ---');

    try {
        await prisma.$transaction([
            // Delete in order of dependencies if not cascading, but most are handled
            prisma.photo.deleteMany(),
            prisma.notification.deleteMany(),
            prisma.serviceExecution.deleteMany(),
            prisma.caixaAlare.deleteMany(),
            prisma.oSAttachment.deleteMany(),
            prisma.lancaAlare.deleteMany(),
            prisma.orderOfService.deleteMany(),
        ]);

        console.log('✅ Database reset successfully!');
        console.log('✅ Teams (Equipes) preserved.');
    } catch (error) {
        console.error('❌ Error during database reset:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
