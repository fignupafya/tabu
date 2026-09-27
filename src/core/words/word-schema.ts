import { z } from 'zod';
import { tr } from 'zod/locales';
import { DIFFICULTY_LEVELS, type DifficultyLevel } from './difficulty';
import { WORD_LIMITS, cleanText, normalizeEntry, normalizeText, type WordEntry } from './word';

z.config(tr());

const FIRST_LEVEL = DIFFICULTY_LEVELS[0];

const text = (max: number) =>
  z.string().overwrite(cleanText).min(1, 'Boş olamaz').max(max, `En fazla ${max} karakter olabilir`);

const tag = z
  .string()
  .overwrite(normalizeText)
  .min(1, 'Boş etiket olamaz')
  .max(WORD_LIMITS.tagLength, `Etiket en fazla ${WORD_LIMITS.tagLength} karakter olabilir`);

const tabooList = z
  .array(text(WORD_LIMITS.tabooLength))
  .max(WORD_LIMITS.tabooPerLevel, `Bir seviyede en fazla ${WORD_LIMITS.tabooPerLevel} yasaklı kelime olabilir`)
  .default([]);

const tabooByLevel = z.strictObject(
  Object.fromEntries(DIFFICULTY_LEVELS.map((level) => [level, tabooList])) as Record<
    DifficultyLevel,
    typeof tabooList
  >,
  {
    error: (issue) =>
      issue.code === 'unrecognized_keys'
        ? `Bilinmeyen zorluk seviyesi: ${issue.keys.join(', ')} (geçerli: ${DIFFICULTY_LEVELS.join(', ')})`
        : undefined,
  },
);

/** Accepts `{ "easy": [...], "medium": [...] }` or a plain array, which becomes the first level. */
const taboo = z
  .preprocess((value) => (Array.isArray(value) ? { [FIRST_LEVEL]: value } : value), tabooByLevel)
  .refine((levels) => levels[FIRST_LEVEL].length > 0, {
    message: `"${FIRST_LEVEL}" seviyesinde en az bir yasaklı kelime olmalı`,
    path: [FIRST_LEVEL],
  });

export const wordEntrySchema = z.object({
  word: text(WORD_LIMITS.wordLength),
  tags: z.array(tag).max(WORD_LIMITS.tagsPerWord, `En fazla ${WORD_LIMITS.tagsPerWord} etiket olabilir`).default([]),
  taboo,
});

export type ParsedEntry =
  | { ok: true; entry: WordEntry; warnings: string[] }
  | { ok: false; errors: string[] };

/** Validates one raw entry (from a file, the API or a form) and canonicalizes it. */
export function parseWordEntry(input: unknown): ParsedEntry {
  const result = wordEntrySchema.safeParse(input);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((issue) =>
        issue.path.length > 0 ? `${formatPath(issue.path)}: ${issue.message}` : issue.message,
      ),
    };
  }
  return { ok: true, ...normalizeEntry(result.data) };
}

function formatPath(path: PropertyKey[]): string {
  return path
    .map((part, i) => (typeof part === 'number' ? `[${part}]` : `${i > 0 ? '.' : ''}${String(part)}`))
    .join('');
}
