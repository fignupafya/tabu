import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Toggleable category chip; the check mark signals that several can be selected at once. */
export function TagChip({
  selected,
  onClick,
  count,
  size = 'md',
  children,
}: {
  selected: boolean;
  onClick: () => void;
  count?: number;
  size?: 'sm' | 'md';
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-bold transition',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        selected
          ? 'bg-violet-600 text-white shadow-sm'
          : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-violet-300 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700',
      )}
    >
      {selected && <Check className={size === 'sm' ? 'size-3' : 'size-3.5'} strokeWidth={3} />}
      {children}
      {count !== undefined && <span className="opacity-60">{count}</span>}
    </button>
  );
}
