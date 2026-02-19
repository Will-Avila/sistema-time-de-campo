import { prisma } from '@/lib/db';
import { getOSById } from '@/lib/excel';
import { notFound } from 'next/navigation';
import { HeaderServer } from '@/components/layout/HeaderServer';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import LancaItem from './LancaItem';
import { getSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';

interface PageProps {
    params: { id: string };
}

export default async function LancaPage({ params }: PageProps) {
    const os = await getOSById(params.id);
    const session = await getSession();

    if (!os) return notFound();

    const [lancamentosRaw, equipes] = await Promise.all([
        prisma.lancaAlare.findMany({
            where: { osId: os.id },
            orderBy: { de: 'asc' }
        }),
        prisma.equipe.findMany({
            select: { id: true, name: true, fullName: true, nomeEquipe: true }
        })
    ]);

    const equipeMap = new Map(equipes.map(e => [e.id, e.fullName || e.nomeEquipe || e.name]));

    const lancamentos = lancamentosRaw.map(l => ({
        ...l,
        responsavel: l.equipe ? equipeMap.get(l.equipe) : null
    }));

    if (lancamentos.length === 0) {
        return (
            <div className="min-h-screen bg-muted/30 pb-20">
                <HeaderServer />
                <div className="container pt-6 max-w-4xl text-center space-y-4">
                    <p className="text-muted-foreground">Nenhum lançamento encontrado para esta OS.</p>
                    <Link href={`/os/${os.id}`}>
                        <Button variant="outline">Voltar para Detalhes</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30 pb-20">
            <HeaderServer />

            <div className="container pt-6 max-w-4xl space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href={`/os/${os.id}`} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="font-mono text-xs font-bold text-[#4da8bc] bg-[#4da8bc]/10 border-[#4da8bc]/20 shadow-sm">
                                {os.protocolo}
                            </Badge>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">Lançamentos: {os.pop}</h1>
                        <p className="text-sm text-muted-foreground">Gerencie o lançamento de cabos e metragens</p>
                    </div>
                </div>

                {/* List Container */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lancamentos.map((lanca) => (
                        <LancaItem
                            key={lanca.id}
                            item={lanca}
                            osId={os.id}
                            session={session}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
