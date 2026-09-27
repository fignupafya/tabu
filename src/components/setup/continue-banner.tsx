'use client';

import Link from 'next/link';
import { standings } from '@/core/game/scoring';
import { gameStore, useGame } from '@/lib/game-store';
import { buttonClasses } from '../ui/button';

/** Offers to resume (or review) the game saved on this device. */
export function ContinueBanner() {
  const game = useGame();
  if (!game) return null;

  const finished = game.phase.name === 'finished';
  const pausedTurn = game.phase.name === 'playing' && game.phase.clock.status === 'paused' ? game.phase.clock : null;
  const score = standings(game)
    .map(({ team, score }) => `${team.name} ${score.total}`)
    .join(' – ');

  const discard = () => {
    if (window.confirm('Kayıtlı oyun silinsin mi?')) gameStore.clear();
  };

  return (
    <div className="mb-8 flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-4 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-bold text-violet-100">
          {finished ? 'Son oyun bitti' : `Devam eden oyun · Tur ${game.round}/${game.settings.rounds}`}
          {pausedTurn && ` · Sıra duraklatıldı, ${Math.ceil(pausedTurn.remainingMs / 1000)} sn kaldı`}
        </p>
        <p className="text-lg font-extrabold">{score}</p>
      </div>
      <div className="flex gap-2">
        <Link href="/play" className={buttonClasses('secondary', 'md', 'text-violet-700 ring-0')}>
          {finished ? 'Sonuçları gör' : 'Devam et'}
        </Link>
        <button
          type="button"
          onClick={discard}
          className={buttonClasses('ghost', 'md', 'text-white hover:bg-white/15 dark:text-white dark:hover:bg-white/15')}
        >
          Sil
        </button>
      </div>
    </div>
  );
}
