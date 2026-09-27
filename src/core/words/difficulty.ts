/**
 * Difficulty levels, ordered from easiest to hardest.
 *
 * Taboo words are cumulative: a level forbids its own words plus those of every easier level,
 * so "hard" = easy + medium + hard. Adding a level here is enough for the schema, CLI and game
 * to pick it up (the UI will ask for a label via its typed label map).
 */
export const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'] as const;

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export function isDifficultyLevel(value: unknown): value is DifficultyLevel {
  return typeof value === 'string' && (DIFFICULTY_LEVELS as readonly string[]).includes(value);
}

/** The levels whose taboo words are active when playing at `level`. */
export function levelsUpTo(level: DifficultyLevel): DifficultyLevel[] {
  return DIFFICULTY_LEVELS.slice(0, DIFFICULTY_LEVELS.indexOf(level) + 1);
}
