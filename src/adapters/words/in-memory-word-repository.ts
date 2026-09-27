import { compareText, wordId, type WordEntry } from '../../core/words/word';
import { countTags, matchesQuery, type WordQuery } from '../../core/words/word-query';
import type { WordChanges, WordRepository } from '../../core/words/word-repository';

/** Non-persistent adapter, used by tests and handy as a template for new adapters. */
export class InMemoryWordRepository implements WordRepository {
  private readonly words = new Map<string, WordEntry>();

  constructor(initial: WordEntry[] = []) {
    for (const entry of initial) this.words.set(wordId(entry.word), entry);
  }

  async list(query?: WordQuery): Promise<WordEntry[]> {
    return [...this.words.values()]
      .filter((entry) => matchesQuery(entry, query))
      .sort((a, b) => compareText(a.word, b.word));
  }

  async getMany(ids: string[]): Promise<Map<string, WordEntry>> {
    return new Map(ids.flatMap((id) => (this.words.has(id) ? [[id, this.words.get(id)!] as const] : [])));
  }

  async saveChanges({ upsert = [], remove = [] }: WordChanges): Promise<void> {
    for (const id of remove) this.words.delete(id);
    for (const entry of upsert) this.words.set(wordId(entry.word), entry);
  }

  async tagCounts() {
    return countTags(this.words.values());
  }
}
