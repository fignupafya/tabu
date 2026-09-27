import { useSyncExternalStore } from 'react';
import { LocalStorageGameStorage } from '@/adapters/storage/local-storage-game-storage';
import { gameReducer, type GameAction } from '@/core/game/engine';
import type { GameStorage } from '@/core/game/game-storage';
import type { GameState } from '@/core/game/types';

/** Keeps the current game in memory and persists every change through the GameStorage port. */
export class GameStore {
  /** undefined until first read (storage is only readable in the browser). */
  private game: GameState | null | undefined;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly storage: GameStorage) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): GameState | null => {
    if (this.game === undefined) this.game = this.storage.loadGame();
    return this.game;
  };

  dispatch = (action: GameAction) => {
    const current = this.getSnapshot();
    if (!current) return;
    const next = gameReducer(current, action);
    if (next !== current) this.set(next);
  };

  start = (game: GameState) => this.set(game);

  clear = () => {
    this.storage.clearGame();
    this.game = null;
    this.emit();
  };

  private set(game: GameState) {
    this.game = game;
    this.storage.saveGame(game);
    this.emit();
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }
}

// Client-side composition root: swap the storage adapter here.
export const gameStorage: GameStorage = new LocalStorageGameStorage();
export const gameStore = new GameStore(gameStorage);

/** The saved game: undefined before hydration, null when there is none. */
export function useGame(): GameState | null | undefined {
  return useSyncExternalStore(gameStore.subscribe, gameStore.getSnapshot, () => undefined);
}
