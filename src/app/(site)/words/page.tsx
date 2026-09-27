import type { Metadata } from 'next';
import { WordManager } from '@/components/words/word-manager';
import { loadPageData } from '@/server/page-data';

export const metadata: Metadata = { title: 'Kelimeler' };

export default async function WordsPage() {
  const initial = await loadPageData(async (service) => {
    const [words, tags] = await Promise.all([service.listWords(), service.listTags()]);
    return { words, tags };
  });

  return (
    <main className="mx-auto max-w-5xl px-4 pt-6 pb-16 sm:pt-10">
      <WordManager initial={initial} />
    </main>
  );
}
