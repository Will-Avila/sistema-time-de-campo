import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️ Iniciando limpeza de dados operacionais...');

    try {
        // 1. Delete Photos (Most dependent)
        const deletedPhotos = await prisma.photo.deleteMany({});
        console.log(`✅ Fotos removidas: ${deletedPhotos.count}`);

        // 2. Delete Checklists
        const deletedChecklists = await prisma.checklist.deleteMany({});
        console.log(`✅ Itens de Checklist removidos: ${deletedChecklists.count}`);

        // 3. Delete Service Executions (OS Data)
        const deletedExecutions = await prisma.serviceExecution.deleteMany({});
        console.log(`✅ Execuções de Serviço removidas: ${deletedExecutions.count}`);

        console.log('🎉 Limpeza concluída com sucesso! (Técnicos foram mantidos)');
    } catch (error) {
        console.error('❌ Erro ao limpar banco:', error);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
