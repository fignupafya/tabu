import { compareText, normalizeText, type WordEntry } from './word';

export interface WordQuery {
  /** Keep words that have at least one of these tags. Empty or missing = all words. */
  tags?: string[];
  /** Case-insensitive substring of the word. */
  search?: string;
}

export interface TagCount {
  tag: string;
  count: number;
}

/** Shared filtering semantics so every repository adapter answers queries the same way. */
export function matchesQuery(entry: WordEntry, query: WordQuery = {}): boolean {
  const tags = query.tags?.map(normalizeText).filter(Boolean) ?? [];
  if (tags.length > 0 && !entry.tags.some((tag) => tags.includes(tag))) return false;

  const needle = query.search ? normalizeText(query.search) : '';
  return !needle || normalizeText(entry.word).includes(needle);
}

/** Tags with the number of words carrying them, most used first. */
export function countTags(entries: Iterable<WordEntry>): TagCount[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const tag of entry.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || compareText(a.tag, b.tag));
}
