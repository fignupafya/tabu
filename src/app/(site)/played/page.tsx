import type { Metadata } from 'next';
import { PlayedManager } from '@/components/played/played-manager';
import { getWordService } from '@/server/word-service';

export const metadata: Metadata = { title: 'Çıkan kelimeler' };

// The list grows after every turn: render on every request.
export const dynamic = 'force-dynamic';

export default async function PlayedPage() {
  const service = getWordService();
  const [played, words] = await Promise.all([service.listPlayed(), service.listWords()]);
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 pb-16 sm:pt-10">
      <PlayedManager played={played} totalWords={words.length} />
    </main>
  );
}
