import type { DifficultyLevel } from '@/core/words/difficulty';
import type { Card, WordEntry } from '@/core/words/word';
import type { ImportReport, MergeStrategy } from '@/core/words/word-import';
import type { SavedWord } from '@/core/words/word-service';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(body?.error ?? `İstek başarısız (${response.status})`, response.status, body?.details ?? []);
  }
  return body as T;
}

const wordUrl = (id: string) => `/api/words/${encodeURIComponent(id)}`;

/** Typed client for the backend API — the only place the UI talks HTTP. */
export const api = {
  async deck(options: { difficulty: DifficultyLevel; tags: string[]; includePlayed: boolean }): Promise<Card[]> {
    const params = new URLSearchParams({ difficulty: options.difficulty });
    if (options.tags.length > 0) params.set('tags', options.tags.join(','));
    if (!options.includePlayed) params.set('includePlayed', '0');
    return (await request<{ cards: Card[] }>(`/api/deck?${params}`)).cards;
  },

  /** Idempotent: sending words that are already recorded is harmless. */
  markPlayed(ids: string[]): Promise<void> {
    return request('/api/played', { method: 'POST', body: JSON.stringify({ ids }) });
  },

  unmarkPlayed(id: string): Promise<void> {
    return request(`/api/played/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  clearPlayed(): Promise<void> {
    return request('/api/played', { method: 'DELETE' });
  },

  importWords(data: unknown, options: { strategy: MergeStrategy; dryRun: boolean }): Promise<ImportReport> {
    return request('/api/words/import', { method: 'POST', body: JSON.stringify({ data, ...options }) });
  },

  createWord(entry: WordEntry): Promise<SavedWord> {
    return request('/api/words', { method: 'POST', body: JSON.stringify(entry) });
  },

  updateWord(id: string, entry: WordEntry): Promise<SavedWord> {
    return request(wordUrl(id), { method: 'PUT', body: JSON.stringify(entry) });
  },

  deleteWord(id: string): Promise<void> {
    return request(wordUrl(id), { method: 'DELETE' });
  },

  exportUrl: '/api/words/export',
};
