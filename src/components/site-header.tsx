'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { FullscreenButton } from './ui/fullscreen-button';
import { Logo } from './ui/logo';

const LINKS = [
  { href: '/', label: 'Oyun' },
  { href: '/words', label: 'Kelimeler' },
  { href: '/played', label: 'Çıkanlar' },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  return (
    // The top inset keeps the header clear of a phone's camera cutout in full screen.
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
        <Link href="/" className="text-lg">
          <Logo compact />
        </Link>
        <div className="flex items-center gap-1">
          <nav className="flex gap-1">
            {LINKS.map((link) => {
              const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-lg px-2.5 py-1.5 text-sm font-bold transition sm:px-3',
                    active
                      ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <FullscreenButton />
        </div>
      </div>
    </header>
  );
}
