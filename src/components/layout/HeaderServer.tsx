import { prisma } from '@/lib/db';
import { Header } from './Header';
import { getSession } from '@/lib/auth';

export async function HeaderServer() {
    const session = await getSession();
    let username = 'Usuário';
    let theme = 'light';
    let isAdmin = false;

    if (session) {
        isAdmin = session.isAdmin;

        // Fetch user data
        const eq = await prisma.equipe.findUnique({
            where: { id: session.id },
            select: { fullName: true, name: true, nomeEquipe: true }
        });
        if (eq) {
            if (eq.fullName || eq.nomeEquipe) {
                username = eq.fullName || eq.nomeEquipe || eq.name;
            }
        }
    }

    return <Header username={username} isAdmin={isAdmin} />;
}
