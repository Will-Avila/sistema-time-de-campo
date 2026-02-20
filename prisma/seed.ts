const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const adminPassword = 'adminpassword';
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.equipe.upsert({
        where: { name: 'admin' },
        update: {},
        create: {
            name: 'admin',
            fullName: 'Administrador do Sistema',
            password: hashedAdminPassword,
            isAdmin: true,
            role: 'ADMIN',
            nomeEquipe: 'ADMIN',
        },
    });

    console.log('Usuário admin criado com sucesso:', admin.name);
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
