import path from 'node:path';
import type { WordRepository } from '../../core/words/word-repository';
import { JsonFileWordRepository } from './json-file-word-repository';

export const DEFAULT_WORDS_FILE = path.join(process.cwd(), 'data', 'words.json');

/**
 * Picks the word storage adapter from the environment.
 * To add a store (SQLite, Postgres, a remote API…): implement WordRepository and add a case here.
 */
export function createWordRepository(env: NodeJS.ProcessEnv = process.env): WordRepository {
  const store = env.WORD_STORE ?? 'json';
  switch (store) {
    case 'json':
      return new JsonFileWordRepository(env.WORDS_FILE ? path.resolve(env.WORDS_FILE) : DEFAULT_WORDS_FILE);
    default:
      throw new Error(`Bilinmeyen WORD_STORE: "${store}" (desteklenen: json)`);
  }
}
