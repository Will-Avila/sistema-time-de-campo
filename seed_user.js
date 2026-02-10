const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding user...');
    const hashedPassword = await bcrypt.hash('123456', 10);

    // Create or update technician
    const technician = await prisma.technician.upsert({
        where: { name: 'tecnico' },
        update: { password: hashedPassword },
        create: {
            name: 'tecnico',
            password: hashedPassword,
            isAdmin: false
        }
    });

    console.log('Technician created/updated:', technician);
}

main()
    .catch((e) => {
        console.error('Error seeding user:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
