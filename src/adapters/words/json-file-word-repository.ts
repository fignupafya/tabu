import { promises as fs } from 'node:fs';
import path from 'node:path';
import { compareText, mergeEntries, wordId, type WordEntry } from '../../core/words/word';
import { parseWordFile, serializeWordFile } from '../../core/words/word-file';
import { countTags, matchesQuery, type WordQuery } from '../../core/words/word-query';
import type { WordChanges, WordRepository } from '../../core/words/word-repository';

/**
 * Keeps every word in one JSON file (data/words.json by default).
 *
 * Reads are cached until the file changes on disk, so hand edits and CLI changes show up
 * immediately. Writes are serialized, re-read the file first and replace it atomically.
 * Needs a writable file system: fine locally or on a VPS, not on serverless hosts.
 */
export class JsonFileWordRepository implements WordRepository {
  private cache: { mtimeMs: number; words: Map<string, WordEntry> } | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly filePath: string,
    private readonly schemaRef = './words.schema.json',
  ) {}

  async list(query?: WordQuery): Promise<WordEntry[]> {
    return [...(await this.read()).values()].filter((entry) => matchesQuery(entry, query));
  }

  async getMany(ids: string[]): Promise<Map<string, WordEntry>> {
    const words = await this.read();
    return new Map(ids.flatMap((id) => (words.has(id) ? [[id, words.get(id)!] as const] : [])));
  }

  async tagCounts() {
    return countTags((await this.read()).values());
  }

  saveChanges(changes: WordChanges): Promise<void> {
    const task = this.queue.then(() => this.write(changes));
    this.queue = task.catch(() => undefined);
    return task;
  }

  private async read(): Promise<Map<string, WordEntry>> {
    const stat = await fs.stat(this.filePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (!stat) return new Map();
    if (this.cache?.mtimeMs === stat.mtimeMs) return this.cache.words;

    const entries = parseWordFile(await fs.readFile(this.filePath, 'utf8'));
    entries.sort((a, b) => compareText(a.word, b.word));
    const words = new Map<string, WordEntry>();
    for (const entry of entries) {
      const id = wordId(entry.word);
      const duplicate = words.get(id);
      words.set(id, duplicate ? mergeEntries(duplicate, entry) : entry);
    }
    this.cache = { mtimeMs: stat.mtimeMs, words };
    return words;
  }

  private async write({ upsert = [], remove = [] }: WordChanges): Promise<void> {
    this.cache = null;
    const words = new Map(await this.read());
    for (const id of remove) words.delete(id);
    for (const entry of upsert) words.set(wordId(entry.word), entry);

    const sorted = [...words.values()].sort((a, b) => compareText(a.word, b.word));
    await writeFileAtomic(this.filePath, serializeWordFile(sorted, { schema: this.schemaRef }));
    this.cache = null;
  }
}

async function writeFileAtomic(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, content, 'utf8');
  try {
    await fs.rename(tempPath, filePath);
  } catch {
    // Windows refuses to replace a file another program holds open; fall back to a direct write.
    await fs.writeFile(filePath, content, 'utf8');
    await fs.rm(tempPath, { force: true });
  }
}
