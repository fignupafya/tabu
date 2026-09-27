import path from 'node:path';
import type { PlayedWordRepository } from '../core/words/played-word-repository';
import type { WordRepository } from '../core/words/word-repository';
import { JsonFilePlayedWordRepository } from './words/json-file-played-word-repository';
import { JsonFileWordRepository } from './words/json-file-word-repository';

export const DEFAULT_WORDS_FILE = path.join(process.cwd(), 'data', 'words.json');
export const DEFAULT_PLAYED_FILE = path.join(process.cwd(), 'data', 'played.json');

export interface Repositories {
  words: WordRepository;
  played: PlayedWordRepository;
}

/**
 * Picks the storage adapters from the environment: WORD_STORE selects the store,
 * WORDS_FILE / PLAYED_FILE move the JSON files. To add a store (SQLite, Postgres, a remote API…),
 * implement the ports and add a case here.
 */
export function createRepositories(env: NodeJS.ProcessEnv = process.env): Repositories {
  const store = env.WORD_STORE ?? 'json';
  switch (store) {
    case 'json':
      return {
        words: new JsonFileWordRepository(env.WORDS_FILE ? path.resolve(env.WORDS_FILE) : DEFAULT_WORDS_FILE),
        played: new JsonFilePlayedWordRepository(env.PLAYED_FILE ? path.resolve(env.PLAYED_FILE) : DEFAULT_PLAYED_FILE),
      };
    default:
      throw new Error(`Bilinmeyen WORD_STORE: "${store}" (desteklenen: json)`);
  }
}
