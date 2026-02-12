const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const adminPassword = 'adminpassword'; // User should change this later
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.technician.upsert({
        where: { name: 'admin' },
        update: {},
        create: {
            name: 'admin',
            fullName: 'Administrador do Sistema',
            phone: '00000000000',
            password: hashedAdminPassword,
            isAdmin: true,
            theme: 'system',
        },
    });

    console.log({ admin });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
