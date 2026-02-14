import { useState, useEffect } from 'react';
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
    const router = useRouter();

    const fetchNotifications = async () => {
        const data = await getUnreadNotifications();
        setNotifications(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

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
                className="relative text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-1 ring-white dark:ring-slate-950 animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </Button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                            <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Notificações</h4>
                            {notifications.length > 0 && (
                                <button
                                    className="text-xs text-primary hover:opacity-80 font-medium transition-colors"
                                    onClick={handleClearNotifications}
                                >
                                    Limpar notificações
                                </button>
                            )}
                        </div>

                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                            {isLoading && notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="animate-spin h-5 w-5 border-2 border-slate-300 border-t-primary rounded-full mx-auto mb-2" />
                                    <p className="text-xs text-slate-500">Carregando...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-12 text-center text-slate-500">
                                    <Bell className="h-8 w-8 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">Nenhuma notificação nova</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
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
                                            className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative group ${notification.osId ? 'cursor-pointer' : ''} ${notification.read ? 'opacity-50 grayscale-[0.5]' : ''}`}
                                        >
                                            <div className="flex gap-3">
                                                {!notification.read && (
                                                    <div className="mt-1.5 shrink-0">
                                                        {notification.title.toLowerCase().includes('foto') ? (
                                                            <Camera className="h-3.5 w-3.5 text-emerald-500" />
                                                        ) : (notification.title.toLowerCase().includes('não verificada') || notification.title.toLowerCase().includes('nao verificada')) ? (
                                                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                                        ) : notification.title.toLowerCase().includes('desmarcada') ? (
                                                            <Trash2 className="h-3.5 w-3.5 text-slate-500" />
                                                        ) : (
                                                            <div className={`h-2 w-2 rounded-full ${notification.type === 'OS_CLOSE' ? 'bg-blue-500' : notification.type === 'NEW_OS' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                        )}
                                                    </div>
                                                )}
                                                {notification.read && (
                                                    <div className="mt-1.5 shrink-0">
                                                        <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                    </div>
                                                )}
                                                <div className="flex-1 space-y-1">
                                                    <p className="text-sm font-medium leading-none text-slate-900 dark:text-slate-100">
                                                        {notification.title}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                        {timeAgo(notification.createdAt)}
                                                    </p>
                                                </div>
                                                <button
                                                    className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
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
