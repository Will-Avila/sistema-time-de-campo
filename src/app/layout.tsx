import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ToastContainer } from '@/components/ui/toast';

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
        <html lang="pt-BR">
            <body className={cn(inter.className, "min-h-screen bg-background font-sans antialiased")}>
                {children}
                <ToastContainer />
            </body>
        </html>
    );
}
