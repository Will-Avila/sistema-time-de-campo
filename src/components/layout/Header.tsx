'use client';

import { useState, useEffect } from 'react';
import { Menu, LogOut, User, Sun, Moon, LayoutDashboard, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logout } from '@/actions/auth';
import Link from 'next/link';
import { useTheme } from 'next-themes';

import { NotificationBell } from './NotificationBell';

interface HeaderProps {
    username: string;
    isAdmin?: boolean;
}

export function Header({ username, isAdmin }: HeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const firstName = username.split(' ')[0];

    useEffect(() => {
        setMounted(true);
    }, []);

    function handleToggleTheme() {
        const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);

        // Save to DB in background via fetch (NOT server action to avoid re-hydration)
        fetch('/api/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'theme', value: newTheme }),
        }).catch(() => { /* silent fail - localStorage is the primary store */ });
    }

    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm z-50 transition-colors">
            <div className="container h-full flex items-center justify-between">
                {/* Left: Brand */}
                <div className="flex-1">
                    <Link href="/os" className="text-xl font-bold tracking-tighter text-primary">
                        X-ON
                    </Link>
                </div>

                {/* Center: User Info */}
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <span className="font-medium text-sm hidden md:inline-block">Olá, {firstName}</span>
                    <span className="font-medium text-sm md:hidden">{firstName}</span>
                    <div className="bg-primary/10 dark:bg-primary/20 p-1.5 rounded-full text-primary">
                        <User className="h-4 w-4" />
                    </div>
                </div>

                {/* Right: Menu */}
                <div className="flex-1 flex justify-end items-center gap-2 relative">
                    <NotificationBell />

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-primary/10"
                    >
                        <Menu className="h-6 w-6" />
                    </Button>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                        <div className="absolute top-12 right-0 w-52 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-lg rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-2 p-1">
                            {/* Theme Toggle */}
                            <button
                                type="button"
                                onClick={handleToggleTheme}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md transition-colors text-left"
                            >
                                {!mounted ? (
                                    <div className="h-4 w-4 animate-pulse bg-slate-200 dark:bg-slate-700 rounded-full" />
                                ) : resolvedTheme === 'dark' ? (
                                    <Sun className="h-4 w-4 text-amber-500" />
                                ) : (
                                    <Moon className="h-4 w-4 text-indigo-500" />
                                )}
                                {!mounted ? 'Carregando...' : (resolvedTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro')}
                            </button>

                            <div className="border-t border-slate-100 dark:border-slate-700 my-1" />

                            <Link
                                href="/os"
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <ClipboardList className="h-4 w-4 text-blue-600" />
                                Ordens de Serviço
                            </Link>

                            {isAdmin && (
                                <>
                                    <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                                    <Link
                                        href="/admin/dashboard"
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md transition-colors"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <LayoutDashboard className="h-4 w-4 text-primary" />
                                        Dashboard
                                    </Link>
                                </>
                            )}

                            <div className="border-t border-slate-100 dark:border-slate-700 my-1" />

                            <Link
                                href="/profile"
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <User className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                Editar Perfil
                            </Link>

                            <div className="border-t border-slate-100 dark:border-slate-700 my-1" />

                            {/* Logout */}
                            <form action={async () => { await logout(); }}>
                                <button
                                    type="submit"
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors text-left"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Sair
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Backdrop to close menu */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 z-[-1]"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}
        </header>
    );
}
