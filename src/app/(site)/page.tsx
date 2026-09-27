import { ContinueBanner } from '@/components/setup/continue-banner';
import { Rules } from '@/components/setup/rules';
import { GameSetupPanel } from '@/components/setup/setup-form';
import { buildDeckInfo } from '@/lib/deck-info';
import { loadPageData } from '@/server/page-data';

export default async function HomePage() {
  const deck = await loadPageData(async (service) => {
    const [words, played] = await Promise.all([service.listWords(), service.listPlayed()]);
    return buildDeckInfo(words, played);
  });

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 pb-10 sm:pt-10">
      <ContinueBanner />
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Yeni oyun</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">Takımları kur, ayarları seç ve anlatmaya başla.</p>
      </div>
      <GameSetupPanel initialDeck={deck} />
      <Rules />
    </main>
  );
}
