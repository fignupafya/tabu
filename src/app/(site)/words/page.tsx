import type { Metadata } from 'next';
import { WordManager } from '@/components/words/word-manager';
import { getWordService } from '@/server/word-service';

export const metadata: Metadata = { title: 'Kelimeler' };

// Words live in a file that can change at any time: render on every request.
export const dynamic = 'force-dynamic';

export default async function WordsPage() {
  const service = getWordService();
  const [words, tags] = await Promise.all([service.listWords(), service.listTags()]);
  return (
    <main className="mx-auto max-w-5xl px-4 pt-6 pb-16 sm:pt-10">
      <WordManager words={words} tags={tags} />
    </main>
  );
}
