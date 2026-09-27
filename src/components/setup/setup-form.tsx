'use client';

import { Minus, Play, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import { SETUP_LIMITS, createGame, validateSetup, type GameSetup, type TeamSetup } from '@/core/game/setup';
import type { GameSettings } from '@/core/game/types';
import { DIFFICULTY_LEVELS, isDifficultyLevel, type DifficultyLevel } from '@/core/words/difficulty';
import type { TagCount } from '@/core/words/word-query';
import { api } from '@/lib/api-client';
import { gameStorage, gameStore } from '@/lib/game-store';
import { useIsClient } from '@/lib/hooks';
import { DIFFICULTY_LABELS } from '@/lib/labels';
import { DEFAULT_TEAM_NAMES } from '@/lib/team-colors';
import { Button, IconButton } from '../ui/button';
import { Segmented } from '../ui/segmented';
import { TagChip } from '../ui/tag-chip';
import { TeamCard } from './team-card';

export interface DeckInfo {
  tags: TagCount[];
  /** Every word's tags and whether it already came up, to size the deck for any selection. */
  words: { tags: string[]; played: boolean }[];
  /** Average number of taboo words per card at each level. */
  tabooAverages: Record<DifficultyLevel, number>;
}

const TURN_SECONDS = [30, 45, 60, 90, 120];
const PASS_LIMITS: (number | null)[] = [0, 1, 2, 3, 5, null];
/** Rough pace used for hints: a card every ~8 s, ~25 s between turns. */
const SECONDS_PER_CARD = 8;
const SECONDS_BETWEEN_TURNS = 25;

function defaultSetup(): GameSetup {
  return {
    teams: DEFAULT_TEAM_NAMES.slice(0, 2).map((name) => ({ name, players: ['', ''] })),
    settings: { turnSeconds: 60, rounds: 4, passLimit: 3, difficulty: 'medium', tags: [], includePlayed: false },
  };
}

/** The saved setup may be stale (tags removed, older format): keep what is still valid. */
function restoreSetup(saved: GameSetup | null, knownTags: Set<string>): GameSetup {
  const fallback = defaultSetup();
  if (!saved?.settings || !Array.isArray(saved.teams) || saved.teams.length < SETUP_LIMITS.minTeams) return fallback;
  const { settings } = saved;
  return {
    teams: saved.teams.slice(0, SETUP_LIMITS.maxTeams).map((team) => ({
      name: String(team.name ?? ''),
      players: Array.isArray(team.players) ? team.players.map(String) : ['', ''],
    })),
    settings: {
      turnSeconds: TURN_SECONDS.includes(settings.turnSeconds) ? settings.turnSeconds : fallback.settings.turnSeconds,
      rounds: Math.min(Math.max(Number(settings.rounds) || 0, SETUP_LIMITS.minRounds), SETUP_LIMITS.maxRounds),
      passLimit: PASS_LIMITS.includes(settings.passLimit) ? settings.passLimit : fallback.settings.passLimit,
      difficulty: isDifficultyLevel(settings.difficulty) ? settings.difficulty : fallback.settings.difficulty,
      tags: Array.isArray(settings.tags) ? settings.tags.filter((tag) => knownTags.has(tag)) : [],
      includePlayed: settings.includePlayed === true,
    },
  };
}

const randomId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

/** The form reads the last setup from localStorage, so it only renders in the browser. */
export function GameSetupPanel({ deck }: { deck: DeckInfo }) {
  const isClient = useIsClient();
  if (!isClient) {
    return <div className="h-[36rem] animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />;
  }
  return <SetupForm deck={deck} />;
}

function SetupForm({ deck }: { deck: DeckInfo }) {
  const router = useRouter();
  const [setup, setSetup] = useState(() =>
    restoreSetup(gameStorage.loadSetup(), new Set(deck.tags.map((item) => item.tag))),
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);
  const { teams, settings } = setup;

  const { deckSize, playedInSelection } = useMemo(() => {
    const selected = deck.words.filter(
      (word) => settings.tags.length === 0 || word.tags.some((tag) => settings.tags.includes(tag)),
    );
    const played = selected.filter((word) => word.played).length;
    return { deckSize: settings.includePlayed ? selected.length : selected.length - played, playedInSelection: played };
  }, [deck.words, settings.tags, settings.includePlayed]);
  const playedTotal = deck.words.filter((word) => word.played).length;
  const totalTurns = settings.rounds * teams.length;
  const expectedCards = Math.round((totalTurns * settings.turnSeconds) / SECONDS_PER_CARD);
  const minutes = Math.round((totalTurns * (settings.turnSeconds + SECONDS_BETWEEN_TURNS)) / 60);
  const largestTeam = Math.max(...teams.map((team) => team.players.length));

  const updateSettings = (patch: Partial<GameSettings>) =>
    setSetup((current) => ({ ...current, settings: { ...current.settings, ...patch } }));
  const updateTeam = (index: number, team: TeamSetup) =>
    setSetup((current) => ({ ...current, teams: current.teams.map((t, i) => (i === index ? team : t)) }));
  const addTeam = () =>
    setSetup((current) => ({
      ...current,
      teams: [
        ...current.teams,
        { name: DEFAULT_TEAM_NAMES[current.teams.length] ?? `Takım ${current.teams.length + 1}`, players: ['', ''] },
      ],
    }));
  const removeTeam = (index: number) =>
    setSetup((current) => ({ ...current, teams: current.teams.filter((_, i) => i !== index) }));
  const toggleTag = (tag: string) =>
    updateSettings({
      tags: settings.tags.includes(tag) ? settings.tags.filter((t) => t !== tag) : [...settings.tags, tag],
    });

  async function start() {
    const problems = validateSetup(setup);
    if (deckSize === 0) {
      problems.push(
        playedInSelection > 0
          ? 'Seçilen kategorilerdeki bütün kelimeler daha önce çıktı: çıkanları dahil et ya da Çıkanlar sayfasından listeyi temizle'
          : 'Seçilen kategorilerde kelime yok',
      );
    }
    setErrors(problems);
    if (problems.length > 0) return;

    const current = gameStore.getSnapshot();
    if (current && current.phase.name !== 'finished' && !window.confirm('Devam eden oyun silinecek. Yeni oyun başlasın mı?')) {
      return;
    }

    setStarting(true);
    try {
      const cards = await api.deck({
        difficulty: settings.difficulty,
        tags: settings.tags,
        includePlayed: settings.includePlayed,
      });
      gameStore.start(createGame(setup, cards, { id: randomId(), now: Date.now(), seed: randomSeed() }));
      gameStorage.saveSetup(setup);
      router.push('/play');
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Oyun başlatılamadı']);
      setStarting(false);
    }
  }

  return (
    <div className="space-y-8">
      <Section title="Takımlar" description="Oyuncular sırayla anlatır: takımın her sırasında listedeki bir sonraki oyuncu anlatıcıdır.">
        <div className="grid gap-4 sm:grid-cols-2">
          {teams.map((team, index) => (
            <TeamCard
              key={index}
              team={team}
              index={index}
              onChange={(next) => updateTeam(index, next)}
              onRemove={teams.length > SETUP_LIMITS.minTeams ? () => removeTeam(index) : undefined}
            />
          ))}
        </div>
        {teams.length < SETUP_LIMITS.maxTeams && (
          <Button variant="ghost" size="sm" className="mt-3" onClick={addTeam}>
            <Plus className="size-4" /> Takım ekle
          </Button>
        )}
      </Section>

      <Section title="Ayarlar">
        <div className="grid gap-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2 dark:bg-slate-900 dark:ring-slate-800">
          <Field label="Tur süresi (saniye)">
            <Segmented
              label="Tur süresi (saniye)"
              value={settings.turnSeconds}
              options={TURN_SECONDS.map((value) => ({ value, label: String(value) }))}
              onChange={(turnSeconds) => updateSettings({ turnSeconds })}
            />
          </Field>

          <Field
            label="Tur sayısı"
            hint={
              settings.rounds < largestTeam
                ? `Herkesin en az bir kez anlatması için en az ${largestTeam} tur gerekir`
                : `Her takım ${settings.rounds} kez anlatır`
            }
          >
            <div className="flex items-center gap-3">
              <IconButton
                label="Azalt"
                disabled={settings.rounds <= SETUP_LIMITS.minRounds}
                onClick={() => updateSettings({ rounds: settings.rounds - 1 })}
                className="ring-1 ring-slate-200 dark:ring-slate-700"
              >
                <Minus className="size-4" />
              </IconButton>
              <span className="w-8 text-center text-2xl font-black tabular-nums">{settings.rounds}</span>
              <IconButton
                label="Artır"
                disabled={settings.rounds >= SETUP_LIMITS.maxRounds}
                onClick={() => updateSettings({ rounds: settings.rounds + 1 })}
                className="ring-1 ring-slate-200 dark:ring-slate-700"
              >
                <Plus className="size-4" />
              </IconButton>
            </div>
          </Field>

          <Field label="Pas hakkı (her turda)" hint="Pas puanı etkilemez · ∞ = sınırsız">
            <Segmented
              label="Pas hakkı"
              value={settings.passLimit}
              options={PASS_LIMITS.map((value) => ({
                value,
                label: value === null ? '∞' : value === 0 ? 'Yok' : String(value),
              }))}
              onChange={(passLimit) => updateSettings({ passLimit })}
            />
          </Field>

          <Field label="Zorluk" hint={DIFFICULTY_LABELS[settings.difficulty].hint}>
            <Segmented
              label="Zorluk"
              value={settings.difficulty}
              options={DIFFICULTY_LEVELS.map((level) => ({
                value: level,
                label: DIFFICULTY_LABELS[level].label,
                hint: `${Math.round(deck.tabooAverages[level])} yasak`,
              }))}
              onChange={(difficulty) => updateSettings({ difficulty })}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Kategoriler"
        description="İstediğin kadar kategori seçebilirsin: seçtiklerinden herhangi birine ait kelimeler desteye girer. Hiçbirini seçmezsen tüm kelimeler kullanılır."
      >
        <div className="flex flex-wrap gap-2">
          <TagChip
            selected={settings.tags.length === 0}
            onClick={() => updateSettings({ tags: [] })}
            count={deck.words.length}
          >
            Tümü
          </TagChip>
          {deck.tags.map(({ tag, count }) => (
            <TagChip key={tag} selected={settings.tags.includes(tag)} onClick={() => toggleTag(tag)} count={count}>
              {tag}
            </TagChip>
          ))}
        </div>
        {settings.tags.length > 0 && (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            <strong className="text-slate-900 dark:text-slate-100">{settings.tags.length} kategori seçili</strong> ·{' '}
            {deckSize} kelime ·{' '}
            <button
              type="button"
              onClick={() => updateSettings({ tags: [] })}
              className="font-bold text-violet-600 hover:underline dark:text-violet-400"
            >
              Temizle
            </button>
          </p>
        )}

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <input
            type="checkbox"
            checked={settings.includePlayed}
            onChange={(event) => updateSettings({ includePlayed: event.target.checked })}
            className="mt-0.5 size-5 shrink-0 accent-violet-600"
          />
          <span className="text-sm">
            <span className="block font-bold">Daha önce çıkan kelimeleri de dahil et</span>
            <span className="mt-0.5 block text-slate-500 dark:text-slate-400">
              {playedTotal === 0
                ? 'Henüz çıkan kelime yok; oynadıkça çıkan kelimeler kaydedilir ve yeni oyunlarda tekrar gelmez.'
                : settings.includePlayed
                  ? `Önceki oyunlarda çıkan ${playedTotal} kelime de desteye girer.`
                  : `Önceki oyunlarda çıkan ${playedTotal} kelime desteye alınmaz.`}{' '}
              <Link href="/played" className="font-bold text-violet-600 hover:underline dark:text-violet-400">
                Çıkan kelimeler
              </Link>
            </span>
          </span>
        </label>
      </Section>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-slate-50/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        {errors.length > 0 && (
          <ul className="mb-3 space-y-1 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <strong className="text-slate-900 dark:text-slate-100">{deckSize}</strong> kelime · {settings.rounds} tur ·
            ~{minutes} dk
            {deckSize > 0 && deckSize < expectedCards && (
              <span className="block text-xs text-amber-600 dark:text-amber-400">Deste küçük, kartlar tekrar edebilir</span>
            )}
          </p>
          <Button variant="primary" size="lg" onClick={start} disabled={starting}>
            <Play className="size-5 fill-current" /> {starting ? 'Hazırlanıyor…' : 'Oyunu başlat'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-black">{title}</h2>
      {description && <p className="mt-0.5 mb-3 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      <div className={description ? undefined : 'mt-3'}>{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">{label}</p>
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}
