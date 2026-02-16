'use server';

import { requireAdmin } from '@/lib/auth';
import { syncExcelToDB } from '@/lib/sync';
import { syncProgressStore } from '@/lib/sync-progress';
import { writeFile } from 'fs/promises';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import path from 'path';

export async function uploadExcel(formData: FormData) {
    try {
        await requireAdmin();

        syncProgressStore.update({
            status: 'RUNNING',
            total: 100,
            current: 0,
            message: 'Iniciando upload e processamento...'
        });

        const file = formData.get('file') as File;
        if (!file) {
            return { success: false, message: 'Nenhum arquivo enviado.' };
        }

        if (!file.name.endsWith('.xlsx')) {
            return { success: false, message: 'Apenas arquivos .xlsx são permitidos.' };
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filePath = process.env.EXCEL_PATH || path.join(process.cwd(), 'Os.xlsx');

        await writeFile(filePath, buffer);

        // Sync with DB
        const syncResult = await syncExcelToDB();

        if (!syncResult.success) {
            return { success: false, message: syncResult.message };
        }

        revalidatePath('/admin/dashboard');
        revalidatePath('/os');

        return { success: true, message: syncResult.message };
    } catch (error: any) {
        logger.error('Error uploading excel', { error: String(error) });

        syncProgressStore.update({
            status: 'ERROR',
            message: error?.code === 'EBUSY'
                ? 'O arquivo está aberto em outro programa.'
                : 'Erro ao processar arquivo.'
        });

        if (error?.code === 'EBUSY') {
            return { success: false, message: 'O arquivo Excel está aberto em outro programa. Feche-o e tente novamente.' };
        }

        const errorMsg = error instanceof Error ? error.message : String(error);
        return { success: false, message: `Erro ao atualizar base de dados: ${errorMsg}` };
    }
}
