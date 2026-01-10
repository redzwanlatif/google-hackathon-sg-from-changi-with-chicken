import type { Metadata, Viewport } from 'next';
import { Inter, Bangers, Comic_Neue } from 'next/font/google';
import './globals.css';
import './comic.css';
import { GameProvider } from '@/contexts/GameContext';

const inter = Inter({ subsets: ['latin'] });
const bangers = Bangers({ weight: '400', subsets: ['latin'], variable: '--font-bangers' });
const comicNeue = Comic_Neue({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-comic-neue' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

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
    <html lang="en" className={`${bangers.variable} ${comicNeue.variable}`}>
      <body className={inter.className}>
        <GameProvider>
          {children}
        </GameProvider>
      </body>
    </html>
  );
}
