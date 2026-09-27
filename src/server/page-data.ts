import 'server-only';
import { connection } from 'next/server';
import type { WordService } from '@/core/words/word-service';
import { STATIC_EXPORT } from '@/lib/deployment';
import { getWordService } from './word-service';

/**
 * Data a page renders on the server, fresh for every request (words can change at any time).
 * Null in the static build, which is rendered once at build time: there the page loads it in the browser.
 */
export async function loadPageData<T>(load: (service: WordService) => Promise<T>): Promise<T | null> {
  if (STATIC_EXPORT) return null;
  await connection();
  return load(getWordService());
}
