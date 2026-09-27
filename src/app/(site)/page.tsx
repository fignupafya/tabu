import Link from 'next/link';
import { ContinueBanner } from '@/components/setup/continue-banner';
import { Rules } from '@/components/setup/rules';
import { GameSetupPanel, type DeckInfo } from '@/components/setup/setup-form';
import { buttonClasses } from '@/components/ui/button';
import { DIFFICULTY_LEVELS, type DifficultyLevel } from '@/core/words/difficulty';
import { tabooWordsFor, wordId } from '@/core/words/word';
import { countTags } from '@/core/words/word-query';
import { getWordService } from '@/server/word-service';

// Words live in a file that can change at any time: render on every request.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const service = getWordService();
  const [words, played] = await Promise.all([service.listWords(), service.listPlayed()]);
  const playedIds = new Set(played.map((word) => word.id));
  const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
  const deck: DeckInfo = {
    tags: countTags(words),
    words: words.map((entry) => ({ tags: entry.tags, played: playedIds.has(wordId(entry.word)) })),
    tabooAverages: Object.fromEntries(
      DIFFICULTY_LEVELS.map((level) => [level, average(words.map((entry) => tabooWordsFor(entry, level).length))]),
    ) as Record<DifficultyLevel, number>,
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 pb-10 sm:pt-10">
      <ContinueBanner />
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Yeni oyun</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">Takımları kur, ayarları seç ve anlatmaya başla.</p>
      </div>

      {words.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <p className="text-lg font-bold">Henüz hiç kelime yok.</p>
          <Link href="/words" className={buttonClasses('primary', 'md', 'mt-4')}>
            Kelime ekle
          </Link>
        </div>
      ) : (
        <GameSetupPanel deck={deck} />
      )}

      <Rules />
    </main>
  );
}
