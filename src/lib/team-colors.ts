export interface TeamColor {
  dot: string;
  text: string;
  soft: string;
  ring: string;
  solid: string;
}

// Full class names so Tailwind can see them.
const COLORS: TeamColor[] = [
  {
    dot: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    soft: 'bg-rose-50 dark:bg-rose-500/10',
    ring: 'ring-rose-500',
    solid: 'bg-rose-500 text-white',
  },
  {
    dot: 'bg-sky-500',
    text: 'text-sky-600 dark:text-sky-400',
    soft: 'bg-sky-50 dark:bg-sky-500/10',
    ring: 'ring-sky-500',
    solid: 'bg-sky-500 text-white',
  },
  {
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    soft: 'bg-amber-50 dark:bg-amber-500/10',
    ring: 'ring-amber-500',
    solid: 'bg-amber-500 text-white',
  },
  {
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    soft: 'bg-emerald-50 dark:bg-emerald-500/10',
    ring: 'ring-emerald-500',
    solid: 'bg-emerald-500 text-white',
  },
];

export const DEFAULT_TEAM_NAMES = ['Kırmızı Takım', 'Mavi Takım', 'Sarı Takım', 'Yeşil Takım'];

export function teamColor(index: number): TeamColor {
  return COLORS[index % COLORS.length];
}
