'use client';

import { RotateCcw, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDeferredValue, useMemo, useState } from 'react';
import type { PlayedWord } from '@/core/words/played-word-repository';
import { normalizeText } from '@/core/words/word';
import { ApiError, api } from '@/lib/api-client';
import { Button, buttonClasses } from '../ui/button';
import { Input } from '../ui/input';

const PAGE_SIZE = 100;
const dateFormat = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function PlayedManager({ played, totalWords }: { played: PlayedWord[]; totalWords: number }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const query = useDeferredValue(search);

  const filtered = useMemo(() => {
    const needle = normalizeText(query);
    return needle ? played.filter((entry) => normalizeText(entry.word).includes(needle)) : played;
  }, [played, query]);
  const percent = totalWords > 0 ? Math.min(100, Math.round((played.length / totalWords) * 100)) : 0;

  const run = async (action: () => Promise<void>) => {
    try {
      await action();
      router.refresh();
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : 'İşlem yapılamadı');
    }
  };
  const clearAll = () => {
    if (window.confirm(`Listedeki ${played.length} kelimenin hepsi silinsin mi? Hepsi yeni oyunlarda yeniden çıkabilir.`)) {
      void run(() => api.clearPlayed());
    }
  };

  return (
    <>
      <h1 className="text-3xl font-black tracking-tight">Çıkan kelimeler</h1>
      <p className="mt-1 text-slate-500 dark:text-slate-400">
        {played.length} / {totalWords} kelime çıktı
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full bg-violet-600" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        Oyunlarda çıkan kelimeler burada birikir ve yeni oyunlarda tekrar gelmez. Oyun kurarken{' '}
        <strong>Daha önce çıkan kelimeleri de dahil et</strong> seçilirse ya da bir kelime listeden çıkarılırsa
        yeniden çıkabilir.
      </p>

      {played.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <p className="text-lg font-bold">Henüz çıkan kelime yok.</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Oynadıkça çıkan kelimeler burada listelenir.</p>
          <Link href="/" className={buttonClasses('primary', 'md', 'mt-4')}>
            Oyun kur
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setLimit(PAGE_SIZE);
                }}
                placeholder="Çıkan kelimelerde ara…"
                aria-label="Çıkan kelimelerde ara"
                className="pl-9"
              />
            </div>
            <Button variant="danger" onClick={clearAll}>
              <Trash2 className="size-4" /> Listeyi temizle
            </Button>
          </div>

          <p className="mt-4 mb-2 text-sm font-bold text-slate-500 dark:text-slate-400">{filtered.length} kelime</p>
          <ul className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
            {filtered.slice(0, limit).map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-extrabold">{entry.word}</p>
                  {/* Formatted in the viewer's time zone, which may differ from the server's. */}
                  <time dateTime={entry.playedAt} suppressHydrationWarning className="text-xs text-slate-500 dark:text-slate-400">
                    {dateFormat.format(new Date(entry.playedAt))}
                  </time>
                </div>
                <Button size="sm" variant="ghost" onClick={() => run(() => api.unmarkPlayed(entry.id))}>
                  <RotateCcw className="size-4" /> Listeden çıkar
                </Button>
              </li>
            ))}
          </ul>
          {filtered.length > limit && (
            <div className="mt-4 text-center">
              <Button onClick={() => setLimit((current) => current + PAGE_SIZE)}>
                Daha fazla göster ({filtered.length - limit})
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
