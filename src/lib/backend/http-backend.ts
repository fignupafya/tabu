import type { PlayedWord } from '@/core/words/played-word-repository';
import type { Card, WordEntry } from '@/core/words/word';
import type { TagCount } from '@/core/words/word-query';
import { BackendError, type Backend } from './types';

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new BackendError(body?.error ?? `İstek başarısız (${response.status})`, body?.details ?? []);
  }
  return body as T;
}

const wordUrl = (id: string) => `/api/words/${encodeURIComponent(id)}`;

/** Server mode: the Next.js API routes — the only place the UI talks HTTP. */
export const httpBackend: Backend = {
  async listWords() {
    return (await request<{ words: WordEntry[] }>('/api/words')).words;
  },

  async listTags() {
    return (await request<{ tags: TagCount[] }>('/api/tags')).tags;
  },

  async deck(options) {
    const params = new URLSearchParams({ difficulty: options.difficulty });
    if (options.tags.length > 0) params.set('tags', options.tags.join(','));
    if (!options.includePlayed) params.set('includePlayed', '0');
    return (await request<{ cards: Card[] }>(`/api/deck?${params}`)).cards;
  },

  importWords(data, options) {
    return request('/api/words/import', { method: 'POST', body: JSON.stringify({ data, ...options }) });
  },

  createWord(entry) {
    return request('/api/words', { method: 'POST', body: JSON.stringify(entry) });
  },

  updateWord(id, entry) {
    return request(wordUrl(id), { method: 'PUT', body: JSON.stringify(entry) });
  },

  deleteWord(id) {
    return request(wordUrl(id), { method: 'DELETE' });
  },

  async exportWords() {
    const response = await fetch('/api/words/export');
    if (!response.ok) throw new BackendError(`Dışa aktarılamadı (${response.status})`);
    return response.text();
  },

  async listPlayed() {
    return (await request<{ played: PlayedWord[] }>('/api/played')).played;
  },

  markPlayed(ids) {
    return request('/api/played', { method: 'POST', body: JSON.stringify({ ids }) });
  },

  unmarkPlayed(id) {
    return request(`/api/played/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  clearPlayed() {
    return request('/api/played', { method: 'DELETE' });
  },
};
