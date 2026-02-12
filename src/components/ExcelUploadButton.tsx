'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { UploadCloud, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { uploadExcel } from '@/actions/excel';

export function ExcelUploadButton() {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.xlsx')) {
            toast('Por favor, selecione um arquivo .xlsx', 'error');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const result = await uploadExcel(formData);
            if (result.success) {
                toast(result.message || 'Base atualizada!', 'success');
            } else {
                toast(result.message || 'Erro ao atualizar.', 'error');
            }
        } catch (error) {
            toast('Erro de conexão ao enviar arquivo.', 'error');
        } finally {
            setIsUploading(false);
            // Reset input value to allow selecting same file again
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }

    return (
        <>
            <input
                type="file"
                accept=".xlsx"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />
            <Button
                variant="outline"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 h-9 px-4 transition-colors shadow-sm"
            >
                {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                ) : (
                    <UploadCloud className="h-4 w-4 text-blue-500" />
                )}
                {isUploading ? 'Enviando...' : 'Atualizar Base'}
            </Button>
        </>
    );
}
