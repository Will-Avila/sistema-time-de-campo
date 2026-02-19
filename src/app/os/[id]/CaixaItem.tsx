import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updateChecklistItem, deleteChecklistPhoto, resetChecklistItem, uploadChecklistPhotos } from '@/actions/checklist';
import Image from 'next/image';
import { Card, CardHeader } from '@/components/ui/card';
import { CheckCircle2, Circle, Eye, MapPin, Trash2, Undo2, Camera, Globe, ImagePlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageViewer } from '@/components/ui/image-viewer';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { CaixaItemData } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Session } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface CaixaItemProps {
    item: CaixaItemData;
    osId: string;
    equipeName?: string;
    session?: Session | null;
}

type Status = 'DONE' | 'PENDING' | 'UNTOUCHED';

export default function CaixaItem({ item, osId, equipeName, session }: CaixaItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [mapDialogOpen, setMapDialogOpen] = useState(false);

    let initialStatus: Status = 'UNTOUCHED';
    if (item.done) {
        initialStatus = 'DONE';
    } else if (item.status === 'NOK') {
        initialStatus = 'PENDING';
    }
    const [status, setStatus] = useState<Status>(initialStatus);

    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showPhotos, setShowPhotos] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);


    // Viewer state
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

    const [power, setPower] = useState(item.potencia || '');
    const [obs, setObs] = useState(item.obs || '');
    const [certified, setCertified] = useState(false);

    // Access Control logic
    const isOwner = session?.id === item.equipe;
    const canUnmark = session?.isAdmin || isOwner;
    // canEdit removed as per new requirement: technicians can always edit data

    // Confirm modal state
    const [confirmAction, setConfirmAction] = useState<{
        title: string;
        message: string;
        action: () => void;
    } | null>(null);

    const router = useRouter();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        formData.append('done', 'true');
        formData.append('certified', String(certified));

        const result = await updateChecklistItem(null, formData);

        if (result.success) {
            setStatus('DONE');
            setIsOpen(false);
            router.refresh();
            toast('Caixa concluída!', 'success');
        } else {
            toast(result.message || 'Erro ao salvar.', 'error');
        }
        setIsLoading(false);
    }

    async function handleMarkNotExecuted() {
        setIsLoading(true);

        const formData = new FormData();
        formData.append('osId', osId);
        formData.append('itemId', String(item.id || item.cto));
        formData.append('done', 'false');

        const result = await updateChecklistItem(null, formData);

        if (result.success) {
            setStatus('PENDING');
            setIsOpen(false);
            router.refresh();
            toast('Marcada como não executada.', 'warning');
        } else {
            toast(result.message || 'Erro ao atualizar.', 'error');
        }
        setIsLoading(false);
    }

    function requestDeletePhoto(photoId: string) {
        setConfirmAction({
            title: 'Excluir Foto',
            message: 'Tem certeza que deseja apagar esta foto? Esta ação não pode ser desfeita.',
            action: () => executeDeletePhoto(photoId),
        });
    }

    async function executeDeletePhoto(photoId: string) {
        setConfirmAction(null);
        setIsLoading(true);

        const result = await deleteChecklistPhoto(photoId, osId);

        if (result.success) {
            setViewerOpen(false);
            router.refresh();
            toast('Foto removida.', 'success');
        } else {
            toast(result.message || 'Erro ao remover foto.', 'error');
        }
        setIsLoading(false);
    }

    function requestReset() {
        setConfirmAction({
            title: 'Desmarcar Caixa',
            message: 'Dados e fotos desta caixa serão removidos. Deseja continuar?',
            action: executeReset,
        });
    }

    async function executeReset() {
        setConfirmAction(null);
        setIsLoading(true);

        const result = await resetChecklistItem(osId, String(item.id || item.cto));

        if (result.success) {
            setStatus('UNTOUCHED');
            setPower('');
            setObs('');
            setCertified(false);
            setShowPhotos(false);
            setIsOpen(false);
            router.refresh();
            toast('Caixa desmarcada.', 'success');
        } else {
            toast(result.message || 'Erro ao desmarcar.', 'error');
        }
        setIsLoading(false);
    }

    async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length === 0) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('osId', osId);
        formData.append('itemId', String(item.id || item.cto));

        Array.from(e.target.files).forEach(file => {
            formData.append('photos', file);
        });

        const result = await uploadChecklistPhotos(formData);

        if (result.success) {
            setShowPhotos(true);
            router.refresh();
            toast('Fotos adicionadas!', 'success');
            // Removed auto-pending status update as requested
        } else {
            toast(result.message || 'Erro ao enviar fotos.', 'error');
        }
        setIsUploading(false);
        // Reset input
        e.target.value = '';
    }

    // Styles based on status
    const getStatusColor = () => {
        if (status === 'DONE') return 'bg-emerald-500/10 border-emerald-500/20';
        if (status === 'PENDING') return 'bg-destructive/10 border-destructive/20';
        return 'bg-card border-border';
    };

    return (
        <Card className={cn("rounded-xl shadow-sm border transition-all", getStatusColor())}>
            <div className="p-6">
                {/* Header: Cto + Status Trigger */}
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-foreground text-lg">{item.cto}</h3>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-9 w-9 rounded-full transition-all",
                                isUploading ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/10 shadow-sm"
                            )}
                            onClick={() => document.getElementById(`file-upload-${item.cto}`)?.click()}
                            disabled={isLoading || isUploading}
                            title="Anexar Fotos da Galeria"
                        >
                            {isUploading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <ImagePlus className="h-5 w-5" />
                            )}
                        </Button>
                        <input
                            type="file"
                            id={`file-upload-${item.cto}`}
                            className="hidden"
                            onChange={handlePhotoUpload}
                            multiple
                            accept="image/*"
                        />

                        {/* Interactive Switch Replacement */}
                        <button
                            onClick={() => setIsOpen(true)}
                            className={cn(
                                "group relative flex h-6 w-11 items-center rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                                status === 'DONE' ? 'bg-primary border-primary' : (status === 'PENDING' ? 'bg-destructive border-destructive' : 'bg-primary/10 border-primary/20')
                            )}
                        >
                            <span className={cn(
                                "inline-block h-4 w-4 transform rounded-full shadow-sm ring-0 transition duration-200 ease-in-out",
                                status === 'DONE' || status === 'PENDING' ? 'bg-background' : 'bg-primary',
                                status === 'DONE' ? 'translate-x-5' : 'translate-x-0.5'
                            )} />
                        </button>
                    </div>
                </div>

                {/* Sub-info */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-primary font-medium">
                        <div className="w-4 flex items-center justify-center shrink-0">
                            <Circle className="h-3 w-3 fill-current text-[#4da8bc]" />
                        </div>
                        <span>{item.chassiPath}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <div className="w-4 flex items-center justify-center shrink-0 mt-0.5">
                            <MapPin className="h-4 w-4 text-[#4da8bc]" />
                        </div>
                        <span className="line-clamp-2">{item.endereco}</span>
                    </div>
                    {(item.lat && item.long) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-4 flex items-center justify-center shrink-0">
                                <Globe className="h-4 w-4 text-[#4da8bc]" />
                            </div>
                            <span>{item.lat}, {item.long}</span>
                        </div>
                    )}
                </div>

                {/* Result Data & Photos Toggle */}
                {(status === 'DONE' || (item.photos && item.photos.length > 0)) && (
                    <div className="mt-4 pt-3 border-t border-border/60 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-medium text-foreground">
                                {status === 'DONE' && item.potencia && (
                                    <span className="bg-muted px-2 py-1 rounded">Potência: {String(item.potencia).replace('.', ',')} dBm</span>
                                )}
                                {status === 'DONE' && certified && (
                                    <span className="px-2 py-1 rounded text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                        Certificada
                                    </span>
                                )}
                            </div>
                            {item.photos && item.photos.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowPhotos(!showPhotos)}
                                    className={cn(
                                        "h-7 text-xs gap-1",
                                        showPhotos ? "text-primary bg-primary/10" : "text-primary hover:bg-primary/5"
                                    )}
                                >
                                    <Eye className="h-3 w-3 text-[#4da8bc]" /> {showPhotos ? 'Esconder' : `Ver ${item.photos.length}`} Fotos
                                </Button>
                            )}
                        </div>

                        {status === 'DONE' && item.obs && (
                            <div className="bg-amber-500/10 p-2 rounded border border-amber-500/20 text-xs text-amber-600 italic">
                                &quot;{item.obs}&quot;
                            </div>
                        )}
                        {status === 'DONE' && (item.nomeEquipe || equipeName) && (
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">Responsável: <span className="font-medium text-foreground">{item.nomeEquipe || equipeName}</span></p>
                            </div>
                        )}
                    </div>
                )}

                {/* Photo Grid - strictly controlled by showPhotos */}
                {showPhotos && item.photos && item.photos.length > 0 && (
                    <div className="mt-3 grid grid-cols-5 sm:grid-cols-6 gap-2 animate-in fade-in duration-300">
                        {item.photos.map((p, idx) => (
                            <div key={p.id} className="relative aspect-square overflow-hidden rounded-md border border-border shadow-sm group/photo">
                                <Image
                                    src={p.path}
                                    alt="Foto"
                                    fill
                                    className="object-cover transition-transform hover:scale-110 cursor-pointer"
                                    onClick={() => {
                                        setViewerInitialIndex(idx);
                                        setViewerOpen(true);
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Map Link */}
                {item.lat && item.long && (
                    <Button
                        className="mt-4 w-full shadow-sm"
                        onClick={() => setMapDialogOpen(true)}
                    >
                        Abrir no Mapa
                    </Button>
                )}
            </div>

            {/* Photo Viewer */}
            <ImageViewer
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                images={item.photos?.map(p => p.path) || []}
                initialIndex={viewerInitialIndex}
                onDelete={(index) => {
                    const photoToDelete = item.photos?.[index];
                    if (photoToDelete) {
                        requestDeletePhoto(photoToDelete.id);
                    }
                }}
                canDelete={true}
            />

            {/* Map Selector Dialog */}
            <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
                <DialogContent className="sm:max-w-md bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-center pb-2 text-foreground">Escolha o aplicativo</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3 py-4 pt-0">
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.long}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 rounded-xl border border-border p-4 hover:bg-muted transition-colors shadow-sm group"
                            onClick={() => setMapDialogOpen(false)}
                        >
                            <div className="relative w-12 h-12 shrink-0 rounded-xl overflow-hidden shadow-sm border border-border">
                                <Image
                                    src="/assets/icons/google-maps.jpg"
                                    alt="Google Maps"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold text-foreground group-hover:text-primary transition-colors">Google Maps</div>
                                <div className="text-xs text-muted-foreground mt-0.5">Recomendado</div>
                            </div>
                        </a>

                        <a
                            href={`https://waze.com/ul?ll=${item.lat},${item.long}&navigate=yes`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 rounded-xl border border-border p-4 hover:bg-muted transition-colors shadow-sm group"
                            onClick={() => setMapDialogOpen(false)}
                        >
                            <div className="relative w-12 h-12 shrink-0 rounded-xl overflow-hidden shadow-sm border border-border">
                                <Image
                                    src="/assets/icons/waze.png"
                                    alt="Waze"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold text-foreground group-hover:text-cyan-500 transition-colors">Waze</div>
                                <div className="text-xs text-muted-foreground mt-0.5">Trânsito em tempo real</div>
                            </div>
                        </a>

                        <a
                            href={`http://maps.apple.com/?daddr=${item.lat},${item.long}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 rounded-xl border border-border p-4 hover:bg-muted transition-colors shadow-sm sm:hidden group"
                            onClick={() => setMapDialogOpen(false)}
                        >
                            <div className="relative w-12 h-12 shrink-0 rounded-xl overflow-hidden shadow-sm border border-border">
                                <Image
                                    src="/assets/icons/apple-maps.jpg"
                                    alt="Apple Maps"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold text-foreground group-hover:text-muted-foreground transition-colors">Apple Maps</div>
                                <div className="text-xs text-muted-foreground mt-0.5">Nativo iOS</div>
                            </div>
                        </a>

                        <a
                            href={`geo:${item.lat},${item.long}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 rounded-xl border border-border p-4 hover:bg-muted transition-colors shadow-sm group"
                            onClick={() => setMapDialogOpen(false)}
                        >
                            <div className="w-12 h-12 shrink-0 bg-muted rounded-xl flex items-center justify-center border border-border">
                                <Globe className="h-6 w-6 text-muted-foreground group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold text-foreground">Outro App</div>
                                <div className="text-xs text-muted-foreground mt-0.5">Escolher app instalado</div>
                            </div>
                        </a>
                    </div>
                </DialogContent>
            </Dialog>

            {/* MODAL (Existing Edit/Finish Modal) */}
            {
                isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <Card className="w-full max-w-md overflow-hidden relative shadow-2xl border-border bg-card">
                            <CardHeader className="bg-muted/40 border-b border-border pb-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-foreground">Atualizar Caixa {item.cto}</h3>
                                    <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
                                </div>
                            </CardHeader>

                            <div className="p-6">
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <input type="hidden" name="osId" value={osId} />
                                    <input type="hidden" name="itemId" value={String(item.id || item.cto)} />

                                    <div className="grid grid-cols-2 gap-4 items-end">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium leading-none text-foreground">Potência (dBm)</label>
                                            <Input
                                                type="number"
                                                name="power"
                                                step="0.01"
                                                min="-50"
                                                max="-10"
                                                value={power}
                                                onChange={e => setPower(e.target.value)}
                                                className="font-mono text-lg"
                                            />
                                        </div>

                                        <div className="flex items-center space-x-2 h-10 bg-muted/40 rounded-md px-3 border border-border">
                                            <input
                                                type="checkbox"
                                                id={`certified-${item.cto}`}
                                                name="certified"
                                                checked={certified}
                                                onChange={e => setCertified(e.target.checked)}
                                                className="h-5 w-5 rounded border-input bg-background text-primary focus:ring-primary"
                                            />
                                            <label htmlFor={`certified-${item.cto}`} className="text-sm font-medium text-foreground cursor-pointer select-none">
                                                Certificada
                                            </label>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium leading-none text-foreground">Observação <span className="text-xs font-normal text-muted-foreground">(Opcional)</span></label>
                                        <Textarea
                                            name="obs"
                                            value={obs}
                                            onChange={e => setObs(e.target.value)}
                                            rows={3}
                                            placeholder="Descreve aqui qualquer detalhe importante..."
                                        />
                                    </div>

                                    <div className="flex flex-col gap-3 pt-2">
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                onClick={handleMarkNotExecuted}
                                                disabled={isLoading}
                                                className="w-full"
                                            >
                                                Não Executada
                                            </Button>
                                            <Button
                                                type="submit"
                                                className="w-full shadow-lg bg-emerald-600 hover:bg-emerald-700 h-10 text-white"
                                                disabled={isLoading}
                                            >
                                                {isLoading ? 'Salvando...' : (status === 'DONE' ? 'Atualizar' : 'Concluir')}
                                            </Button>
                                        </div>

                                        {canUnmark && status !== 'UNTOUCHED' && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={requestReset}
                                                disabled={isLoading}
                                                className="w-full gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <Undo2 className="h-4 w-4" />
                                                Desmarcar
                                            </Button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </Card>
                    </div>
                )
            }

            {/* Confirm Modal */}
            <ConfirmModal
                open={!!confirmAction}
                title={confirmAction?.title || ''}
                message={confirmAction?.message || ''}
                variant="danger"
                confirmLabel="Sim, continuar"
                onConfirm={() => confirmAction?.action()}
                onCancel={() => setConfirmAction(null)}
            />
        </Card >
    );
}
