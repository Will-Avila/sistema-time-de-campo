const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const username = 'willavila';
    const password = 'mudar_senha_depois'; // O usuário deve mudar isso
    console.log(`[SETUP] Iniciando criação/atualização do administrador: ${username}`);

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.equipe.upsert({
        where: { name: username },
        update: {
            password: hashedPassword,
            isAdmin: true,
            role: 'ADMIN'
        },
        create: {
            name: username,
            nomeEquipe: 'Will Avila',
            codEquipe: 'ADMIN-WILL',
            password: hashedPassword,
            isAdmin: true,
            role: 'ADMIN',
            theme: 'dark'
        }
    });

    console.log('[SETUP] ✅ Administrador configurado com sucesso!');
    console.log(`[SETUP] Login: ${user.name}`);
    console.log(`[SETUP] Senha padrão: ${password}`);
    console.log('[SETUP] ⚠️  RECOMENDAÇÃO: Altere a senha no primeiro login.');
}

main()
    .catch((e) => {
        console.error('[SETUP] ❌ Erro ao configurar admin:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
