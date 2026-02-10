import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { redirect } from 'next/navigation';
import { HeaderServer } from '@/components/layout/HeaderServer';
import ProfileForm from './ProfileForm';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'default-secret-change-me-in-prod'
);

export default async function ProfilePage() {
    const session = cookies().get('session')?.value;

    if (!session) {
        redirect('/login');
    }

    let user = null;

    try {
        const { payload } = await jwtVerify(session, JWT_SECRET);
        const userId = payload.sub as string;

        user = await prisma.technician.findUnique({
            where: { id: userId },
            select: {
                name: true,
                fullName: true,
                phone: true,
            }
        });
    } catch (e) {
        redirect('/login');
    }

    if (!user) {
        redirect('/login');
    }

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 pb-20 transition-colors">
            <HeaderServer />

            <div className="pt-24 px-4 md:px-8 max-w-5xl mx-auto space-y-6">
                <ProfileForm user={user} />
            </div>
        </div>
    );
}
