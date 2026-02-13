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

export async function updatePreferences(key: 'theme' | 'lastUf' | 'lastSearch' | 'lastStatus', value: string) {
    const session = await requireAuth().catch(() => null);
    if (!session) return { message: 'Não autenticado.' };

    try {
        await prisma.equipe.update({
            where: { id: session.id },
            data: { [key]: value }
        });

        logger.info('Preferences updated', { userId: session.id, key, value });
        revalidatePath('/os');
        return { success: true };
    } catch (error: any) {
        if (error.code === 'P2025') {
            logger.error('Preferences update failed: User record not found. User needs to re-login.', { userId: session.id });
            return { message: 'Sessão expirada ou usuário não encontrado. Por favor, saia e entre novamente.' };
        }
        logger.error('Error updating preferences', { userId: session.id, key, value, error: String(error) });
        return { message: 'Erro ao salvar preferência.' };
    }
}

/**
 * Creates a new Equipe (User/Team account).
 * Terminology consolidated: formerly createTechnician
 */
export async function createEquipe(prevState: any, formData: FormData) {
    // Auth guard: only admins can create equipes
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
        const existing = await prisma.equipe.findUnique({ where: { name } });
        if (existing) {
            return { message: 'Já existe um usuário com este nome.' };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.equipe.create({
            data: {
                name,
                fullName,
                password: hashedPassword,
                isAdmin,
                phone,
                nomeEquipe: name, // Default to name if created manually
            }
        });

        revalidatePath('/admin/equipes');
        return { success: true, message: `${isAdmin ? 'Administrador' : 'Usuário/Equipe'} "${name}" criado com sucesso!` };
    } catch (error: any) {
        logger.error('Error creating equipe', { error: String(error) });
        if (error.code === 'P2002') {
            return { message: 'Já existe um usuário com este nome.' };
        }
        return { message: 'Erro ao criar usuário: ' + (error.message || 'Erro desconhecido') };
    }
}

/**
 * Deletes an Equipe.
 * Terminology consolidated: formerly deleteTechnician
 */
export async function deleteEquipe(id: string) {
    // Auth guard: only admins can delete equipes
    try {
        await requireAdmin();
    } catch {
        return { message: 'Não autorizado.' };
    }

    try {
        await prisma.equipe.delete({ where: { id } });
        revalidatePath('/admin/equipes');
        return { success: true };
    } catch (error) {
        logger.error('Error deleting equipe', { error: String(error) });
        return { message: 'Erro ao remover usuário.' };
    }
}

/**
 * Updates an Equipe.
 * Terminology consolidated: formerly updateTechnician
 */
export async function updateEquipe(id: string, data: { name?: string; fullName?: string; phone?: string; password?: string; isAdmin?: boolean }) {
    // Auth guard: only admins can update equipes
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

        await prisma.equipe.update({ where: { id }, data: updateData });
        revalidatePath('/admin/equipes');
        return { success: true, message: 'Usuário atualizado!' };
    } catch (error) {
        logger.error('Error updating equipe', { error: String(error) });
        return { message: 'Erro ao atualizar usuário.' };
    }
}

/**
 * Fetches all Equipes for administration.
 * Terminology consolidated: formerly getTechnicians
 */
export async function getEquipes() {
    return prisma.equipe.findMany({
        select: {
            id: true,
            name: true,
            fullName: true,
            nomeEquipe: true,
            phone: true,
            isAdmin: true,
            createdAt: true,
            updatedAt: true,
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
            const existing = await prisma.equipe.findFirst({
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

        await prisma.equipe.update({ where: { id: session.id }, data: updateData });
        revalidatePath('/profile');
        revalidatePath('/os');
        return { success: true, message: 'Perfil atualizado com sucesso!' };
    } catch (error) {
        logger.error('Error updating profile', { error: String(error) });
        return { message: 'Erro ao atualizar perfil.' };
    }
}
