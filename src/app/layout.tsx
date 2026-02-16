import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/sonner';

import { ThemeProvider } from '@/components/providers/theme-provider';
import { SyncProgressOverlay } from '@/components/SyncProgressOverlay';

const inter = Inter({ subsets: ['latin'] });
export const metadata: Metadata = {
    title: 'XON Serviços',
    description: 'Gestão de serviços e checklist',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt-BR" suppressHydrationWarning>
            <body className={cn(inter.className, "min-h-screen bg-background font-sans antialiased")}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    {children}
                    <Toaster />
                    <SyncProgressOverlay />
                </ThemeProvider>
            </body>
        </html>
    );
}
