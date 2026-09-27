import type { WordEntry } from './word';
import type { TagCount, WordQuery } from './word-query';

export interface WordChanges {
  /** Inserted, or overwritten when an entry with the same id exists. */
  upsert?: WordEntry[];
  /** Ids (see `wordId`) to delete. */
  remove?: string[];
}

/**
 * Port for word storage. The app, the API and the CLI only depend on this interface;
 * adapters implement it (a JSON file today — a database or remote API later).
 */
export interface WordRepository {
  /** Matching words in Turkish alphabetical order. */
  list(query?: WordQuery): Promise<WordEntry[]>;
  /** Found entries by id; unknown ids are absent from the map. */
  getMany(ids: string[]): Promise<Map<string, WordEntry>>;
  /** Applies all changes together (atomically where the store supports it). */
  saveChanges(changes: WordChanges): Promise<void>;
  tagCounts(): Promise<TagCount[]>;
}
