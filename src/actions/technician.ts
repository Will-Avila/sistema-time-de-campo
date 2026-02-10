'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { requireAuth, requireAdmin } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { logger } from '@/lib/logger';

// Helper for username validation
function isValidUsername(username: string) {
    return /^[a-zA-Z0-9]+$/.test(username);
}

export async function updatePreferences(key: 'theme' | 'lastUf', value: string) {
    const session = await requireAuth().catch(() => null);
    if (!session) return { message: 'Não autenticado.' };

    try {
        await prisma.technician.update({
            where: { id: session.id },
            data: { [key]: value }
        });

        revalidatePath('/os');
        return { success: true };
    } catch (error) {
        logger.error('Error updating preferences', { error: String(error) });
        return { message: 'Erro ao salvar preferência.' };
    }
}

export async function createTechnician(prevState: any, formData: FormData) {
    // Auth guard: only admins can create technicians
    try {
        await requireAdmin();
    } catch {
        return { message: 'Não autorizado.' };
    }

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
        logger.error('Error creating technician', { error: String(error) });
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
    // Auth guard: only admins can delete technicians
    try {
        await requireAdmin();
    } catch {
        return { message: 'Não autorizado.' };
    }

    try {
        await prisma.technician.delete({ where: { id } });
        revalidatePath('/admin/technicians');
        return { success: true };
    } catch (error) {
        logger.error('Error deleting technician', { error: String(error) });
        return { message: 'Erro ao remover usuário.' };
    }
}

export async function updateTechnician(id: string, data: { name?: string; fullName?: string; phone?: string; password?: string; isAdmin?: boolean }) {
    // Auth guard: only admins can update technicians
    try {
        await requireAdmin();
    } catch {
        return { message: 'Não autorizado.' };
    }

    try {
        const updateData: Record<string, string | boolean> = {};

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
        logger.error('Error updating technician', { error: String(error) });
        return { message: 'Erro ao atualizar usuário.' };
    }
}

export async function getTechnicians() {
    return prisma.technician.findMany({
        select: {
            id: true,
            name: true,
            fullName: true,
            phone: true,
            isAdmin: true,
            createdAt: true,
            updatedAt: true,
            // password is explicitly excluded
        },
        orderBy: { createdAt: 'desc' },
    });
}

export async function updateProfile(data: { name?: string; fullName?: string; phone?: string; password?: string }) {
    const session = await requireAuth().catch(() => null);
    if (!session) return { message: 'Não autenticado.' };

    try {
        const updateData: Record<string, string> = {};

        if (data.name) {
            if (!isValidUsername(data.name)) {
                return { message: 'Nome de usuário deve conter apenas letras e números.' };
            }
            // Check uniqueness if name changed
            const existing = await prisma.technician.findFirst({
                where: {
                    name: data.name,
                    NOT: { id: session.id }
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

        await prisma.technician.update({ where: { id: session.id }, data: updateData });
        revalidatePath('/profile');
        revalidatePath('/os');
        return { success: true, message: 'Perfil atualizado com sucesso!' };
    } catch (error) {
        logger.error('Error updating profile', { error: String(error) });
        return { message: 'Erro ao atualizar perfil.' };
    }
}
