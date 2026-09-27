import { DIFFICULTY_LEVELS, type DifficultyLevel } from '@/core/words/difficulty';
import type { PlayedWord } from '@/core/words/played-word-repository';
import { tabooWordsFor, wordId, type WordEntry } from '@/core/words/word';
import { countTags, type TagCount } from '@/core/words/word-query';

/** What the game setup needs to know about the words (built on the server or in the browser). */
export interface DeckInfo {
  tags: TagCount[];
  /** Every word's tags and whether it already came up, to size the deck for any selection. */
  words: { tags: string[]; played: boolean }[];
  /** Average number of taboo words per card at each level. */
  tabooAverages: Record<DifficultyLevel, number>;
}

export function buildDeckInfo(words: WordEntry[], played: PlayedWord[]): DeckInfo {
  const playedIds = new Set(played.map((word) => word.id));
  const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
  return {
    tags: countTags(words),
    words: words.map((entry) => ({ tags: entry.tags, played: playedIds.has(wordId(entry.word)) })),
    tabooAverages: Object.fromEntries(
      DIFFICULTY_LEVELS.map((level) => [level, average(words.map((entry) => tabooWordsFor(entry, level).length))]),
    ) as Record<DifficultyLevel, number>,
  };
}
