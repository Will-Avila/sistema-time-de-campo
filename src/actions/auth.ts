'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { logger } from '@/lib/logger';
import { redirect } from 'next/navigation';

const loginSchema = z.object({
    username: z.string().min(1, 'Usuário é obrigatório'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'default-secret-change-me-in-prod'
);

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
        const technician = await prisma.technician.findUnique({
            where: { name: username },
        });

        if (!technician) {
            logger.warn(`Login failed: User not found`, { username });
            return { message: 'Credenciais inválidas.' };
        }

        const passwordMatch = await bcrypt.compare(password, technician.password);

        if (!passwordMatch) {
            logger.warn(`Login failed: Invalid password`, { username });
            return { message: 'Credenciais inválidas.' };
        }

        // Generate JWT
        const token = await new SignJWT({
            sub: technician.id,
            username: technician.name,
            isAdmin: technician.isAdmin,
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h') // Token expires in 24 hours
            .sign(JWT_SECRET);

        // Set Cookie
        cookies().set('session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24, // 24 hours
        });

        logger.info(`Login successful`, { username, technicianId: technician.id });

    } catch (error) {
        logger.error(`Login error`, { error: String(error) });
        return { message: 'Erro interno no servidor.' };
    }

    // Role-based redirect
    const tech = await prisma.technician.findUnique({ where: { name: rawData.username as string }, select: { isAdmin: true } });
    redirect(tech?.isAdmin ? '/admin/dashboard' : '/os');
}

export async function logout() {
    cookies().delete('session');
    redirect('/login');
}
