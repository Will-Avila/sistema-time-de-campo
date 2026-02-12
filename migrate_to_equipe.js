const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Starting migration...');

    // 1. Migrate Technicians to Equipe
    const techs = await prisma.technician.findMany();
    console.log(`Found ${techs.length} technicians to migrate.`);

    for (const tech of techs) {
        console.log(`Migrating tech: ${tech.name}`);

        // Check if an Equipe with this name already exists
        let equipe = await prisma.equipe.findFirst({
            where: { name: tech.name }
        });

        if (!equipe) {
            equipe = await prisma.equipe.create({
                data: {
                    name: tech.name,
                    fullName: tech.fullName,
                    phone: tech.phone,
                    password: tech.password,
                    isAdmin: tech.isAdmin,
                    theme: tech.theme,
                    lastUf: tech.lastUf,
                    nomeEquipe: tech.fullName || tech.name,
                    codEquipe: 'LEGACY',
                }
            });
        } else {
            // Update existing equipe with tech data if it was just a name placeholder
            equipe = await prisma.equipe.update({
                where: { id: equipe.id },
                data: {
                    fullName: tech.fullName,
                    phone: tech.phone,
                    password: tech.password,
                    isAdmin: tech.isAdmin,
                    theme: tech.theme,
                    lastUf: tech.lastUf,
                }
            });
        }

        // 2. Update relations for this tech
        const executionsResult = await prisma.serviceExecution.updateMany({
            where: { technicianId: tech.id },
            data: { equipeId: equipe.id }
        });
        console.log(`  Updated ${executionsResult.count} service executions.`);

        const notificationsResult = await prisma.notification.updateMany({
            where: { technicianId: tech.id },
            data: { equipeId: equipe.id }
        });
        console.log(`  Updated ${notificationsResult.count} notifications.`);
    }

    // 3. Set default passwords and names for Equipes without them
    const equipes = await prisma.equipe.findMany({
        where: { OR: [{ name: null }, { name: '' }] }
    });
    console.log(`Found ${equipes.length} equipes without names.`);

    const defaultPassword = await bcrypt.hash('12345678', 10);

    for (const eq of equipes) {
        // Generate a simple name/login from nomeEquipe
        let baseName = eq.nomeEquipe.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/[^a-z0-9]/g, ''); // Remove non-alphanumeric

        if (!baseName) baseName = `eq${eq.codEquipe || eq.id.substring(0, 4)}`;

        // Ensure uniqueness for name
        let finalName = baseName;
        let counter = 1;
        while (await prisma.equipe.findFirst({ where: { name: finalName } })) {
            finalName = `${baseName}${counter}`;
            counter++;
        }

        await prisma.equipe.update({
            where: { id: eq.id },
            data: {
                name: finalName,
                password: defaultPassword,
                isAdmin: false,
            }
        });
        console.log(`Set name ${finalName} for equipe ${eq.nomeEquipe}`);
    }

    console.log('Migration finished successfully!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
