import { prisma } from '@/lib/db';
import { Header } from './Header';
import { getSession } from '@/lib/auth';

export async function HeaderServer() {
    const session = await getSession();
    let username = 'Usuário';
    let theme = 'light';
    let isAdmin = false;

    if (session) {
        username = session.username;
        isAdmin = session.isAdmin;

        // Fetch full profile data (theme, fullName)
        const eq = await prisma.equipe.findUnique({
            where: { id: session.id },
            select: { theme: true, fullName: true, name: true, nomeEquipe: true }
        });
        if (eq) {
            theme = eq.theme || 'light';
            if (eq.fullName || eq.nomeEquipe) {
                username = eq.fullName || eq.nomeEquipe || eq.name;
            }
        }
    }

    return <Header username={username} initialTheme={theme} isAdmin={isAdmin} />;
}
