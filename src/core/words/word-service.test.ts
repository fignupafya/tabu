import { describe, expect, it } from 'vitest';
import { InMemoryWordRepository } from '../../adapters/words/in-memory-word-repository';
import type { WordEntry } from './word';
import { WordService, WordServiceError } from './word-service';

const cay: WordEntry = {
  word: 'Çay',
  tags: ['içecek', 'türkiye'],
  taboo: { easy: ['demlik', 'bardak', 'sıcak'], medium: ['Rize', 'şeker'], hard: ['kahve', 'içmek'] },
};
const kedi: WordEntry = {
  word: 'Kedi',
  tags: ['hayvan'],
  taboo: { easy: ['miyav', 'fare'], medium: ['tüy'], hard: [] },
};

const setup = () => new WordService(new InMemoryWordRepository([cay, kedi]));

describe('WordService.importWords', () => {
  it('adds new words, skips existing ones by default and reports invalid entries', async () => {
    const service = setup();
    const report = await service.importWords({
      words: [
        { word: 'ÇAY', taboo: ['semaver'] },
        { word: 'Kahve', tags: ['içecek'], taboo: { easy: ['fincan', 'telve'] } },
        { word: '', taboo: [] },
      ],
    });
    expect(report.added).toEqual(['Kahve']);
    expect(report.skipped).toEqual(['ÇAY']);
    expect(report.invalid.map((item) => item.index)).toEqual([2]);
    expect((await service.listWords()).map((entry) => entry.word)).toEqual(['Çay', 'Kahve', 'Kedi']);
  });

  it('merges new tags and taboo words into existing words', async () => {
    const service = setup();
    const report = await service.importWords([{ word: 'çay', tags: ['sabah'], taboo: { easy: ['semaver'], hard: ['Rize'] } }], {
      strategy: 'merge',
    });
    expect(report.updated).toEqual(['çay']);
    const [entry] = await service.listWords({ search: 'çay' });
    expect(entry.tags).toEqual(['içecek', 'türkiye', 'sabah']);
    expect(entry.taboo.easy).toContain('semaver');
    expect(entry.taboo.hard).toEqual(['kahve', 'içmek']);
  });

  it('replaces existing words and recognizes identical ones as unchanged', async () => {
    const service = setup();
    const report = await service.importWords([{ word: 'Kedi', taboo: ['patili'] }, cay], { strategy: 'replace' });
    expect(report.updated).toEqual(['Kedi']);
    expect(report.unchanged).toEqual(['Çay']);
    expect((await service.getWord('kedi')).taboo.easy).toEqual(['patili']);
  });

  it('writes nothing on a dry run', async () => {
    const service = setup();
    const report = await service.importWords([{ word: 'Kahve', taboo: ['fincan'] }], { dryRun: true });
    expect(report.added).toEqual(['Kahve']);
    expect(await service.listWords()).toHaveLength(2);
  });

  it('applies the strategy to duplicates inside the same file', async () => {
    const service = setup();
    const report = await service.importWords(
      [
        { word: 'Kahve', taboo: ['fincan'] },
        { word: 'kahve', taboo: ['telve'] },
      ],
      { strategy: 'merge' },
    );
    expect(report.added).toEqual(['Kahve']);
    expect(report.updated).toEqual([]);
    expect((await service.getWord('kahve')).taboo.easy).toEqual(['fincan', 'telve']);
  });

  it('rejects inputs that are not a word list', async () => {
    await expect(setup().importWords({ foo: 1 })).rejects.toBeInstanceOf(WordServiceError);
  });
});

describe('WordService.buildDeck', () => {
  it('filters by any of the tags and resolves cumulative taboo words', async () => {
    const deck = await setup().buildDeck({ difficulty: 'medium', tags: ['türkiye', 'bilim'] });
    expect(deck).toEqual([{ id: 'çay', word: 'Çay', taboo: ['demlik', 'bardak', 'sıcak', 'Rize', 'şeker'] }]);
  });

  it('uses every word when no tag is selected', async () => {
    expect(await setup().buildDeck({ difficulty: 'easy' })).toHaveLength(2);
  });
});

describe('WordService single word operations', () => {
  it('creates, renames and deletes words', async () => {
    const service = setup();
    await service.createWord({ word: 'Kahve', taboo: ['fincan'] });
    await expect(service.createWord({ word: 'KAHVE', taboo: ['x'] })).rejects.toMatchObject({ code: 'conflict' });

    await service.updateWord('kahve', { word: 'Türk kahvesi', taboo: ['fincan', 'telve'] });
    await expect(service.getWord('kahve')).rejects.toMatchObject({ code: 'not_found' });
    await expect(service.updateWord('türk kahvesi', { word: 'Kedi', taboo: ['x'] })).rejects.toMatchObject({
      code: 'conflict',
    });

    await service.deleteWord('türk kahvesi');
    expect((await service.listWords()).map((entry) => entry.word)).toEqual(['Çay', 'Kedi']);
  });

  it('reports validation errors', async () => {
    await expect(setup().createWord({ word: 'X', taboo: { easy: [] } })).rejects.toMatchObject({ code: 'invalid' });
  });
});
