import type { GameStorage, Preferences } from '../../core/game/game-storage';
import type { GameSetup } from '../../core/game/setup';
import { GAME_STATE_VERSION, type GameState } from '../../core/game/types';

const KEYS = {
  game: 'tabu:game',
  setup: 'tabu:setup',
  preferences: 'tabu:preferences',
} as const;

const DEFAULT_PREFERENCES: Preferences = { muted: false };

/**
 * Browser adapter. Every access is guarded: storage can be missing (server rendering),
 * blocked (private mode) or full — the game then simply isn't persisted.
 */
export class LocalStorageGameStorage implements GameStorage {
  loadGame(): GameState | null {
    const game = this.read<GameState>(KEYS.game);
    return game?.version === GAME_STATE_VERSION ? game : null;
  }

  saveGame(game: GameState): void {
    this.write(KEYS.game, game);
  }

  clearGame(): void {
    try {
      this.storage()?.removeItem(KEYS.game);
    } catch {
      // ignore: nothing persisted
    }
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

  private storage(): Storage | null {
    try {
      return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
      return null;
    }
  }

  private read<T>(key: string): T | null {
    try {
      const raw = this.storage()?.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: unknown): void {
    try {
      this.storage()?.setItem(key, JSON.stringify(value));
    } catch {
      // quota exceeded or storage blocked: keep playing in memory
    }
  }
}
