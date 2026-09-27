'use client';

import { Flag, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { GameState } from '@/core/game/types';
import { gameStorage, gameStore, useGame } from '@/lib/game-store';
import { setMuted } from '@/lib/sound';
import { buttonClasses, IconButton } from '../ui/button';
import { Logo } from '../ui/logo';
import { GameSummary } from './game-summary';
import { TurnIntro } from './turn-intro';
import { TurnPlay } from './turn-play';
import { TurnReview } from './turn-review';

export function GameScreen() {
  const game = useGame();

  if (game === undefined) {
    return <div className="grid min-h-dvh place-items-center text-slate-500">Yükleniyor…</div>;
  }
  if (game === null) {
    return (
      <div className="grid min-h-dvh place-items-center px-4 text-center">
        <div>
          <p className="text-xl font-black">Kayıtlı bir oyun yok</p>
          <Link href="/" className={buttonClasses('primary', 'lg', 'mt-4')}>
            Yeni oyun kur
          </Link>
        </div>
      </div>
    );
  }
  return <GameView game={game} />;
}

function GameView({ game }: { game: GameState }) {
  const [muted, setMutedState] = useState(() => {
    const { muted: saved } = gameStorage.loadPreferences();
    setMuted(saved);
    return saved;
  });
  const { phase } = game;

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    gameStorage.savePreferences({ muted: next });
  };

  const endGame = () => {
    if (window.confirm('Oyun şimdi bitirilsin mi? Tamamlanan turlar sayılır.')) {
      gameStore.dispatch({ type: 'endGame' });
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-14 w-full max-w-xl items-center justify-between px-4">
        <Link href="/" aria-label="Ana sayfa (oyun kayıtlı kalır)">
          <Logo />
        </Link>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
          {phase.name === 'finished' ? 'Oyun bitti' : `Tur ${game.round}/${game.settings.rounds}`}
        </p>
        <div className="flex gap-1">
          <IconButton label={muted ? 'Sesi aç' : 'Sesi kapat'} onClick={toggleSound}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </IconButton>
          {phase.name !== 'finished' && (
            <IconButton label="Oyunu bitir" onClick={endGame}>
              <Flag className="size-5" />
            </IconButton>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {phase.name === 'ready' && <TurnIntro game={game} />}
        {phase.name === 'playing' && <TurnPlay game={game} phase={phase} />}
        {phase.name === 'review' && <TurnReview game={game} />}
        {phase.name === 'finished' && <GameSummary game={game} />}
      </main>
    </div>
  );
}
