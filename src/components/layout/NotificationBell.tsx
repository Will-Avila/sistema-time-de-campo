'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, Camera, AlertTriangle, Trash2 } from 'lucide-react';
import { getUnreadNotifications, markAsRead, archiveAllNotifications } from '@/actions/notification';
import { Button } from '@/components/ui/button';

function timeAgo(date: Date | string): string {
    const now = new Date();
    const past = new Date(date);
    const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    if (seconds < 60) return 'agora mesmo';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `há ${days}d`;
    return past.toLocaleDateString('pt-BR');
}

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    createdAt: Date;
    equipe?: { name: string; fullName: string | null; nomeEquipe: string | null };
    read: boolean;
    osId?: string | null;
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const lastShownIdRef = useRef<string | null>(null);
    const router = useRouter();

    const fetchNotifications = useCallback(async () => {
        const data = await getUnreadNotifications();

        // Browser notification logic
        if (typeof window !== 'undefined' && "Notification" in window && Notification.permission === "granted") {
            const unreadNotifs = data.filter(n => !n.read);
            if (unreadNotifs.length > 0) {
                const newest = unreadNotifs[unreadNotifs.length - 1]; // Use last to be sure
                if (newest.id !== lastShownIdRef.current) {
                    const notification = new Notification(newest.title, {
                        body: newest.message,
                        icon: '/favicon.ico',
                        badge: '/favicon.ico',
                    });

                    notification.onclick = () => {
                        window.focus();
                        if (newest.osId) {
                            const targetPath = newest.type === 'CHECKLIST'
                                ? `/os/${newest.osId}/execution`
                                : `/os/${newest.osId}`;
                            router.push(targetPath);
                            setIsOpen(false);
                        }
                    };
                    lastShownIdRef.current = newest.id;
                }
            }
        }

        setNotifications(data);
        setIsLoading(false);
    }, [router]);

    useEffect(() => {
        // Request permission on mount
        if (typeof window !== 'undefined' && "Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const handleMarkAsReadLocal = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        await markAsRead(id);
    };

    const handleClearNotifications = async () => {
        const currentNotifications = [...notifications];
        setNotifications([]);
        const result = await archiveAllNotifications();
        if (!result.success) {
            setNotifications(currentNotifications);
        }
        setIsOpen(false);
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="relative">
            <Button
                variant="ghost"
                size="icon"
                className="relative text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground ring-2 ring-background animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </Button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-12 w-80 bg-popover border border-border/50 shadow-xl rounded-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/30">
                            <h4 className="font-semibold text-sm text-foreground">Notificações</h4>
                            {notifications.length > 0 && (
                                <button
                                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                                    onClick={handleClearNotifications}
                                >
                                    Limpar todas
                                </button>
                            )}
                        </div>

                        <div className="max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20">
                            {isLoading && notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="animate-spin h-5 w-5 border-2 border-muted-foreground/30 border-t-primary rounded-full mx-auto mb-2" />
                                    <p className="text-xs text-muted-foreground">Carregando...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-12 text-center text-muted-foreground/50">
                                    <Bell className="h-8 w-8 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">Nenhuma notificação nova</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/30">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            onClick={() => {
                                                if (notification.osId) {
                                                    if (!notification.read) {
                                                        handleMarkAsReadLocal(notification.id);
                                                    }

                                                    const targetPath = notification.type === 'CHECKLIST'
                                                        ? `/os/${notification.osId}/execution`
                                                        : `/os/${notification.osId}`;
                                                    router.push(targetPath);
                                                    setIsOpen(false);
                                                }
                                            }}
                                            className={`p-4 hover:bg-muted/50 transition-colors relative group ${notification.osId ? 'cursor-pointer' : ''} ${notification.read ? 'opacity-60 grayscale-[0.3]' : 'bg-primary/5'}`}
                                        >
                                            <div className="flex gap-3">
                                                {!notification.read && (
                                                    <div className="mt-1.5 shrink-0">
                                                        {notification.title.toLowerCase().includes('foto') ? (
                                                            <Camera className="h-3.5 w-3.5 text-emerald-500" />
                                                        ) : (notification.title.toLowerCase().includes('não concluída') || notification.title.toLowerCase().includes('nao concluida') || notification.title.toLowerCase().includes('não verificada') || notification.title.toLowerCase().includes('nao verificada')) ? (
                                                            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                                                        ) : (notification.title.toLowerCase().includes('certificada') || notification.message.toLowerCase().includes('certificada')) ? (
                                                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                                                        ) : (notification.title.toLowerCase().includes('concluída') || notification.title.toLowerCase().includes('concluida') || notification.message.toLowerCase().includes('concluiu')) ? (
                                                            <Check className="h-3.5 w-3.5 text-blue-500" />
                                                        ) : notification.title.toLowerCase().includes('desmarcada') ? (
                                                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                        ) : (
                                                            <div className={`h-2 w-2 rounded-full ${notification.type === 'OS_CLOSE' ? 'bg-blue-500' : notification.type === 'NEW_OS' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                        )}
                                                    </div>
                                                )}
                                                {notification.read && (
                                                    <div className="mt-1.5 shrink-0">
                                                        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                                                    </div>
                                                )}
                                                <div className="flex-1 space-y-1">
                                                    <p className={`text-sm leading-none ${notification.read ? 'font-medium text-foreground' : 'font-bold text-foreground'}`}>
                                                        {notification.title}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground/70 font-medium">
                                                        {timeAgo(notification.createdAt)}
                                                    </p>
                                                </div>
                                                <button
                                                    className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-background text-muted-foreground hover:text-primary transition-all opacity-0 group-hover:opacity-100 shadow-sm border border-transparent hover:border-border"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMarkAsReadLocal(notification.id);
                                                    }}
                                                    title="Marcar como lida"
                                                >
                                                    <Check className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
