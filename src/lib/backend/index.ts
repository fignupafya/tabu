import { httpBackend } from './http-backend';
import type { Backend } from './types';

export { BackendError, errorMessages, type Backend } from './types';

/**
 * The backend the UI talks to. The static build loads the in-browser one on first use; the env check is written
 * inline (not via STATIC_EXPORT) so the bundler drops it from server-mode bundles along with zod and the words.
 */
export const backend: Backend =
  process.env.NEXT_PUBLIC_STATIC_EXPORT === '1'
    ? lazyBackend(() => import('./local-backend').then((module) => module.createLocalBackend()))
    : httpBackend;

function lazyBackend(load: () => Promise<Backend>): Backend {
  let instance: Promise<Backend> | undefined;
  const get = () => (instance ??= load());
  return {
    listWords: async () => (await get()).listWords(),
    listTags: async () => (await get()).listTags(),
    deck: async (options) => (await get()).deck(options),
    importWords: async (data, options) => (await get()).importWords(data, options),
    createWord: async (entry) => (await get()).createWord(entry),
    updateWord: async (id, entry) => (await get()).updateWord(id, entry),
    deleteWord: async (id) => (await get()).deleteWord(id),
    exportWords: async () => (await get()).exportWords(),
    listPlayed: async () => (await get()).listPlayed(),
    markPlayed: async (ids) => (await get()).markPlayed(ids),
    unmarkPlayed: async (id) => (await get()).unmarkPlayed(id),
    clearPlayed: async () => (await get()).clearPlayed(),
    resetWords: async () => (await get()).resetWords?.(),
  };
}
