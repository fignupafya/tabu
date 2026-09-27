import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { WordEntry } from '../../core/words/word';
import { JsonFilePlayedWordRepository } from './json-file-played-word-repository';
import { JsonFileWordRepository } from './json-file-word-repository';

const entry = (word: string, tags: string[] = []): WordEntry => ({
  word,
  tags,
  taboo: { easy: ['bir'], medium: [], hard: [] },
});

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'tabu-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('JsonFileWordRepository', () => {
  it('starts empty, writes a sorted file and reads it back', async () => {
    const file = path.join(dir, 'words.json');
    const repository = new JsonFileWordRepository(file);
    expect(await repository.list()).toEqual([]);

    await repository.saveChanges({ upsert: [entry('Zeytin'), entry('Çay', ['içecek']), entry('Ceviz')] });
    expect((await repository.list()).map((e) => e.word)).toEqual(['Ceviz', 'Çay', 'Zeytin']);
    expect(JSON.parse(await readFile(file, 'utf8')).words.map((e: WordEntry) => e.word)).toEqual([
      'Ceviz',
      'Çay',
      'Zeytin',
    ]);

    await repository.saveChanges({ remove: ['ceviz'] });
    expect((await new JsonFileWordRepository(file).getMany(['ceviz', 'çay'])).size).toBe(1);
  });

  it('sees changes made to the file by other programs', async () => {
    const file = path.join(dir, 'words.json');
    const repository = new JsonFileWordRepository(file);
    await repository.saveChanges({ upsert: [entry('Çay')] });
    expect(await repository.list()).toHaveLength(1);

    await writeFile(file, JSON.stringify({ words: [entry('Kahve'), entry('Çay'), entry('Su')] }), 'utf8');
    expect((await repository.list()).map((e) => e.word)).toEqual(['Çay', 'Kahve', 'Su']);
  });

  it('refuses a broken file instead of overwriting it', async () => {
    const file = path.join(dir, 'words.json');
    await writeFile(file, '{ "words": [ { "word": "" } ] }', 'utf8');
    await expect(new JsonFileWordRepository(file).list()).rejects.toThrow(/hatalı/);
  });
});

describe('JsonFilePlayedWordRepository', () => {
  it('adds idempotently, removes, clears and persists newest first', async () => {
    const file = path.join(dir, 'played.json');
    const repository = new JsonFilePlayedWordRepository(file);
    await repository.add([
      { id: 'çay', word: 'Çay', playedAt: '2026-01-01T10:00:00.000Z' },
      { id: 'kedi', word: 'Kedi', playedAt: '2026-01-02T10:00:00.000Z' },
    ]);
    await repository.add([{ id: 'çay', word: 'Çay', playedAt: '2026-03-03T10:00:00.000Z' }]);

    const reopened = new JsonFilePlayedWordRepository(file);
    expect(await reopened.list()).toEqual([
      { id: 'kedi', word: 'Kedi', playedAt: '2026-01-02T10:00:00.000Z' },
      { id: 'çay', word: 'Çay', playedAt: '2026-01-01T10:00:00.000Z' },
    ]);

    await reopened.remove(['kedi']);
    expect((await repository.list()).map((w) => w.id)).toEqual(['çay']);
    await repository.clear();
    expect(JSON.parse(await readFile(file, 'utf8')).played).toEqual([]);
  });
});
