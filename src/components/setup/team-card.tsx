'use client';

import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { SETUP_LIMITS, defaultPlayerName, type TeamSetup } from '@/core/game/setup';
import { cn } from '@/lib/cn';
import { teamColor } from '@/lib/team-colors';
import { Button, IconButton } from '../ui/button';
import { Input } from '../ui/input';

export function TeamCard({
  team,
  index,
  onChange,
  onRemove,
}: {
  team: TeamSetup;
  index: number;
  onChange: (team: TeamSetup) => void;
  /** Absent when the team can't be removed. */
  onRemove?: () => void;
}) {
  const color = teamColor(index);
  // Index of a just-added player, focused when its input mounts.
  const [added, setAdded] = useState<number | null>(null);
  const setPlayer = (position: number, name: string) =>
    onChange({ ...team, players: team.players.map((player, i) => (i === position ? name : player)) });
  const addPlayer = () => {
    setAdded(team.players.length);
    onChange({ ...team, players: [...team.players, ''] });
  };

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-center gap-2">
        <span className={cn('size-3 shrink-0 rounded-full', color.dot)} />
        <input
          value={team.name}
          onChange={(event) => onChange({ ...team, name: event.target.value })}
          aria-label={`${index + 1}. takımın adı`}
          maxLength={30}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-0.5 text-lg font-extrabold outline-none focus:ring-2 focus:ring-violet-500"
        />
        {onRemove && (
          <IconButton label="Takımı kaldır" onClick={onRemove}>
            <X className="size-4" />
          </IconButton>
        )}
      </div>

      <ol className="mt-3 space-y-2">
        {team.players.map((name, position) => (
          <li key={position} className="flex items-center gap-2">
            <span className="w-4 text-right text-xs font-bold text-slate-400 tabular-nums">{position + 1}</span>
            <Input
              value={name}
              placeholder={defaultPlayerName(position)}
              onChange={(event) => setPlayer(position, event.target.value)}
              aria-label={`${team.name} ${position + 1}. oyuncu`}
              maxLength={24}
              autoFocus={position === added}
            />
            <IconButton
              label="Oyuncuyu çıkar"
              disabled={team.players.length <= SETUP_LIMITS.minPlayers}
              onClick={() => onChange({ ...team, players: team.players.filter((_, i) => i !== position) })}
            >
              <X className="size-4" />
            </IconButton>
          </li>
        ))}
      </ol>

      {team.players.length < SETUP_LIMITS.maxPlayers && (
        <Button size="sm" variant="ghost" className="mt-2" onClick={addPlayer}>
          <Plus className="size-4" /> Oyuncu ekle
        </Button>
      )}
    </section>
  );
}
