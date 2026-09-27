import baseWordFile from '../../../data/words.json';
import { browserStorage } from '@/adapters/storage/key-value-store';
import { OverlayWordRepository } from '@/adapters/words/overlay-word-repository';
import { StoredPlayedWordRepository } from '@/adapters/words/stored-played-word-repository';
import { parseWordDocument, serializeWordFile } from '@/core/words/word-file';
import { WordService, WordServiceError } from '@/core/words/word-service';
import { BackendError, type Backend } from './types';

/**
 * Static build: the server's WordService running in the browser. The words shipped with the site
 * (data/words.json, bundled at build time) are the base; this device's changes and played list live in
 * local storage.
 */
export function createLocalBackend(): Backend {
  const words = new OverlayWordRepository(() => parseWordDocument(baseWordFile), browserStorage);
  const service = new WordService(words, new StoredPlayedWordRepository(browserStorage));

  return {
    listWords: () => service.listWords(),
    listTags: () => service.listTags(),
    deck: (options) => service.buildDeck(options),
    importWords: (data, options) => withBackendErrors(() => service.importWords(data, options)),
    createWord: (entry) => withBackendErrors(() => service.createWord(entry)),
    updateWord: (id, entry) => withBackendErrors(() => service.updateWord(id, entry)),
    deleteWord: (id) => withBackendErrors(() => service.deleteWord(id)),
    exportWords: async () => serializeWordFile(await service.listWords()),
    listPlayed: () => service.listPlayed(),
    markPlayed: (ids) => service.markPlayed(ids),
    unmarkPlayed: (id) => service.unmarkPlayed([id]),
    clearPlayed: () => service.clearPlayed(),
    resetWords: async () => words.reset(),
  };
}

/** Same errors as the HTTP backend, so the UI handles both alike. */
async function withBackendErrors<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof WordServiceError) throw new BackendError(error.message, error.details);
    throw error;
  }
}
