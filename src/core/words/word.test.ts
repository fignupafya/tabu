import { describe, expect, it } from 'vitest';
import { mergeEntries, normalizeEntry, tabooWordsFor, wordId, type WordEntry } from './word';
import { parseWordEntry } from './word-schema';
import { parseWordFile, serializeWordFile } from './word-file';

const cay: WordEntry = {
  word: 'Çay',
  tags: ['içecek'],
  taboo: { easy: ['demlik', 'bardak', 'sıcak'], medium: ['Rize', 'şeker'], hard: ['kahve', 'içmek'] },
};

describe('tabooWordsFor', () => {
  it('adds the words of every easier level', () => {
    expect(tabooWordsFor(cay, 'easy')).toEqual(['demlik', 'bardak', 'sıcak']);
    expect(tabooWordsFor(cay, 'medium')).toEqual(['demlik', 'bardak', 'sıcak', 'Rize', 'şeker']);
    expect(tabooWordsFor(cay, 'hard')).toHaveLength(7);
  });
});

describe('wordId', () => {
  it('follows Turkish casing and keeps dotted/dotless i apart', () => {
    expect(wordId('  IRMAK ')).toBe('ırmak');
    expect(wordId('İstanbul')).toBe('istanbul');
    expect(wordId('Kır')).not.toBe(wordId('Kir'));
  });
});

describe('normalizeEntry', () => {
  it('keeps a repeated taboo word on the easiest level and drops the card word itself', () => {
    const { entry, warnings } = normalizeEntry({
      word: ' Çay ',
      tags: ['İçecek', 'içecek'],
      taboo: { easy: ['bardak', 'ÇAY'], medium: ['Bardak', 'şeker'], hard: [] },
    });
    expect(entry).toEqual({ word: 'Çay', tags: ['içecek'], taboo: { easy: ['bardak'], medium: ['şeker'], hard: [] } });
    expect(warnings).toHaveLength(2);
  });
});

describe('mergeEntries', () => {
  it('unions tags and taboo words, keeping the existing spelling', () => {
    const merged = mergeEntries(cay, {
      word: 'çay',
      tags: ['türkiye'],
      taboo: { easy: ['şeker', 'semaver'], medium: [], hard: [] },
    });
    expect(merged.word).toBe('Çay');
    expect(merged.tags).toEqual(['içecek', 'türkiye']);
    expect(merged.taboo.easy).toEqual(['demlik', 'bardak', 'sıcak', 'şeker', 'semaver']);
    expect(merged.taboo.medium).toEqual(['Rize']);
  });
});

describe('parseWordEntry', () => {
  it('treats a plain taboo list as the easiest level and fills missing levels', () => {
    const result = parseWordEntry({ word: 'Kahve', tags: ['İçecek'], taboo: ['fincan', ' telve '] });
    expect(result).toEqual({
      ok: true,
      entry: { word: 'Kahve', tags: ['içecek'], taboo: { easy: ['fincan', 'telve'], medium: [], hard: [] } },
      warnings: [],
    });
  });

  it('rejects unknown levels, an empty first level and a missing word', () => {
    const result = parseWordEntry({ word: '', taboo: { medium: ['x'], expert: ['y'] } });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join('\n')).toMatch(/word/);
      expect(result.errors.join('\n')).toMatch(/expert/);
      expect(result.errors.join('\n')).toMatch(/easy/);
    }
  });
});

describe('word file', () => {
  it('round-trips through serialize and parse', () => {
    const text = serializeWordFile([cay], { schema: './words.schema.json' });
    expect(parseWordFile(text)).toEqual([cay]);
    expect(JSON.parse(text).$schema).toBe('./words.schema.json');
  });

  it('lists every invalid entry', () => {
    expect(() => parseWordFile('{"words":[{"word":"A"},{"word":"B","taboo":["x"]},{}]}')).toThrow(/2 kayıt hatalı/);
  });
});
