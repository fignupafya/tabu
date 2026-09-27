import type { GameStorage, Preferences } from '../../core/game/game-storage';
import type { GameSetup } from '../../core/game/setup';
import { GAME_STATE_VERSION, type GameState } from '../../core/game/types';
import { browserStorage, type KeyValueStore } from './key-value-store';

const KEYS = {
  game: 'tabu:game',
  setup: 'tabu:setup',
  preferences: 'tabu:preferences',
} as const;

const DEFAULT_PREFERENCES: Preferences = { muted: false };

/**
 * Browser adapter. Storage can be missing (server rendering), blocked (private mode) or full —
 * the game then simply isn't persisted.
 */
export class LocalStorageGameStorage implements GameStorage {
  constructor(private readonly store: KeyValueStore = browserStorage) {}

  loadGame(): GameState | null {
    const game = this.read<GameState>(KEYS.game);
    return game?.version === GAME_STATE_VERSION ? game : null;
  }

  saveGame(game: GameState): void {
    this.write(KEYS.game, game);
  }

  clearGame(): void {
    this.store.remove(KEYS.game);
  }

  loadSetup(): GameSetup | null {
    return this.read<GameSetup>(KEYS.setup);
  }

  saveSetup(setup: GameSetup): void {
    this.write(KEYS.setup, setup);
  }

  loadPreferences(): Preferences {
    return { ...DEFAULT_PREFERENCES, ...this.read<Partial<Preferences>>(KEYS.preferences) };
  }

  savePreferences(preferences: Preferences): void {
    this.write(KEYS.preferences, preferences);
  }

  private read<T>(key: string): T | null {
    try {
      const raw = this.store.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: unknown): void {
    try {
      this.store.set(key, JSON.stringify(value));
    } catch {
      // storage full or blocked: keep playing in memory
    }
  }
}
