const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const envPath = path.join(__dirname, '../.env');

function getEnvData() {
    try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const dbTypeMatch = envContent.match(/^DB_TYPE=(.*)$/m);
        const dbUrlMatch = envContent.match(/^DATABASE_URL=(.*)$/m);

        return {
            type: dbTypeMatch ? dbTypeMatch[1].replace(/["']/g, '').trim().toLowerCase() : 'sqlite',
            url: dbUrlMatch ? dbUrlMatch[1].replace(/["']/g, '').trim() : ''
        };
    } catch (e) {
        return { type: 'sqlite', url: '' };
    }
}

const env = getEnvData();
let content = fs.readFileSync(schemaPath, 'utf8');

const currentProviderMatch = content.match(/provider\s*=\s*"(\w+)"/);
if (currentProviderMatch) {
    const currentProvider = currentProviderMatch[1];
    const targetProvider = env.type === 'postgres' ? 'postgresql' : 'sqlite';

    if (currentProvider !== targetProvider) {
        console.log(`[DB-SYNC] 🔄 Mudando provider para ${targetProvider}...`);
        content = content.replace(/provider\s*=\s*"\w+"/, `provider = "${targetProvider}"`);
        fs.writeFileSync(schemaPath, content);
        console.log(`[DB-SYNC] ✅ schema.prisma atualizado.`);
    }

    // Validação e Alerta de URL
    if (env.type === 'sqlite' && !env.url.startsWith('file:')) {
        console.log('\x1b[31m%s\x1b[0m', `[DB-SYNC] ❌ ERRO: DB_TYPE='sqlite' mas DATABASE_URL não começa com 'file:'`);
        console.log(`[DB-SYNC] 💡 Dica: No .env, use: DATABASE_URL="file:./dev.db"`);
    } else if (env.type === 'postgres' && !env.url.startsWith('postgresql:')) {
        console.log('\x1b[31m%s\x1b[0m', `[DB-SYNC] ❌ ERRO: DB_TYPE='postgres' mas DATABASE_URL não começa com 'postgresql:'`);
    } else {
        console.log(`[DB-SYNC] 🔌 Tipo: ${env.type} | URL: OK`);
    }
}
