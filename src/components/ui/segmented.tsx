import { cn } from '@/lib/cn';

export interface SegmentedOption<T> {
  value: T;
  label: string;
  /** Optional second line in smaller text. */
  hint?: string;
}

/** Single choice among a few options, as a row of toggle buttons that shrink to fit narrow screens. */
export function Segmented<T extends string | number | null>({
  label,
  value,
  options,
  onChange,
  size = 'md',
}: {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-w-0 flex-1 rounded-lg px-1 font-bold transition',
              size === 'sm' ? 'py-1 text-xs' : 'py-1.5 text-sm',
              selected
                ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-950 dark:text-violet-300'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
            )}
          >
            <span className="block truncate">{option.label}</span>
            {option.hint && <span className="block truncate text-[11px] font-semibold opacity-70">{option.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
