import { ArrowRight } from 'lucide-react';
import { currentNarrator, currentTeam } from '@/core/game/engine';
import { scoreOf } from '@/core/game/scoring';
import type { CardOutcome, GameState } from '@/core/game/types';
import { cn } from '@/lib/cn';
import { gameStore } from '@/lib/game-store';
import { OUTCOME_LABELS } from '@/lib/labels';
import { teamColor } from '@/lib/team-colors';
import { Button } from '../ui/button';
import { ScoreColumns } from './scoreboard';

const OUTCOMES: CardOutcome[] = ['correct', 'taboo', 'pass', 'timeout'];

export const OUTCOME_STYLES: Record<CardOutcome, string> = {
  correct: 'bg-emerald-600 text-white',
  taboo: 'bg-rose-600 text-white',
  pass: 'bg-amber-500 text-white',
  timeout: 'bg-slate-500 text-white',
};

export function TurnReview({ game }: { game: GameState }) {
  const team = currentTeam(game);
  const color = teamColor(game.teamIndex);
  const score = scoreOf(game.turnCards);
  const isLastTurn = game.round === game.settings.rounds && game.teamIndex === game.teams.length - 1;

  return (
    <div className="flex flex-1 flex-col gap-4 py-4">
      <div className="text-center">
        <p className="text-xs font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">Sıra bitti</p>
        <h1 className={cn('mt-1 text-3xl font-black', color.text)}>{team.name}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Anlatıcı: {currentNarrator(game).name}</p>
      </div>

      <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <ScoreColumns score={score} />
        <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">{score.pass} pas</p>
      </div>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        Yanlış işaretlenen ya da son saniyede bilinen kartları buradan düzeltebilirsin.
      </p>

      <ol className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
        {game.turnCards.map((played, index) => (
          <li key={index} className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-extrabold">{game.cards[played.cardId]?.word ?? played.cardId}</span>
            <div role="radiogroup" aria-label="Sonuç" className="flex gap-1">
              {OUTCOMES.map((outcome) => {
                const selected = played.outcome === outcome;
                return (
                  <button
                    key={outcome}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => gameStore.dispatch({ type: 'setOutcome', index, outcome })}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-xs font-bold transition',
                      selected
                        ? OUTCOME_STYLES[outcome]
                        : 'bg-slate-100 text-slate-500 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white',
                    )}
                  >
                    {OUTCOME_LABELS[outcome]}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <Button variant="primary" size="lg" className="mt-auto" onClick={() => gameStore.dispatch({ type: 'confirmTurn' })}>
        {isLastTurn ? 'Onayla ve sonuçları gör' : 'Onayla, sıradaki takıma geç'} <ArrowRight className="size-5" />
      </Button>
    </div>
  );
}
