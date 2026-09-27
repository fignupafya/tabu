// Import contract, kept apart from the service so the browser can use it without bundling zod.

/** What to do when an imported word already exists. */
export const MERGE_STRATEGIES = ['skip', 'merge', 'replace'] as const;
export type MergeStrategy = (typeof MERGE_STRATEGIES)[number];

export interface ImportOptions {
  strategy?: MergeStrategy;
  /** Report what would change without writing anything. */
  dryRun?: boolean;
}

export interface ImportReport {
  dryRun: boolean;
  strategy: MergeStrategy;
  total: number;
  added: string[];
  updated: string[];
  unchanged: string[];
  skipped: string[];
  invalid: { index: number; word: string | null; errors: string[] }[];
  warnings: { word: string; message: string }[];
}
