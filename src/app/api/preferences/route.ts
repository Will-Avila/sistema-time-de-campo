import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

const VALID_THEMES = ['light', 'dark', 'system'];

export async function POST(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
    }

    try {
        const { key, value } = await request.json();

        if (key !== 'theme') {
            return NextResponse.json({ message: 'Chave inválida.' }, { status: 400 });
        }

        if (!VALID_THEMES.includes(value)) {
            return NextResponse.json({ message: 'Valor inválido.' }, { status: 400 });
        }

        await prisma.equipe.update({
            where: { id: session.id },
            data: { [key]: value }
        });

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ message: 'Erro ao salvar.' }, { status: 500 });
    }
}
