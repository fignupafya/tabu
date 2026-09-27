import type { PlayedWord, PlayedWordRepository } from '../../core/words/played-word-repository';

/** Non-persistent adapter, used by tests. */
export class InMemoryPlayedWordRepository implements PlayedWordRepository {
  private readonly played = new Map<string, PlayedWord>();

  async list(): Promise<PlayedWord[]> {
    return [...this.played.values()].sort((a, b) => b.playedAt.localeCompare(a.playedAt));
  }

  async add(words: PlayedWord[]): Promise<void> {
    for (const word of words) if (!this.played.has(word.id)) this.played.set(word.id, word);
  }

  async remove(ids: string[]): Promise<void> {
    for (const id of ids) this.played.delete(id);
  }

  async clear(): Promise<void> {
    this.played.clear();
  }
}
