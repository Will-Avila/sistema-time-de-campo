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
        <header className="sticky top-0 left-0 right-0 h-16 bg-card border-b border-border shadow-md z-50 transition-colors">
            <div className="container h-full flex items-center justify-between">
                {/* Left: Brand */}
                <div className="flex-1">
                    <Link href={isAdmin ? "/admin/dashboard" : "/os"} className="text-xl font-bold tracking-tighter text-primary hover:text-primary/80 transition-colors flex items-center gap-2">
                        X-ON <span className="font-light text-foreground/80">Serviços</span>
                    </Link>
                </div>

                {/* Center: User Info */}
                <div className="flex items-center gap-3 text-foreground/90">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-semibold leading-none">Olá, {firstName}</p>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                            {isAdmin ? 'Administrador' : 'Colaborador'}
                        </p>
                    </div>
                    <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-full text-primary ring-2 ring-primary/5">
                        <User className="h-4 w-4" />
                    </div>
                </div>

                {/* Right: Menu */}
                <div className="flex-1 flex justify-end items-center gap-3 relative">
                    <NotificationBell />

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                    >
                        <Menu className="h-6 w-6" />
                    </Button>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                        <div className="absolute top-14 right-0 w-56 bg-card border border-border shadow-xl rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 p-1.5 z-50">
                            {/* Theme Toggle */}
                            <button
                                type="button"
                                onClick={handleToggleTheme}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors text-left"
                            >
                                {!mounted ? (
                                    <div className="h-4 w-4 animate-pulse bg-muted rounded-full" />
                                ) : resolvedTheme === 'dark' ? (
                                    <Sun className="h-4 w-4 text-amber-500" />
                                ) : (
                                    <Moon className="h-4 w-4 text-primary" />
                                )}
                                {!mounted ? 'Carregando...' : (resolvedTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro')}
                            </button>

                            <div className="h-px bg-border my-1.5" />

                            <Link
                                href="/os"
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <ClipboardList className="h-4 w-4 text-primary" />
                                Ordens de Serviço
                            </Link>

                            {isAdmin && (
                                <>
                                    <Link
                                        href="/admin/dashboard"
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <LayoutDashboard className="h-4 w-4 text-primary" />
                                        Dashboard
                                    </Link>
                                </>
                            )}

                            <Link
                                href="/profile"
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <User className="h-4 w-4 text-muted-foreground" />
                                Editar Perfil
                            </Link>

                            <div className="h-px bg-border my-1.5" />

                            {/* Logout */}
                            <form action={async () => { await logout(); }}>
                                <button
                                    type="submit"
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors text-left"
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
                    className="fixed inset-0 z-[40]"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}
        </header>
    );
}
