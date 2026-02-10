import { useState, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { getUnreadNotifications, markAsRead, markAllAsRead } from '@/actions/notification';
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
    technician?: { name: string };
    read: boolean;
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

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

    const handleMarkAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.filter(n => n.id !== id));
        await markAsRead(id);
    };

    const handleMarkAllAsRead = async () => {
        const currentNotifications = [...notifications];
        setNotifications([]);
        const result = await markAllAsRead();
        if (!result.success) {
            // Revert if failed (optional, but good UX)
            setNotifications(currentNotifications);
        }
        setIsOpen(false);
    };

    const unreadCount = notifications.length;

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
                    <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950 animate-pulse" />
                )}
            </Button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                            <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Notificações</h4>
                            {unreadCount > 0 && (
                                <button
                                    className="text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium transition-colors"
                                    onClick={handleMarkAllAsRead}
                                >
                                    Marcar todas como lidas
                                </button>
                            )}
                        </div>

                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                            {isLoading && notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="animate-spin h-5 w-5 border-2 border-slate-300 border-t-teal-600 rounded-full mx-auto mb-2" />
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
                                            className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative group"
                                        >
                                            <div className="flex gap-3">
                                                <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${notification.type === 'OS_CLOSE' ? 'bg-blue-500' : 'bg-amber-500'}`} />
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
                                                    className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-colors opacity-0 group-hover:opacity-100"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMarkAsRead(notification.id);
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
