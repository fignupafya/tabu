/** A word that already came up in a game. New decks leave it out unless the players opt in. */
export interface PlayedWord {
  /** Same id as the word (`wordId`). */
  id: string;
  /** Display form, kept so the list stays readable even if the word is renamed or deleted later. */
  word: string;
  /** ISO timestamp of the first time it came up. */
  playedAt: string;
}

/** Port for the list of words that came up in games (a JSON file today, a database later). */
export interface PlayedWordRepository {
  /** Newest first. */
  list(): Promise<PlayedWord[]>;
  /** Records words not yet in the list; words already there keep their first date (idempotent). */
  add(words: PlayedWord[]): Promise<void>;
  remove(ids: string[]): Promise<void>;
  clear(): Promise<void>;
}
