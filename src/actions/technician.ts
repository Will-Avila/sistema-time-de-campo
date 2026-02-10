'use server';

import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'default-secret-change-me-in-prod'
);

export async function updatePreferences(key: 'theme' | 'lastUf', value: string) {
    const session = cookies().get('session')?.value;
    if (!session) return { message: 'Não autenticado.' };

    try {
        const { payload } = await jwtVerify(session, JWT_SECRET);
        const technicianId = payload.sub as string;

        await prisma.technician.update({
            where: { id: technicianId },
            data: { [key]: value }
        });

        revalidatePath('/os');
        return { success: true };
    } catch (error) {
        console.error('Error updating preferences:', error);
        return { message: 'Erro ao salvar preferência.' };
    }
}

// Helper for username validation
function isValidUsername(username: string) {
    return /^[a-zA-Z0-9]+$/.test(username);
}

export async function createTechnician(prevState: any, formData: FormData) {
    const name = formData.get('name') as string;
    const fullName = formData.get('fullName') as string;
    const phone = formData.get('phone') as string;
    const password = formData.get('password') as string;
    const isAdmin = formData.get('isAdmin') === 'true';

    if (!name || !password || password.length < 6) {
        return { message: 'Nome de usuário e senha (min 6 caracteres) são obrigatórios.' };
    }

    if (!isValidUsername(name)) {
        return { message: 'Nome de usuário deve conter apenas letras e números (sem espaços).' };
    }

    try {
        const existing = await prisma.technician.findUnique({ where: { name } });
        if (existing) {
            return { message: 'Já existe um usuário com este nome.' };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.technician.create({
            data: {
                name,
                fullName,
                phone,
                password: hashedPassword,
                isAdmin,
            }
        });

        revalidatePath('/admin/technicians');
        return { success: true, message: `${isAdmin ? 'Admin' : 'Técnico'} "${name}" criado com sucesso!` };
    } catch (error: any) {
        console.error('Error creating technician:', error);
        if (error.code === 'P2002') {
            return { message: 'Já existe um usuário com este nome.' };
        }
        if (error.message?.includes('Unknown arg') || error.message?.includes('Column not found')) {
            return { message: 'Erro de banco de dados. Por favor, reinicie o sistema (Schema mismatch).' };
        }
        return { message: 'Erro ao criar usuário: ' + (error.message || 'Erro desconhecido') };
    }
}

export async function deleteTechnician(id: string) {
    try {
        await prisma.technician.delete({ where: { id } });
        revalidatePath('/admin/technicians');
        return { success: true };
    } catch (error) {
        console.error('Error deleting technician:', error);
        return { message: 'Erro ao remover usuário.' };
    }
}

export async function updateTechnician(id: string, data: { name?: string; fullName?: string; phone?: string; password?: string; isAdmin?: boolean }) {
    try {
        const updateData: any = {};

        if (data.name) {
            if (!isValidUsername(data.name)) {
                return { message: 'Nome de usuário deve conter apenas letras e números.' };
            }
            updateData.name = data.name;
        }

        if (data.fullName !== undefined) updateData.fullName = data.fullName;
        if (data.phone !== undefined) updateData.phone = data.phone;

        if (data.password && data.password.length >= 6) {
            updateData.password = await bcrypt.hash(data.password, 10);
        }
        if (data.isAdmin !== undefined) updateData.isAdmin = data.isAdmin;

        await prisma.technician.update({ where: { id }, data: updateData });
        revalidatePath('/admin/technicians');
        return { success: true, message: 'Usuário atualizado!' };
    } catch (error) {
        console.error('Error updating technician:', error);
        return { message: 'Erro ao atualizar usuário.' };
    }
}

export async function getTechnicians() {
    return prisma.technician.findMany({
        orderBy: { createdAt: 'desc' },
    });
}
export async function updateProfile(data: { name?: string; fullName?: string; phone?: string; password?: string }) {
    const session = cookies().get('session')?.value;
    if (!session) return { message: 'Não autenticado.' };

    try {
        const { payload } = await jwtVerify(session, JWT_SECRET);
        const id = payload.sub as string;
        const updateData: any = {};

        if (data.name) {
            if (!isValidUsername(data.name)) {
                return { message: 'Nome de usuário deve conter apenas letras e números.' };
            }
            // Check uniqueness if name changed
            const existing = await prisma.technician.findFirst({
                where: {
                    name: data.name,
                    NOT: { id }
                }
            });
            if (existing) {
                return { message: 'Este nome de usuário já está em uso.' };
            }
            updateData.name = data.name;
        }

        if (data.fullName !== undefined) updateData.fullName = data.fullName;
        if (data.phone !== undefined) updateData.phone = data.phone;

        if (data.password && data.password.length >= 6) {
            updateData.password = await bcrypt.hash(data.password, 10);
        }

        await prisma.technician.update({ where: { id }, data: updateData });
        revalidatePath('/profile');
        revalidatePath('/os'); // Header might change
        return { success: true, message: 'Perfil atualizado com sucesso!' };
    } catch (error) {
        console.error('Error updating profile:', error);
        return { message: 'Erro ao atualizar perfil.' };
    }
}
