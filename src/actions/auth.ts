'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { redirect } from 'next/navigation';
import { createToken, setSessionCookie, clearSessionCookie } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const loginSchema = z.object({
    username: z.string().min(1, 'Usuário é obrigatório'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export async function login(prevState: any, formData: FormData) {
    const rawData = {
        username: formData.get('username'),
        password: formData.get('password'),
    };

    const validatedFields = loginSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Campos inválidos. Verifique os dados.',
        };
    }

    const { username, password } = validatedFields.data;

    try {
        const equipe = await prisma.equipe.findFirst({
            where: { name: username },
        });

        if (!equipe) {
            logger.warn(`Login failed: User not found`, { username });
            return { message: 'Credenciais inválidas.' };
        }

        const passwordMatch = await bcrypt.compare(password, equipe.password);

        if (!passwordMatch) {
            logger.warn(`Login failed: Invalid password`, { username });
            return { message: 'Credenciais inválidas.' };
        }

        // Generate JWT and set cookie using centralized auth
        const token = await createToken({
            id: equipe.id,
            username: equipe.name,
            isAdmin: equipe.isAdmin,
        });

        setSessionCookie(token);

        logger.info(`Login successful`, { username, equipeId: equipe.id });

        // Redirect based on role — reuse already-fetched data (no extra query)
        redirect(equipe.isAdmin ? '/admin/dashboard' : '/os');

    } catch (error) {
        // redirect() throws a special error in Next.js — rethrow it
        if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error;
        logger.error(`Login error`, { error: String(error) });
        return { message: 'Erro interno no servidor.' };
    }
}

export async function logout() {
    clearSessionCookie();
    redirect('/login');
}
