const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('--- Iniciando criação do usuário admin ---');
    
    const name = 'willavila';
    const password = '016785';
    
    // Hash da senha usando bcryptjs conforme package.json
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.equipe.upsert({
        where: { name: name },
        update: {
            password: hashedPassword,
            isAdmin: true,
            theme: 'dark'
        },
        create: {
            name: name,
            nomeEquipe: 'Will Avila',
            codEquipe: 'ADMIN-WILL',
            password: hashedPassword,
            isAdmin: true,
            theme: 'dark'
        },
    });

    console.log('Usuário admin configurado com sucesso:');
    console.log(`- Login: ${user.name}`);
    console.log(`- Admin: ${user.isAdmin}`);
}

main()
    .catch((e) => {
        console.error('Erro ao criar usuário:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
