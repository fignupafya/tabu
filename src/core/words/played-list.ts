import type { PlayedWord } from './played-word-repository';

/** List operations shared by the played-word adapters (file on the server, browser storage in the static build). */

export const newestFirst = (a: PlayedWord, b: PlayedWord) => b.playedAt.localeCompare(a.playedAt);

export function isPlayedWord(value: unknown): value is PlayedWord {
  const entry = value as Partial<PlayedWord> | null;
  return typeof entry?.id === 'string' && typeof entry.word === 'string' && typeof entry.playedAt === 'string';
}

/** Adds the words not in `current` yet (recorded ones keep their first date); `current` itself when nothing is new. */
export function withPlayed(current: PlayedWord[], words: PlayedWord[]): PlayedWord[] {
  const known = new Set(current.map((played) => played.id));
  const added: PlayedWord[] = [];
  for (const played of words) {
    if (known.has(played.id)) continue;
    known.add(played.id);
    added.push(played);
  }
  return added.length > 0 ? [...current, ...added] : current;
}

/** Drops the given ids; `current` itself when none of them is there. */
export function withoutPlayed(current: PlayedWord[], ids: string[]): PlayedWord[] {
  const removed = new Set(ids);
  const next = current.filter((played) => !removed.has(played.id));
  return next.length === current.length ? current : next;
}
