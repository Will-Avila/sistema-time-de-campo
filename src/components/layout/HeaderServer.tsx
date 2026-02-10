import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/db';
import { Header } from './Header';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'default-secret-change-me-in-prod'
);

export async function HeaderServer() {
    const session = cookies().get('session')?.value;
    let username = 'Técnico';
    let theme = 'light';
    let isAdmin = false;

    if (session) {
        try {
            const { payload } = await jwtVerify(session, JWT_SECRET);
            if (payload.username) {
                username = payload.username as string;
            }
            if (payload.isAdmin) {
                isAdmin = true;
            }
            if (payload.sub) {
                const tech = await prisma.technician.findUnique({
                    where: { id: payload.sub as string },
                    select: { theme: true, fullName: true, name: true }
                });
                if (tech) {
                    theme = tech.theme || 'light';
                    if (tech.fullName) {
                        username = tech.fullName;
                    } else if (tech.name) {
                        username = tech.name;
                    }
                }
            }
        } catch (e) {
            // Invalid session
        }
    }

    return <Header username={username} initialTheme={theme} isAdmin={isAdmin} />;
}
