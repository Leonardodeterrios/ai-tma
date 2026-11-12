import Script from 'next/script';
import type { Viewport } from 'next';
import { Manrope, Unbounded } from 'next/font/google';
import './globals.css';

// Unbounded — широкий жирный шрифт для заголовков, Manrope — для текста. Оба с кириллицей.
const display = Unbounded({ subsets: ['latin', 'cyrillic'], weight: ['500', '700', '800'], variable: '--font-display', display: 'swap' });
const body = Manrope({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600', '700', '800'], variable: '--font-body', display: 'swap' });

export const viewport: Viewport = { themeColor: '#060607', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable}`}>
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
