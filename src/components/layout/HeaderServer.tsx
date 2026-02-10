import { prisma } from '@/lib/db';
import { Header } from './Header';
import { getSession } from '@/lib/auth';

export async function HeaderServer() {
    const session = await getSession();
    let username = 'Técnico';
    let theme = 'light';
    let isAdmin = false;

    if (session) {
        username = session.username;
        isAdmin = session.isAdmin;

        // Fetch full profile data (theme, fullName)
        const tech = await prisma.technician.findUnique({
            where: { id: session.id },
            select: { theme: true, fullName: true, name: true }
        });
        if (tech) {
            theme = tech.theme || 'light';
            if (tech.fullName) {
                username = tech.fullName;
            }
        }
    }

    return <Header username={username} initialTheme={theme} isAdmin={isAdmin} />;
}
