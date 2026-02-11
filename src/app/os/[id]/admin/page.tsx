import { getOSById } from '@/lib/excel';
import { getSession } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { HeaderServer } from '@/components/layout/HeaderServer';
import Link from 'next/link';
import { ArrowLeft, Building, FileText, Upload, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { OSAdminEditForm } from './OSAdminEditForm';

interface PageProps {
    params: { id: string };
}

export default async function OSAdminEditPage({ params }: PageProps) {
    const session = await getSession();
    if (!session || !session.isAdmin) {
        redirect('/');
    }

    const os = await getOSById(params.id);
    if (!os) return notFound();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
            <HeaderServer />

            <div className="container mx-auto max-w-2xl pt-24 px-4 pb-12">
                <div className="mb-6 flex items-center gap-4">
                    <Link href={`/os/${os.id}`} className="p-2 -ml-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <ArrowLeft className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Editar Informações Administrativas</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">OS: {os.pop} | Protocolo: {os.protocolo}</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Informações Adicionais</CardTitle>
                        <CardDescription>
                            Adicione detalhes administrativos, nome do condomínio e anexos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <OSAdminEditForm
                            osId={os.id}
                            initialData={{
                                condominio: os.condominio,
                                descricao: os.descricao,
                                attachments: os.anexos
                            }}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
