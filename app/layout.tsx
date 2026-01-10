import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { GameProvider } from '@/contexts/GameContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'The Chicken Must Arrive',
  description: 'Wake up with amnesia, a stolen ceremonial chicken, and 2 hours to save a wedding.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GameProvider>
          {children}
        </GameProvider>
      </body>
    </html>
  );
}
