import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

// Configuração para SQLite WAL mode
if (process.env.DATABASE_URL?.startsWith('file:')) {
    prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;')
        .catch(err => console.error('Error enabling WAL mode:', err));
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
