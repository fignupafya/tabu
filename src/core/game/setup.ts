import type { Card } from '../words/word';
import { shuffle } from './random';
import { GAME_STATE_VERSION, type GameSettings, type GameState, type Team } from './types';

export interface TeamSetup {
  name: string;
  /** Player names in narration order; blank names get a default. */
  players: string[];
}

export interface GameSetup {
  teams: TeamSetup[];
  settings: GameSettings;
}

export const SETUP_LIMITS = {
  minTeams: 2,
  maxTeams: 4,
  /** One narrator plus at least one guesser. */
  minPlayers: 2,
  maxPlayers: 12,
  minRounds: 1,
  maxRounds: 20,
} as const;

export function defaultPlayerName(index: number): string {
  return `Oyuncu ${index + 1}`;
}

/** Human-readable problems that prevent starting a game; empty when the setup is valid. */
export function validateSetup(setup: GameSetup): string[] {
  const errors: string[] = [];
  const { teams, settings } = setup;

  if (teams.length < SETUP_LIMITS.minTeams || teams.length > SETUP_LIMITS.maxTeams) {
    errors.push(`${SETUP_LIMITS.minTeams}–${SETUP_LIMITS.maxTeams} takım olmalı`);
  }
  teams.forEach((team, index) => {
    const name = team.name.trim() || `${index + 1}. takım`;
    if (!team.name.trim()) errors.push(`${index + 1}. takımın adı boş`);
    if (team.players.length < SETUP_LIMITS.minPlayers) {
      errors.push(`${name}: en az ${SETUP_LIMITS.minPlayers} oyuncu gerekli (bir anlatıcı, en az bir tahminci)`);
    }
    if (team.players.length > SETUP_LIMITS.maxPlayers) {
      errors.push(`${name}: en fazla ${SETUP_LIMITS.maxPlayers} oyuncu olabilir`);
    }
  });
  const names = teams.map((team) => team.name.trim().toLocaleLowerCase('tr-TR')).filter(Boolean);
  if (new Set(names).size !== names.length) errors.push('Takım adları farklı olmalı');

  if (settings.rounds < SETUP_LIMITS.minRounds || settings.rounds > SETUP_LIMITS.maxRounds) {
    errors.push(`Tur sayısı ${SETUP_LIMITS.minRounds}–${SETUP_LIMITS.maxRounds} arasında olmalı`);
  }
  if (settings.turnSeconds < 10) errors.push('Süre en az 10 saniye olmalı');
  if (settings.passLimit !== null && settings.passLimit < 0) errors.push('Pas hakkı negatif olamaz');
  return errors;
}

export function createGame(
  setup: GameSetup,
  cards: Card[],
  options: { id: string; now: number; seed: number },
): GameState {
  if (cards.length === 0) throw new Error('Deste boş: seçilen kategorilerde kelime yok');

  const teams: Team[] = setup.teams.map((team, t) => ({
    id: `t${t + 1}`,
    name: team.name.trim(),
    players: team.players.map((name, p) => ({
      id: `t${t + 1}p${p + 1}`,
      name: name.trim() || defaultPlayerName(p),
    })),
  }));
  const [drawPile, seed] = shuffle(
    cards.map((card) => card.id),
    options.seed,
  );

  return {
    version: GAME_STATE_VERSION,
    id: options.id,
    createdAt: options.now,
    settings: { ...setup.settings, tags: [...setup.settings.tags] },
    teams,
    cards: Object.fromEntries(cards.map((card) => [card.id, card])),
    drawPile,
    seed,
    round: 1,
    teamIndex: 0,
    narratorIndexes: teams.map(() => 0),
    turnCards: [],
    history: [],
    phase: { name: 'ready' },
  };
}
