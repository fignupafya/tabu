/** Minimal synchronous key-value storage, so browser storage can be swapped for memory in tests. */
export interface KeyValueStore {
  get(key: string): string | null;
  /** Throws when the value can't be stored (storage full or blocked). */
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** `window.localStorage`; reads never throw (missing or blocked storage reads as empty). */
export const browserStorage: KeyValueStore = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    window.localStorage.setItem(key, value);
  },
  remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // nothing stored
    }
  },
};

export function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const values = new Map(Object.entries(initial));
  return {
    get: (key) => values.get(key) ?? null,
    set: (key, value) => void values.set(key, value),
    remove: (key) => void values.delete(key),
  };
}
