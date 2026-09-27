import { isPlayedWord, newestFirst, withPlayed, withoutPlayed } from '../../core/words/played-list';
import type { PlayedWord, PlayedWordRepository } from '../../core/words/played-word-repository';
import type { KeyValueStore } from '../storage/key-value-store';

/** The played list in key-value storage: browser storage in the static build, memory in tests. */
export class StoredPlayedWordRepository implements PlayedWordRepository {
  constructor(
    private readonly store: KeyValueStore,
    private readonly key = 'tabu:played',
  ) {}

  async list(): Promise<PlayedWord[]> {
    return [...this.read()].sort(newestFirst);
  }

  async add(words: PlayedWord[]): Promise<void> {
    this.write((current) => withPlayed(current, words));
  }

  async remove(ids: string[]): Promise<void> {
    this.write((current) => withoutPlayed(current, ids));
  }

  async clear(): Promise<void> {
    this.store.remove(this.key);
  }

  private read(): PlayedWord[] {
    try {
      const parsed: unknown = JSON.parse(this.store.get(this.key) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter(isPlayedWord) : [];
    } catch {
      return [];
    }
  }

  private write(change: (current: PlayedWord[]) => PlayedWord[]): void {
    const current = this.read();
    const next = change(current);
    if (next !== current) this.store.set(this.key, JSON.stringify(next));
  }
}
