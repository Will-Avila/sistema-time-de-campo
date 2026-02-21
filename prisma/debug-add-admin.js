const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('--- Depurando criação do usuário admin ---');

    const name = 'willavila';
    const password = '016785';

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        console.log('Tentando upsert...');
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

        console.log('Sucesso!');
        console.log(JSON.stringify(user, null, 2));
    } catch (e) {
        console.error('Erro detalhado:');
        console.error('Código:', e.code);
        console.error('Meta:', e.meta);
        console.error('Mensagem:', e.message);
        process.exit(1);
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
