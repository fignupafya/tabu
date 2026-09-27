import type { DifficultyLevel } from '@/core/words/difficulty';
import type { PlayedWord } from '@/core/words/played-word-repository';
import type { Card, WordEntry } from '@/core/words/word';
import type { ImportReport, MergeStrategy } from '@/core/words/word-import';
import type { TagCount } from '@/core/words/word-query';
import type { SavedWord } from '@/core/words/word-service';

/**
 * What the UI needs from "the backend" — the port the components depend on. Two adapters: HTTP to the
 * Next.js API (server mode) and the same WordService running in the browser on local storage (static build).
 */
export interface Backend {
  listWords(): Promise<WordEntry[]>;
  listTags(): Promise<TagCount[]>;
  deck(options: { difficulty: DifficultyLevel; tags: string[]; includePlayed: boolean }): Promise<Card[]>;
  importWords(data: unknown, options: { strategy: MergeStrategy; dryRun: boolean }): Promise<ImportReport>;
  createWord(entry: WordEntry): Promise<SavedWord>;
  updateWord(id: string, entry: WordEntry): Promise<SavedWord>;
  deleteWord(id: string): Promise<void>;
  /** Every word as a file in the import format. */
  exportWords(): Promise<string>;
  listPlayed(): Promise<PlayedWord[]>;
  /** Idempotent: sending words that are already recorded is harmless. */
  markPlayed(ids: string[]): Promise<void>;
  unmarkPlayed(id: string): Promise<void>;
  clearPlayed(): Promise<void>;
  /** Static build only: drops this device's word changes, back to the words shipped with the site. */
  resetWords?(): Promise<void>;
}

/** A failed backend call with user-facing messages (e.g. validation errors per field). */
export class BackendError extends Error {
  constructor(
    message: string,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'BackendError';
  }
}

/** Lines to show for a failed call. */
export function errorMessages(error: unknown, fallback: string): string[] {
  return error instanceof BackendError ? [error.message, ...error.details] : [fallback];
}
