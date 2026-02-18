import { getEquipes } from '@/actions/equipe';
import EquipeManager from './EquipeManager';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { HeaderServer } from '@/components/layout/HeaderServer';

export default async function EquipesPage() {
    const equipes = await getEquipes();

    return (
        <div className="min-h-screen bg-background transition-colors">
            <HeaderServer />

            <div className="container pt-6 pb-8">
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Contas de Acesso</h1>
                            <p className="text-muted-foreground mt-1">Gerencie equipes e administradores do sistema.</p>
                        </div>

                        <Link href="/admin/dashboard" className="inline-block">
                            <Button variant="outline" size="sm" className="gap-2 h-9">
                                <ArrowLeft className="h-4 w-4" />
                                Voltar ao Dashboard
                            </Button>
                        </Link>
                    </div>
                </header>

                <EquipeManager equipes={equipes} />
            </div>
        </div>
    );
}
