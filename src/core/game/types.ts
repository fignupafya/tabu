import type { DifficultyLevel } from '../words/difficulty';
import type { Card } from '../words/word';

export const GAME_STATE_VERSION = 1;

export type CardOutcome = 'correct' | 'taboo' | 'pass' | 'timeout';
/** Outcomes the players mark during a turn; 'timeout' is set by the clock. */
export type MarkOutcome = Exclude<CardOutcome, 'timeout'>;

export interface Player {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  /** Narration order: players take turns describing, one per team turn. */
  players: Player[];
}

export interface GameSettings {
  turnSeconds: number;
  /** In each round every team plays one turn. */
  rounds: number;
  /** Passes allowed per turn; null = unlimited. */
  passLimit: number | null;
  difficulty: DifficultyLevel;
  /** Categories the deck was built from (empty = all words). */
  tags: string[];
  /** Whether words that came up in earlier games could be dealt again. */
  includePlayed: boolean;
}

export interface PlayedCard {
  cardId: string;
  outcome: CardOutcome;
}

export interface TurnRecord {
  round: number;
  teamId: string;
  narratorId: string;
  cards: PlayedCard[];
}

/** Wall-clock based so the timer survives re-renders, background tabs and page reloads. */
export type TurnClock = { status: 'running'; endsAt: number } | { status: 'paused'; remainingMs: number };

export type GamePhase =
  /** Waiting for the next narrator to start. */
  | { name: 'ready' }
  | { name: 'playing'; activeCardId: string; clock: TurnClock }
  /** Time is up: outcomes can be corrected before the turn is committed. */
  | { name: 'review' }
  | { name: 'finished' };

/** Complete, serializable game state. Only `gameReducer` changes it. */
export interface GameState {
  version: typeof GAME_STATE_VERSION;
  id: string;
  createdAt: number;
  settings: GameSettings;
  teams: Team[];
  /** Every card in this game's deck, by id. */
  cards: Record<string, Card>;
  /** Card ids still to be drawn, next card first. Refilled by reshuffling when empty. */
  drawPile: string[];
  /** PRNG state; randomness is seeded so the reducer stays pure. */
  seed: number;
  /** Current round, starting at 1. */
  round: number;
  /** Index of the team whose turn it is. */
  teamIndex: number;
  /** For each team, the index of its current narrator. */
  narratorIndexes: number[];
  /** Cards of the turn in progress (playing / review). */
  turnCards: PlayedCard[];
  history: TurnRecord[];
  phase: GamePhase;
}
