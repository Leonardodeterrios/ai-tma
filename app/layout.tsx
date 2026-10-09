import Script from 'next/script';
import "./globals.css";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      {/* Ниже мы говорим приложению использовать цвета из темы Телеграма */}
      <body style={{ 
        margin: 0, 
        padding: 0, 
        backgroundColor: 'var(--tg-theme-bg-color, #ffffff)', 
        color: 'var(--tg-theme-text-color, #000000)' 
      }}>
        {children}
      </body>
    </html>
  );
}