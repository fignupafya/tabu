import { describe, expect, it } from 'vitest';
import type { WordEntry } from '../../core/words/word';
import { memoryStore } from '../storage/key-value-store';
import { OverlayWordRepository } from './overlay-word-repository';
import { StoredPlayedWordRepository } from './stored-played-word-repository';

const entry = (word: string, easy = ['bir']): WordEntry => ({ word, tags: [], taboo: { easy, medium: [], hard: [] } });
const words = async (repository: OverlayWordRepository) => (await repository.list()).map((e) => e.word);

describe('OverlayWordRepository', () => {
  const shipped = [entry('Çay'), entry('Kahve'), entry('Su')];

  it('adds, edits and deletes on top of the shipped words without touching them', async () => {
    const store = memoryStore();
    const repository = new OverlayWordRepository(() => shipped, store);

    await repository.saveChanges({ upsert: [entry('Ayran'), entry('Çay', ['demlik'])], remove: ['su'] });
    expect(await words(repository)).toEqual(['Ayran', 'Çay', 'Kahve']);
    expect((await repository.getMany(['çay'])).get('çay')?.taboo.easy).toEqual(['demlik']);
    expect(shipped.map((e) => e.word)).toEqual(['Çay', 'Kahve', 'Su']);

    // A fresh instance (next visit) reads the same changes from storage.
    expect(await words(new OverlayWordRepository(() => shipped, store))).toEqual(['Ayran', 'Çay', 'Kahve']);
  });

  it('keeps no override for words edited back to their shipped form, and resets to the shipped words', async () => {
    const store = memoryStore();
    const repository = new OverlayWordRepository(() => shipped, store);
    await repository.saveChanges({ upsert: [entry('Kahve', ['fincan'])] });
    await repository.saveChanges({ upsert: [entry('Kahve')] });
    expect(store.get('tabu:words')).toBeNull();

    await repository.saveChanges({ upsert: [entry('Ayran')], remove: ['çay'] });
    repository.reset();
    expect(await words(repository)).toEqual(['Çay', 'Kahve', 'Su']);
  });

  it('renames a shipped word and brings in words added to the site later', async () => {
    const store = memoryStore();
    await new OverlayWordRepository(() => shipped, store).saveChanges({
      remove: ['çay'],
      upsert: [entry('Türk çayı')],
    });

    const updatedSite = [...shipped, entry('Boza')];
    expect(await words(new OverlayWordRepository(() => updatedSite, store))).toEqual([
      'Boza',
      'Kahve',
      'Su',
      'Türk çayı',
    ]);
  });

  it('ignores a corrupted overlay instead of failing', async () => {
    const repository = new OverlayWordRepository(() => shipped, memoryStore({ 'tabu:words': '{nope' }));
    expect(await words(repository)).toEqual(['Çay', 'Kahve', 'Su']);
  });
});

describe('StoredPlayedWordRepository', () => {
  it('adds idempotently, removes and clears', async () => {
    const store = memoryStore();
    const repository = new StoredPlayedWordRepository(store);
    await repository.add([
      { id: 'çay', word: 'Çay', playedAt: '2026-01-01T10:00:00.000Z' },
      { id: 'su', word: 'Su', playedAt: '2026-01-02T10:00:00.000Z' },
    ]);
    await repository.add([{ id: 'çay', word: 'Çay', playedAt: '2026-05-05T10:00:00.000Z' }]);
    expect((await new StoredPlayedWordRepository(store).list()).map((w) => `${w.id}@${w.playedAt.slice(5, 10)}`)).toEqual([
      'su@01-02',
      'çay@01-01',
    ]);

    await repository.remove(['su']);
    expect((await repository.list()).map((w) => w.id)).toEqual(['çay']);
    await repository.clear();
    expect(await repository.list()).toEqual([]);
  });
});
