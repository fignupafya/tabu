import { Ban, Check, Pause, Play, SkipForward, Square, Undo2 } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, type ReactNode } from 'react';
import { currentNarrator, currentTeam, passesLeft, remainingMs } from '@/core/game/engine';
import { scoreOf } from '@/core/game/scoring';
import type { GamePhase, GameState, MarkOutcome } from '@/core/game/types';
import { cn } from '@/lib/cn';
import { gameStore } from '@/lib/game-store';
import { useNow, useWakeLock } from '@/lib/hooks';
import { sounds } from '@/lib/sound';
import { teamColor } from '@/lib/team-colors';
import { Button, IconButton } from '../ui/button';
import { TabooCard } from './taboo-card';

type PlayingPhase = Extract<GamePhase, { name: 'playing' }>;

const COUNTDOWN_FROM = 5;

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export function TurnPlay({ game, phase }: { game: GameState; phase: PlayingPhase }) {
  const running = phase.clock.status === 'running';
  const now = useNow(200, running);
  const msLeft = remainingMs(phase.clock, now);
  const secondsLeft = Math.ceil(msLeft / 1000);
  const totalMs = game.settings.turnSeconds * 1000;

  const team = currentTeam(game);
  const color = teamColor(game.teamIndex);
  const turnScore = scoreOf(game.turnCards);
  const passes = passesLeft(game);
  const lastTick = useRef<number | null>(null);
  const pendingLeave = useRef<ReturnType<typeof setTimeout>>(undefined);

  useWakeLock(true);

  useEffect(() => {
    if (running && msLeft <= 0) {
      sounds.timeUp();
      gameStore.dispatch({ type: 'tick', now: Date.now() });
    }
  }, [running, msLeft]);

  // The clock is wall-clock based, so leaving the game (closing or reloading the page, switching apps,
  // locking the phone, navigating away) pauses the turn: coming back resumes it with the same time left.
  useEffect(() => {
    if (!running) return;
    const pause = () => gameStore.dispatch({ type: 'pause', now: Date.now() });
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') pause();
    };
    clearTimeout(pendingLeave.current);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', pause);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', pause);
      // Unmounting (in-app navigation) pauses too. Deferred because React Strict Mode runs this cleanup
      // once on mount in development; the immediate re-run above cancels it. A no-op after the turn ends.
      pendingLeave.current = setTimeout(pause, 0);
    };
  }, [running]);

  useEffect(() => {
    if (running && secondsLeft > 0 && secondsLeft <= COUNTDOWN_FROM && lastTick.current !== secondsLeft) {
      lastTick.current = secondsLeft;
      sounds.tick();
    }
  }, [running, secondsLeft]);

  const mark = (outcome: MarkOutcome) => {
    if (outcome === 'pass' && passes === 0) return;
    sounds[outcome]();
    gameStore.dispatch({ type: 'mark', outcome });
  };
  const togglePause = () =>
    gameStore.dispatch({ type: running ? 'pause' : 'resume', now: Date.now() });

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.repeat || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
    const key = event.key.toLocaleLowerCase('tr-TR');
    if (key === ' ' || key === 'escape') togglePause();
    else if (!running) return;
    else if (key === 'arrowright' || key === 'd') mark('correct');
    else if (key === 'arrowleft' || key === 't') mark('taboo');
    else if (key === 'arrowdown' || key === 'p') mark('pass');
    else if (key === 'backspace' || key === 'z') gameStore.dispatch({ type: 'undo' });
    else return;
    event.preventDefault();
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('truncate text-sm font-extrabold', color.text)}>{team.name}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">Anlatıcı: {currentNarrator(game).name}</p>
        </div>
        <p
          aria-live="off"
          className={cn(
            'text-4xl font-black tabular-nums',
            secondsLeft <= 10 && 'text-rose-600 dark:text-rose-400',
            running && secondsLeft <= COUNTDOWN_FROM && 'animate-pulse',
          )}
        >
          {formatTime(secondsLeft)}
        </p>
        <IconButton label={running ? 'Duraklat' : 'Devam et'} onClick={togglePause} className="size-10">
          {running ? <Pause className="size-5" /> : <Play className="size-5" />}
        </IconButton>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className={cn('h-full rounded-full transition-[width] duration-200 ease-linear', color.dot)}
          style={{ width: `${(msLeft / totalMs) * 100}%` }}
        />
      </div>

      <div className="relative flex flex-1 items-center justify-center py-2">
        <TabooCard key={phase.activeCardId} card={game.cards[phase.activeCardId]} concealed={!running} />
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <p className="text-2xl font-black">Duraklatıldı</p>
            <Button variant="primary" size="lg" onClick={togglePause}>
              <Play className="size-5 fill-current" /> Devam et
            </Button>
            <Button variant="secondary" onClick={() => gameStore.dispatch({ type: 'endTurn' })}>
              <Square className="size-4" /> Sırayı bitir
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm font-extrabold tabular-nums">
          <span className="text-emerald-600 dark:text-emerald-400">✓ {turnScore.correct}</span>
          <span className="text-rose-600 dark:text-rose-400">✗ {turnScore.taboo}</span>
          <span className="text-amber-600 dark:text-amber-400">↷ {turnScore.pass}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          disabled={!running || game.turnCards.length === 0}
          onClick={() => gameStore.dispatch({ type: 'undo' })}
        >
          <Undo2 className="size-4" /> Geri al
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <ActionButton tone="taboo" disabled={!running} onClick={() => mark('taboo')} icon={<Ban className="size-6" />}>
          Tabu
        </ActionButton>
        <ActionButton
          tone="pass"
          disabled={!running || passes === 0}
          onClick={() => mark('pass')}
          icon={<SkipForward className="size-6" />}
        >
          {passes === null ? 'Pas' : `Pas (${passes})`}
        </ActionButton>
        <ActionButton tone="correct" disabled={!running} onClick={() => mark('correct')} icon={<Check className="size-6" />}>
          Doğru
        </ActionButton>
      </div>
      <p className="hidden text-center text-xs text-slate-400 sm:block">
        Kısayollar: → doğru · ← tabu · ↓ pas · ⌫ geri al · boşluk duraklat
      </p>
    </div>
  );
}

const TONES: Record<MarkOutcome, string> = {
  correct: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700',
  taboo: 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700',
  pass: 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600',
};

function ActionButton({
  tone,
  icon,
  children,
  ...props
}: { tone: MarkOutcome; icon: ReactNode; children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-20 flex-col items-center justify-center gap-1 rounded-2xl text-base font-black text-white shadow-sm transition select-none',
        'active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40',
        TONES[tone],
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
