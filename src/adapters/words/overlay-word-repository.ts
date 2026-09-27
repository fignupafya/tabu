import { compareText, sameEntry, wordId, type WordEntry } from '../../core/words/word';
import { countTags, matchesQuery, type WordQuery } from '../../core/words/word-query';
import type { WordChanges, WordRepository } from '../../core/words/word-repository';
import type { KeyValueStore } from '../storage/key-value-store';

/** This device's changes on top of the shipped words. */
interface Overlay {
  version: 1;
  /** Words added or edited here; they override shipped words with the same id. */
  upserted: WordEntry[];
  /** Ids of shipped words deleted here. */
  removed: string[];
}

const EMPTY_OVERLAY: Overlay = { version: 1, upserted: [], removed: [] };
const byWord = (a: WordEntry, b: WordEntry) => compareText(a.word, b.word);

/**
 * Words for the static build, where there is no server: the words shipped with the site are the base and
 * this device's additions, edits and deletions are kept as a small overlay in browser storage.
 * Clearing site data (or `reset`) brings back exactly the shipped words; words added to the site later
 * show up on the next visit, while this device's own changes stay applied.
 */
export class OverlayWordRepository implements WordRepository {
  private base: Promise<Map<string, WordEntry>> | undefined;
  private merged: { raw: string | null; words: Map<string, WordEntry> } | undefined;

  constructor(
    private readonly loadBase: () => WordEntry[] | Promise<WordEntry[]>,
    private readonly store: KeyValueStore,
    private readonly key = 'tabu:words',
  ) {}

  async list(query?: WordQuery): Promise<WordEntry[]> {
    return [...(await this.words()).values()].filter((entry) => matchesQuery(entry, query));
  }

  async getMany(ids: string[]): Promise<Map<string, WordEntry>> {
    const words = await this.words();
    return new Map(ids.flatMap((id) => (words.has(id) ? [[id, words.get(id)!] as const] : [])));
  }

  async tagCounts() {
    return countTags((await this.words()).values());
  }

  async saveChanges({ upsert = [], remove = [] }: WordChanges): Promise<void> {
    const base = await this.baseWords();
    const overlay = this.readOverlay();
    const upserted = new Map(overlay.upserted.map((entry) => [wordId(entry.word), entry]));
    const removed = new Set(overlay.removed);

    for (const id of remove) {
      upserted.delete(id);
      if (base.has(id)) removed.add(id);
    }
    for (const entry of upsert) {
      const id = wordId(entry.word);
      removed.delete(id);
      // Editing a word back to its shipped form needs no override, so later site updates reach it again.
      if (base.has(id) && sameEntry(base.get(id)!, entry)) upserted.delete(id);
      else upserted.set(id, entry);
    }

    const next: Overlay = { version: 1, upserted: [...upserted.values()], removed: [...removed] };
    if (next.upserted.length === 0 && next.removed.length === 0) this.store.remove(this.key);
    else this.store.set(this.key, JSON.stringify(next));
  }

  /** Forgets this device's changes: back to the shipped words. */
  reset(): void {
    this.store.remove(this.key);
  }

  private async words(): Promise<Map<string, WordEntry>> {
    const base = await this.baseWords();
    const raw = this.store.get(this.key);
    if (this.merged?.raw === raw) return this.merged.words;

    const overlay = this.readOverlay();
    const words = new Map(base);
    for (const id of overlay.removed) words.delete(id);
    for (const entry of overlay.upserted) words.set(wordId(entry.word), entry);
    const sorted = new Map([...words].sort(([, a], [, b]) => byWord(a, b)));
    this.merged = { raw, words: sorted };
    return sorted;
  }

  private baseWords(): Promise<Map<string, WordEntry>> {
    this.base ??= Promise.resolve(this.loadBase()).then(
      (entries) => new Map(entries.map((entry) => [wordId(entry.word), entry])),
    );
    return this.base;
  }

  private readOverlay(): Overlay {
    try {
      const parsed = JSON.parse(this.store.get(this.key) ?? 'null') as Partial<Overlay> | null;
      return parsed?.version === 1 && Array.isArray(parsed.upserted) && Array.isArray(parsed.removed)
        ? (parsed as Overlay)
        : EMPTY_OVERLAY;
    } catch {
      return EMPTY_OVERLAY;
    }
  }
}
