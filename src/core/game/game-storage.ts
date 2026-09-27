import type { GameSetup } from './setup';
import type { GameState } from './types';

export interface Preferences {
  muted: boolean;
}

/**
 * Port for persisting the game on the device playing it, so a refresh or a locked phone
 * doesn't lose the game. Adapters: localStorage today; e.g. a server session for multi-device play.
 */
export interface GameStorage {
  loadGame(): GameState | null;
  saveGame(game: GameState): void;
  clearGame(): void;
  /** Last used teams and settings, to prefill the next game. */
  loadSetup(): GameSetup | null;
  saveSetup(setup: GameSetup): void;
  loadPreferences(): Preferences;
  savePreferences(preferences: Preferences): void;
}
