import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

const nunito = Nunito({ subsets: ['latin', 'latin-ext'], variable: '--font-nunito' });

export const metadata: Metadata = {
  title: { default: 'Tabu', template: '%s · Tabu' },
  description: 'Kendi kelimelerinle oynayabileceğin, takım ve skor takipli Türkçe Tabu oyunu.',
};

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // Browser extensions (Grammarly, Dark Reader, Video Speed Controller…) add attributes to <html>/<body>
    // before React hydrates. suppressHydrationWarning ignores that for these two elements only; children are still checked.
    <html lang="tr" className={nunito.variable} suppressHydrationWarning>
      <body
        className="min-h-dvh bg-slate-50 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
