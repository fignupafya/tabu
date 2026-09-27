import 'server-only';
import { createRepositories } from '@/adapters/create-repositories';
import { WordService } from '@/core/words/word-service';

let service: WordService | undefined;

/** Composition root: the single place where the server picks its adapters. */
export function getWordService(): WordService {
  if (!service) {
    const { words, played } = createRepositories();
    service = new WordService(words, played);
  }
  return service;
}
