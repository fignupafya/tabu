import { RotateCcw, Trophy } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { leaders, playerStats, scoreOf, standings } from '@/core/game/scoring';
import type { GameState } from '@/core/game/types';
import { cn } from '@/lib/cn';
import { gameStore } from '@/lib/game-store';
import { OUTCOME_LABELS } from '@/lib/labels';
import { teamColor } from '@/lib/team-colors';
import { Button, buttonClasses } from '../ui/button';
import { OUTCOME_STYLES } from './turn-review';

export function GameSummary({ game }: { game: GameState }) {
  const winners = leaders(game);
  const colorOf = (teamId: string) => teamColor(game.teams.findIndex((team) => team.id === teamId));
  const table = standings(game).sort((a, b) => b.score.total - a.score.total || b.score.correct - a.score.correct);
  const narrators = playerStats(game).filter((row) => row.turns > 0);
  const roundsPlayed = Math.max(0, ...game.history.map((turn) => turn.round));
  const interrupted = game.teamIndex > 0;

  const title =
    winners.length === 1 ? `${winners[0].name} kazandı!` : winners.length > 1 ? 'Berabere!' : 'Oyun bitti';

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="text-center">
        <Trophy className="mx-auto size-12 text-amber-500" />
        <h1 className="mt-2 text-3xl font-black">{title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {roundsPlayed} tur · {game.history.length} anlatım oynandı
        </p>
      </div>

      <Panel title="Takımlar">
        <Table head={['Takım', 'Doğru', 'Yanlış', 'Pas', 'Toplam']}>
          {table.map(({ team, score }) => (
            <tr key={team.id} className={cn(winners.includes(team) && 'bg-amber-50 dark:bg-amber-500/10')}>
              <td className="py-2 pr-2 font-extrabold">
                <span className={cn('mr-1.5 inline-block size-2.5 rounded-full', colorOf(team.id).dot)} />
                {team.name}
              </td>
              <Num className="text-emerald-600 dark:text-emerald-400">{score.correct}</Num>
              <Num className="text-rose-600 dark:text-rose-400">{score.taboo}</Num>
              <Num className="text-slate-500">{score.pass}</Num>
              <Num className="text-lg font-black">{score.total}</Num>
            </tr>
          ))}
        </Table>
      </Panel>

      {narrators.length > 0 && (
        <Panel title="Anlatıcılar">
          <Table head={['Oyuncu', 'Anlatım', 'Doğru', 'Yanlış', 'Toplam']}>
            {narrators.map(({ player, team, turns, score }) => (
              <tr key={player.id}>
                <td className="py-2 pr-2 font-bold">
                  <span className={cn('mr-1.5 inline-block size-2 rounded-full', colorOf(team.id).dot)} />
                  {player.name}
                </td>
                <Num className="text-slate-500">{turns}</Num>
                <Num className="text-emerald-600 dark:text-emerald-400">{score.correct}</Num>
                <Num className="text-rose-600 dark:text-rose-400">{score.taboo}</Num>
                <Num className="font-black">{score.total}</Num>
              </tr>
            ))}
          </Table>
        </Panel>
      )}

      {game.history.length > 0 && (
        <Panel title="Geçmiş">
          <ol className="space-y-2">
            {game.history.map((turn, index) => {
              const team = game.teams.find((t) => t.id === turn.teamId);
              const narrator = team?.players.find((p) => p.id === turn.narratorId);
              const score = scoreOf(turn.cards);
              return (
                <li key={index}>
                  <details className="group rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">
                        <span className={cn('mr-1.5 inline-block size-2 rounded-full', colorOf(turn.teamId).dot)} />
                        <strong>{turn.round}. tur</strong> · {team?.name} · {narrator?.name}
                      </span>
                      <span className="shrink-0 font-bold tabular-nums">
                        <span className="text-emerald-600 dark:text-emerald-400">✓{score.correct}</span>{' '}
                        <span className="text-rose-600 dark:text-rose-400">✗{score.taboo}</span>
                      </span>
                    </summary>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {turn.cards.map((played, i) => (
                        <li
                          key={i}
                          title={OUTCOME_LABELS[played.outcome]}
                          className={cn('rounded-md px-2 py-0.5 text-xs font-bold', OUTCOME_STYLES[played.outcome])}
                        >
                          {game.cards[played.cardId]?.word ?? played.cardId}
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              );
            })}
          </ol>
        </Panel>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button size="lg" onClick={() => gameStore.dispatch({ type: 'addRound' })}>
          <RotateCcw className="size-5" /> {interrupted ? 'Kalan turu tamamla' : 'Bir tur daha oyna'}
        </Button>
        <Link href="/" className={buttonClasses('primary', 'lg')}>
          Yeni oyun kur
        </Link>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <h2 className="mb-2 text-sm font-black tracking-wide text-slate-500 uppercase dark:text-slate-400">{title}</h2>
      {children}
    </section>
  );
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-slate-500 dark:text-slate-400">
          {head.map((label, index) => (
            <th key={label} className={cn('pb-1 font-bold', index === 0 ? 'text-left' : 'w-16 text-right')}>
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>
    </table>
  );
}

function Num({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('py-2 text-right font-bold tabular-nums', className)}>{children}</td>;
}
