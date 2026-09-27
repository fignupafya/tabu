import type { Metadata } from 'next';
import { PlayedManager } from '@/components/played/played-manager';
import { loadPageData } from '@/server/page-data';

export const metadata: Metadata = { title: 'Çıkan kelimeler' };

export default async function PlayedPage() {
  const initial = await loadPageData(async (service) => {
    const [played, words] = await Promise.all([service.listPlayed(), service.listWords()]);
    return { played, totalWords: words.length };
  });

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 pb-16 sm:pt-10">
      <PlayedManager initial={initial} />
    </main>
  );
}
