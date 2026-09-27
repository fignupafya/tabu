import type { DifficultyLevel } from './difficulty';
import type { PlayedWord, PlayedWordRepository } from './played-word-repository';
import { mergeEntries, sameEntry, toCard, wordId, type Card, type WordEntry } from './word';
import { extractEntries, rawWordOf } from './word-file';
import type { ImportOptions, ImportReport } from './word-import';
import type { WordQuery } from './word-query';
import type { WordRepository } from './word-repository';
import { parseWordEntry } from './word-schema';

export interface SavedWord {
  entry: WordEntry;
  warnings: string[];
}

export class WordServiceError extends Error {
  constructor(
    readonly code: 'invalid' | 'not_found' | 'conflict',
    message: string,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'WordServiceError';
  }
}

/** Use cases around words. Storage-agnostic: works with any adapters of the two ports. */
export class WordService {
  constructor(
    private readonly repository: WordRepository,
    private readonly played: PlayedWordRepository,
  ) {}

  listWords(query?: WordQuery): Promise<WordEntry[]> {
    return this.repository.list(query);
  }

  listTags() {
    return this.repository.tagCounts();
  }

  async getWord(id: string): Promise<WordEntry> {
    const entry = (await this.repository.getMany([id])).get(id);
    if (!entry) throw new WordServiceError('not_found', 'Kelime bulunamadı');
    return entry;
  }

  /**
   * Cards for a game: words having any of `tags` (all words when empty), taboo resolved for `difficulty`.
   * Words that already came up in earlier games are left out unless `includePlayed` is true (the default).
   */
  async buildDeck(options: { difficulty: DifficultyLevel; tags?: string[]; includePlayed?: boolean }): Promise<Card[]> {
    const [entries, played] = await Promise.all([
      this.repository.list({ tags: options.tags }),
      options.includePlayed === false ? this.played.list() : [],
    ]);
    const playedIds = new Set(played.map((word) => word.id));
    return entries
      .filter((entry) => !playedIds.has(wordId(entry.word)))
      .map((entry) => toCard(entry, options.difficulty));
  }

  listPlayed(): Promise<PlayedWord[]> {
    return this.played.list();
  }

  /** Records words that came up in a game. Unknown ids are ignored; already played words keep their date. */
  async markPlayed(ids: string[], at = new Date()): Promise<void> {
    const found = await this.repository.getMany([...new Set(ids.map(wordId))]);
    const playedAt = at.toISOString();
    await this.played.add([...found].map(([id, entry]) => ({ id, word: entry.word, playedAt })));
  }

  /** Lets these words come up in games again. */
  unmarkPlayed(ids: string[]): Promise<void> {
    return this.played.remove(ids.map(wordId));
  }

  clearPlayed(): Promise<void> {
    return this.played.clear();
  }

  /**
   * Imports `{ "words": [...] }` or a bare array. Invalid entries are reported and skipped,
   * valid ones are applied with `strategy` against existing words (and earlier duplicates in the same input).
   */
  async importWords(input: unknown, options: ImportOptions = {}): Promise<ImportReport> {
    const { strategy = 'skip', dryRun = false } = options;
    const rawEntries = extractEntries(input);
    if (!rawEntries) {
      throw new WordServiceError('invalid', 'Dosya biçimi tanınmadı', [
        'Beklenen biçim: { "words": [ ... ] } ya da doğrudan bir dizi [ ... ]',
      ]);
    }

    const report: ImportReport = {
      dryRun,
      strategy,
      total: rawEntries.length,
      added: [],
      updated: [],
      unchanged: [],
      skipped: [],
      invalid: [],
      warnings: [],
    };

    const valid: WordEntry[] = [];
    rawEntries.forEach((raw, index) => {
      const result = parseWordEntry(raw);
      if (!result.ok) {
        report.invalid.push({ index, word: rawWordOf(raw), errors: result.errors });
        return;
      }
      valid.push(result.entry);
      report.warnings.push(...result.warnings.map((message) => ({ word: result.entry.word, message })));
    });

    const current = await this.repository.getMany([...new Set(valid.map((entry) => wordId(entry.word)))]);
    const changed = new Map<string, WordEntry>();
    const addedIds = new Set<string>();

    for (const entry of valid) {
      const id = wordId(entry.word);
      const existing = current.get(id);
      if (!existing) {
        current.set(id, entry);
        changed.set(id, entry);
        addedIds.add(id);
        report.added.push(entry.word);
        continue;
      }
      if (strategy === 'skip') {
        report.skipped.push(entry.word);
        continue;
      }
      const next = strategy === 'merge' ? mergeEntries(existing, entry) : entry;
      if (sameEntry(existing, next)) {
        report.unchanged.push(entry.word);
        continue;
      }
      current.set(id, next);
      changed.set(id, next);
      if (!addedIds.has(id)) report.updated.push(entry.word);
    }

    if (!dryRun && changed.size > 0) {
      await this.repository.saveChanges({ upsert: [...changed.values()] });
    }
    return report;
  }

  async createWord(input: unknown): Promise<SavedWord> {
    const saved = this.parse(input);
    const id = wordId(saved.entry.word);
    if ((await this.repository.getMany([id])).has(id)) {
      throw new WordServiceError('conflict', `"${saved.entry.word}" zaten var`);
    }
    await this.repository.saveChanges({ upsert: [saved.entry] });
    return saved;
  }

  /** Replaces the word stored under `id`; renaming is allowed unless the new name is taken. */
  async updateWord(id: string, input: unknown): Promise<SavedWord> {
    const saved = this.parse(input);
    const newId = wordId(saved.entry.word);
    const found = await this.repository.getMany(newId === id ? [id] : [id, newId]);
    if (!found.has(id)) throw new WordServiceError('not_found', 'Kelime bulunamadı');
    if (newId !== id && found.has(newId)) {
      throw new WordServiceError('conflict', `"${saved.entry.word}" zaten var`);
    }
    await this.repository.saveChanges({ remove: newId === id ? [] : [id], upsert: [saved.entry] });
    return saved;
  }

  async deleteWord(id: string): Promise<void> {
    if (!(await this.repository.getMany([id])).has(id)) {
      throw new WordServiceError('not_found', 'Kelime bulunamadı');
    }
    await this.repository.saveChanges({ remove: [id] });
    await this.played.remove([id]);
  }

  private parse(input: unknown): SavedWord {
    const result = parseWordEntry(input);
    if (!result.ok) throw new WordServiceError('invalid', 'Kelime geçersiz', result.errors);
    return { entry: result.entry, warnings: result.warnings };
  }
}
