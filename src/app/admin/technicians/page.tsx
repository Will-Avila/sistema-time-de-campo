import { getTechnicians } from '@/actions/technician';
import TechnicianManager from './TechnicianManager';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { HeaderServer } from '@/components/layout/HeaderServer';

export default async function TechniciansPage() {
    const technicians = await getTechnicians();

    return (
        <div className="min-h-screen bg-muted/40 dark:bg-slate-950 transition-colors">
            <HeaderServer />

            <div className="pt-20 px-6 md:px-8 pb-8">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Gerenciar Técnicos</h1>
                        <p className="text-muted-foreground mt-1">Adicione ou remova técnicos do sistema.</p>
                    </div>

                    <Link href="/admin/dashboard">
                        <Button variant="outline" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Voltar ao Dashboard
                        </Button>
                    </Link>
                </header>

                <TechnicianManager technicians={technicians} />
            </div>
        </div>
    );
}
