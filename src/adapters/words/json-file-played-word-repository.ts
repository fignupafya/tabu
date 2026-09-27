import type { PlayedWord, PlayedWordRepository } from '../../core/words/played-word-repository';
import { JsonFile } from '../json-file';

const newestFirst = (a: PlayedWord, b: PlayedWord) => b.playedAt.localeCompare(a.playedAt);

/**
 * Keeps the words that came up in games in data/played.json:
 * { "version": 1, "played": [{ "id": "çay", "word": "Çay", "playedAt": "2026-09-27T18:04:00.000Z" }] }
 * It is per-installation game state, not content, so it isn't committed to git.
 */
export class JsonFilePlayedWordRepository implements PlayedWordRepository {
  private readonly file: JsonFile<PlayedWord[]>;

  constructor(filePath: string) {
    this.file = new JsonFile(filePath, { parse: parsePlayedFile, serialize: serializePlayedFile, empty: () => [] });
  }

  async list(): Promise<PlayedWord[]> {
    return [...(await this.file.read())].sort(newestFirst);
  }

  add(words: PlayedWord[]): Promise<void> {
    return this.file.update((current) => {
      const known = new Set(current.map((played) => played.id));
      const added: PlayedWord[] = [];
      for (const played of words) {
        if (known.has(played.id)) continue;
        known.add(played.id);
        added.push(played);
      }
      return added.length > 0 ? [...current, ...added] : current;
    });
  }

  remove(ids: string[]): Promise<void> {
    const removed = new Set(ids);
    return this.file.update((current) => {
      const next = current.filter((played) => !removed.has(played.id));
      return next.length === current.length ? current : next;
    });
  }

  clear(): Promise<void> {
    return this.file.update((current) => (current.length > 0 ? [] : current));
  }
}

function parsePlayedFile(text: string): PlayedWord[] {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error(`Çıkan kelimeler dosyası okunamadı: ${(error as Error).message}`);
  }
  const entries = (json as { played?: unknown })?.played;
  if (!Array.isArray(entries)) return [];
  // Skip malformed rows instead of failing: this list is a convenience, not content.
  return entries.filter(
    (entry): entry is PlayedWord =>
      typeof entry?.id === 'string' && typeof entry?.word === 'string' && typeof entry?.playedAt === 'string',
  );
}

function serializePlayedFile(played: PlayedWord[]): string {
  const rows = [...played]
    .sort(newestFirst)
    .map(({ id, word, playedAt }) => `    ${JSON.stringify({ id, word, playedAt })}`);
  return `{\n  "version": 1,\n  "played": [\n${rows.join(',\n')}\n  ]\n}\n`;
}
