import { Play } from 'lucide-react';
import { currentNarrator, currentTeam } from '@/core/game/engine';
import type { GameState } from '@/core/game/types';
import { cn } from '@/lib/cn';
import { gameStore } from '@/lib/game-store';
import { DIFFICULTY_LABELS } from '@/lib/labels';
import { sounds } from '@/lib/sound';
import { teamColor } from '@/lib/team-colors';
import { Button } from '../ui/button';
import { Scoreboard } from './scoreboard';

export function TurnIntro({ game }: { game: GameState }) {
  const team = currentTeam(game);
  const narrator = currentNarrator(game);
  const color = teamColor(game.teamIndex);
  const { settings } = game;

  const start = () => {
    sounds.start();
    gameStore.dispatch({ type: 'startTurn', now: Date.now() });
  };

  return (
    <div className="flex flex-1 flex-col gap-5 py-4">
      <Scoreboard game={game} activeTeamId={team.id} />

      <div className={cn('flex flex-1 flex-col items-center justify-center rounded-3xl p-6 text-center', color.soft)}>
        <p className="text-xs font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">Sıradaki takım</p>
        <h1 className={cn('mt-1 text-4xl font-black', color.text)}>{team.name}</h1>

        <p className="mt-6 text-sm font-bold text-slate-500 dark:text-slate-400">Anlatıcı</p>
        <p className="text-3xl font-extrabold">{narrator.name}</p>
        <label className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Değiştir:{' '}
          <select
            value={game.narratorIndexes[game.teamIndex]}
            onChange={(event) => gameStore.dispatch({ type: 'chooseNarrator', playerIndex: Number(event.target.value) })}
            className="rounded-md bg-white/70 px-1.5 py-0.5 font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700"
          >
            {team.players.map((player, index) => (
              <option key={player.id} value={index}>
                {player.name}
              </option>
            ))}
          </select>
        </label>

        <p className="mt-6 max-w-xs text-sm text-slate-600 dark:text-slate-300">
          Telefonu anlatıcıya verin. Karşı takımdan biri kartı birlikte izleyip yasaklı kelimeleri kontrol etsin.
        </p>
      </div>

      <Button variant="primary" size="lg" className="h-16 text-xl" onClick={start}>
        <Play className="size-6 fill-current" /> Başla
      </Button>
      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        {settings.turnSeconds} sn · Pas hakkı: {settings.passLimit ?? 'sınırsız'} ·{' '}
        {DIFFICULTY_LABELS[settings.difficulty].label}
        {settings.recordPlayed === false && ' · Kelimeler kaydedilmiyor'}
      </p>
    </div>
  );
}
