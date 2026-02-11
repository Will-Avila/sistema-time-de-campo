'use server';

import { requireAdmin } from '@/lib/auth';
import { invalidateExcelCache } from '@/lib/excel';
import { writeFile } from 'fs/promises';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import path from 'path';

export async function uploadExcel(formData: FormData) {
    try {
        await requireAdmin();

        const file = formData.get('file') as File;
        if (!file) {
            return { message: 'Nenhum arquivo enviado.' };
        }

        if (!file.name.endsWith('.xlsx')) {
            return { message: 'Apenas arquivos .xlsx são permitidos.' };
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filePath = process.env.EXCEL_PATH || path.join(process.cwd(), 'Os.xlsx');

        await writeFile(filePath, buffer);

        // Invalidate cache so new data is read immediately
        invalidateExcelCache();

        revalidatePath('/admin/dashboard');
        revalidatePath('/os');

        return { success: true, message: 'Base de dados atualizada com sucesso!' };
    } catch (error) {
        logger.error('Error uploading excel', { error: String(error) });
        return { message: 'Erro ao atualizar base de dados.' };
    }
}
