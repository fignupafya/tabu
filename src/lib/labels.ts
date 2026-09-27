import type { CardOutcome } from '@/core/game/types';
import type { DifficultyLevel } from '@/core/words/difficulty';
import type { MergeStrategy } from '@/core/words/word-import';

export const DIFFICULTY_LABELS: Record<DifficultyLevel, { label: string; hint: string }> = {
  easy: { label: 'Kolay', hint: 'Sadece en bariz yasaklılar' },
  medium: { label: 'Orta', hint: 'Klasik tabu kartı' },
  hard: { label: 'Zor', hint: 'Bütün yasaklı kelimeler' },
};

/** Visual weight of a taboo word by the level that introduces it: core words are the strongest. */
export const LEVEL_STYLES: Record<DifficultyLevel, string> = {
  easy: 'bg-rose-600 text-white dark:bg-rose-500',
  medium: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
  hard: 'text-rose-700 ring-1 ring-inset ring-rose-200 dark:text-rose-300 dark:ring-rose-500/40',
};

export const OUTCOME_LABELS: Record<CardOutcome, string> = {
  correct: 'Doğru',
  taboo: 'Tabu',
  pass: 'Pas',
  timeout: 'Sayılmadı',
};

export const STRATEGY_LABELS: Record<MergeStrategy, { label: string; hint: string }> = {
  skip: { label: 'Atla', hint: 'Var olan kelimelere dokunma, sadece yenileri ekle' },
  merge: { label: 'Birleştir', hint: 'Var olanlara yeni etiketleri ve yasaklı kelimeleri ekle' },
  replace: { label: 'Üzerine yaz', hint: 'Var olanları dosyadaki haliyle değiştir' },
};
