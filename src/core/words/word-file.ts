import { DIFFICULTY_LEVELS } from './difficulty';
import { WORD_LIMITS, type WordEntry } from './word';
import { parseWordEntry } from './word-schema';

/**
 * The canonical JSON file format, shared by the JSON store, imports, exports and the CLI:
 *
 *   { "version": 1, "words": [ { "word": "Çay", "tags": ["içecek"],
 *       "taboo": { "easy": [...], "medium": [...], "hard": [...] } } ] }
 *
 * Imports also accept a bare array of entries.
 */
export const WORD_FILE_VERSION = 1;

export class WordFileError extends Error {
  constructor(
    message: string,
    readonly problems: string[] = [],
  ) {
    super(message);
    this.name = 'WordFileError';
  }
}

/** Returns the raw entries of `{ "words": [...] }` or a bare array; null for anything else. */
export function extractEntries(input: unknown): unknown[] | null {
  if (Array.isArray(input)) return input;
  if (typeof input === 'object' && input !== null && Array.isArray((input as { words?: unknown }).words)) {
    return (input as { words: unknown[] }).words;
  }
  return null;
}

/** Parses a whole word file and throws a WordFileError listing every invalid entry. */
export function parseWordFile(text: string): WordEntry[] {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new WordFileError(`Geçersiz JSON: ${(error as Error).message}`);
  }
  return parseWordDocument(json);
}

/** Same as `parseWordFile` for an already parsed document (e.g. the word file bundled into the static build). */
export function parseWordDocument(json: unknown): WordEntry[] {
  const raw = extractEntries(json);
  if (!raw) throw new WordFileError('Beklenen biçim: { "words": [ ... ] }');

  const entries: WordEntry[] = [];
  const problems: string[] = [];
  let invalidCount = 0;
  raw.forEach((item, index) => {
    const result = parseWordEntry(item);
    if (result.ok) {
      entries.push(result.entry);
    } else {
      invalidCount++;
      problems.push(...result.errors.map((e) => `#${index + 1} ${describeRawEntry(item)}: ${e}`));
    }
  });
  if (invalidCount > 0) throw new WordFileError(`${invalidCount} kayıt hatalı`, problems);
  return entries;
}

/** The `word` of a raw (possibly invalid) entry, if it has a usable one. */
export function rawWordOf(item: unknown): string | null {
  const word = (item as { word?: unknown } | null)?.word;
  return typeof word === 'string' && word.trim() ? word.trim() : null;
}

function describeRawEntry(item: unknown): string {
  const word = rawWordOf(item);
  return word ? `"${word}"` : '(kelime yok)';
}

/** One entry as a compact JSON block (lists on a single line), indented by `indent`. */
export function formatEntry(entry: WordEntry, indent = ''): string {
  const list = (items: string[]) => `[${items.map((item) => JSON.stringify(item)).join(', ')}]`;
  const levels = DIFFICULTY_LEVELS.map((level) => `    ${JSON.stringify(level)}: ${list(entry.taboo[level])}`);
  return [
    '{',
    `  "word": ${JSON.stringify(entry.word)},`,
    `  "tags": ${list(entry.tags)},`,
    '  "taboo": {',
    levels.join(',\n'),
    '  }',
    '}',
  ]
    .join('\n')
    .split('\n')
    .map((line) => indent + line)
    .join('\n');
}

/** Stable, diff-friendly formatting: one block per word, lists on a single line. */
export function serializeWordFile(entries: readonly WordEntry[], options: { schema?: string } = {}): string {
  const blocks = entries.map((entry) => formatEntry(entry, '    '));

  const header = [
    '{',
    ...(options.schema ? [`  "$schema": ${JSON.stringify(options.schema)},`] : []),
    `  "version": ${WORD_FILE_VERSION},`,
  ];
  const body = blocks.length > 0 ? ['  "words": [', blocks.join(',\n'), '  ]'] : ['  "words": []'];
  return [...header, ...body, '}', ''].join('\n');
}

/** JSON Schema of the file format, for editor autocompletion when writing word files by hand. */
export function wordFileJsonSchema(): Record<string, unknown> {
  const stringList = { type: 'array', items: { type: 'string', minLength: 1 } };
  const entry = {
    type: 'object',
    required: ['word', 'taboo'],
    properties: {
      word: { type: 'string', minLength: 1, maxLength: WORD_LIMITS.wordLength, description: 'Anlatılacak kelime' },
      tags: { ...stringList, description: 'Kategoriler. Bir kelime birden fazla kategoride olabilir.' },
      taboo: {
        description: `Yasaklı kelimeler. Seviyeler birikimlidir: ${DIFFICULTY_LEVELS.join(' ⊂ ')}. Düz dizi verilirse "${DIFFICULTY_LEVELS[0]}" sayılır.`,
        oneOf: [
          {
            type: 'object',
            additionalProperties: false,
            required: [DIFFICULTY_LEVELS[0]],
            properties: Object.fromEntries(DIFFICULTY_LEVELS.map((level) => [level, stringList])),
          },
          stringList,
        ],
      },
    },
  };

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Tabu kelime dosyası',
    oneOf: [
      {
        type: 'object',
        required: ['words'],
        properties: {
          $schema: { type: 'string' },
          version: { type: 'integer' },
          words: { type: 'array', items: entry },
        },
      },
      { type: 'array', items: entry },
    ],
  };
}
