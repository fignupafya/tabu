import { DIFFICULTY_LEVELS, levelsUpTo, type DifficultyLevel } from './difficulty';

/** Taboo words grouped by the difficulty level that introduces them. */
export type TabooByLevel = Record<DifficultyLevel, string[]>;

/** A word as stored and exchanged in JSON files. */
export interface WordEntry {
  word: string;
  /** Categories; a word can belong to any number of them. */
  tags: string[];
  taboo: TabooByLevel;
}

/** A word resolved for one difficulty level, ready to be played. */
export interface Card {
  id: string;
  word: string;
  taboo: string[];
}

export const WORD_LIMITS = {
  wordLength: 40,
  tabooLength: 40,
  tagLength: 30,
  tagsPerWord: 10,
  tabooPerLevel: 15,
} as const;

const collator = new Intl.Collator('tr');

/** Trims, collapses inner whitespace and applies Unicode NFC. */
export function cleanText(text: string): string {
  return text.normalize('NFC').trim().replace(/\s+/g, ' ');
}

/** Case-insensitive canonical form using Turkish casing rules ("I" → "ı", "İ" → "i"). */
export function normalizeText(text: string): string {
  return cleanText(text).toLocaleLowerCase('tr-TR');
}

/** Identity of a word: entries with the same id are the same card. */
export function wordId(word: string): string {
  return normalizeText(word);
}

/** Turkish alphabetical order (C < Ç < D …). */
export function compareText(a: string, b: string): number {
  return collator.compare(a, b);
}

export function emptyTaboo(): TabooByLevel {
  return Object.fromEntries(DIFFICULTY_LEVELS.map((level) => [level, []])) as unknown as TabooByLevel;
}

/** Taboo words that apply at `level`: its own plus those of every easier level. */
export function tabooWordsFor(entry: WordEntry, level: DifficultyLevel): string[] {
  return levelsUpTo(level).flatMap((l) => entry.taboo[l]);
}

export function toCard(entry: WordEntry, level: DifficultyLevel): Card {
  return { id: wordId(entry.word), word: entry.word, taboo: tabooWordsFor(entry, level) };
}

/**
 * Canonicalizes an entry: cleans whitespace, dedupes tags and taboo words, keeps a taboo word
 * listed on several levels only on the easiest one and drops taboo words equal to the card word.
 */
export function normalizeEntry(entry: WordEntry): { entry: WordEntry; warnings: string[] } {
  const warnings: string[] = [];
  const cardId = wordId(entry.word);
  const seen = new Set<string>();
  const taboo = emptyTaboo();

  for (const level of DIFFICULTY_LEVELS) {
    for (const raw of entry.taboo[level]) {
      const word = cleanText(raw);
      const key = normalizeText(word);
      if (!key) continue;
      if (key === cardId) {
        warnings.push(`"${word}" kartın kendisi olduğu için yasaklılardan çıkarıldı`);
      } else if (seen.has(key)) {
        warnings.push(`"${word}" birden fazla kez yazılmış, en kolay seviyede bir kez tutuldu`);
      } else {
        seen.add(key);
        taboo[level].push(word);
      }
    }
  }

  const tags = [...new Set(entry.tags.map(normalizeText).filter(Boolean))];
  return { entry: { word: cleanText(entry.word), tags, taboo }, warnings };
}

/** Union of tags and taboo words; a taboo word present on several levels keeps the easiest. */
export function mergeEntries(base: WordEntry, incoming: WordEntry): WordEntry {
  const taboo = emptyTaboo();
  for (const level of DIFFICULTY_LEVELS) {
    taboo[level] = [...base.taboo[level], ...incoming.taboo[level]];
  }
  return normalizeEntry({ word: base.word, tags: [...base.tags, ...incoming.tags], taboo }).entry;
}

export function sameEntry(a: WordEntry, b: WordEntry): boolean {
  const sameList = (x: string[], y: string[]) => x.length === y.length && x.every((v, i) => v === y[i]);
  return (
    a.word === b.word &&
    sameList(a.tags, b.tags) &&
    DIFFICULTY_LEVELS.every((level) => sameList(a.taboo[level], b.taboo[level]))
  );
}
