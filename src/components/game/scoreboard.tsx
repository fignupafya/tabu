import { standings, type Score } from '@/core/game/scoring';
import type { GameState } from '@/core/game/types';
import { cn } from '@/lib/cn';
import { teamColor } from '@/lib/team-colors';

/** Per team: correct and wrong answers side by side, plus the resulting total. */
export function Scoreboard({ game, activeTeamId }: { game: GameState; activeTeamId?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {standings(game).map(({ team, score }, index) => {
        const color = teamColor(index);
        return (
          <div
            key={team.id}
            className={cn(
              'rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800',
              team.id === activeTeamId && cn('ring-2', color.ring),
            )}
          >
            <p className="flex items-center gap-1.5 text-sm font-extrabold">
              <span className={cn('size-2.5 shrink-0 rounded-full', color.dot)} />
              <span className="truncate">{team.name}</span>
            </p>
            <ScoreColumns score={score} className="mt-2" />
          </div>
        );
      })}
    </div>
  );
}

export function ScoreColumns({ score, className }: { score: Score; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-3 text-center', className)}>
      <Stat label="Doğru" value={score.correct} className="text-emerald-600 dark:text-emerald-400" />
      <Stat label="Yanlış" value={score.taboo} className="text-rose-600 dark:text-rose-400" />
      <Stat label="Toplam" value={score.total} className="text-slate-900 dark:text-white" />
    </dl>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">{label}</dt>
      <dd className={cn('text-2xl font-black tabular-nums', className)}>{value}</dd>
    </div>
  );
}
