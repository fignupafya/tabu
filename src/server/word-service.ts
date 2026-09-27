import 'server-only';
import { createWordRepository } from '@/adapters/words/create-word-repository';
import { WordService } from '@/core/words/word-service';

let service: WordService | undefined;

/** Composition root: the single place where the server picks its adapters. */
export function getWordService(): WordService {
  service ??= new WordService(createWordRepository());
  return service;
}
