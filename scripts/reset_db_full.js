const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  INICIANDO RESET TOTAL DO SISTEMA (Preservando Técnicos)...');

    try {
        // 1. Limpar Banco de Dados
        console.log('1️⃣  Limpando tabelas do banco...');

        const photos = await prisma.photo.deleteMany({});
        console.log(`   - Fotos removidas: ${photos.count}`);

        const checklists = await prisma.checklist.deleteMany({});
        console.log(`   - Itens de Checklist removidos: ${checklists.count}`);

        const executions = await prisma.serviceExecution.deleteMany({});
        console.log(`   - Execuções (OS) removidas: ${executions.count}`);

        // 2. Limpar Arquivos Físicos
        console.log('2️⃣  Limpando arquivos físicos (public/uploads)...');
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

        if (fs.existsSync(uploadsDir)) {
            fs.rmSync(uploadsDir, { recursive: true, force: true });
            console.log('   - Pasta public/uploads removida.');
            // Recriar pasta vazia
            fs.mkdirSync(uploadsDir, { recursive: true });
            console.log('   - Pasta public/uploads recriada vazia.');
        } else {
            console.log('   - Pasta public/uploads não existia.');
        }

        console.log('✅ SISTEMA RESETADO COM SUCESSO!');
        console.log('   (Tabela de Técnicos mantida intacta)');

    } catch (error) {
        console.error('❌ Erro durante o reset:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
