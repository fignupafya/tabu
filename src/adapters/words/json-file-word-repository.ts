import { compareText, mergeEntries, wordId, type WordEntry } from '../../core/words/word';
import { parseWordFile, serializeWordFile } from '../../core/words/word-file';
import { countTags, matchesQuery, type WordQuery } from '../../core/words/word-query';
import type { WordChanges, WordRepository } from '../../core/words/word-repository';
import { JsonFile } from '../json-file';

type WordMap = Map<string, WordEntry>;

const byWord = (a: WordEntry, b: WordEntry) => compareText(a.word, b.word);

/** Keeps every word in one JSON file (data/words.json by default), sorted and diff-friendly. */
export class JsonFileWordRepository implements WordRepository {
  private readonly file: JsonFile<WordMap>;

  constructor(filePath: string, schemaRef = './words.schema.json') {
    this.file = new JsonFile(filePath, {
      parse: (text) => toWordMap(parseWordFile(text)),
      serialize: (words) => serializeWordFile([...words.values()].sort(byWord), { schema: schemaRef }),
      empty: () => new Map(),
    });
  }

  async list(query?: WordQuery): Promise<WordEntry[]> {
    return [...(await this.file.read()).values()].filter((entry) => matchesQuery(entry, query));
  }

  async getMany(ids: string[]): Promise<Map<string, WordEntry>> {
    const words = await this.file.read();
    return new Map(ids.flatMap((id) => (words.has(id) ? [[id, words.get(id)!] as const] : [])));
  }

  async tagCounts() {
    return countTags((await this.file.read()).values());
  }

  saveChanges({ upsert = [], remove = [] }: WordChanges): Promise<void> {
    return this.file.update((current) => {
      const words = new Map(current);
      for (const id of remove) words.delete(id);
      for (const entry of upsert) words.set(wordId(entry.word), entry);
      return words;
    });
  }
}

/** Words by id in alphabetical order; duplicates in a hand-edited file are merged. */
function toWordMap(entries: WordEntry[]): WordMap {
  const words: WordMap = new Map();
  for (const entry of [...entries].sort(byWord)) {
    const id = wordId(entry.word);
    const duplicate = words.get(id);
    words.set(id, duplicate ? mergeEntries(duplicate, entry) : entry);
  }
  return words;
}
