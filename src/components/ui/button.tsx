import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-violet-600 text-white shadow-sm hover:bg-violet-500 active:bg-violet-700',
  secondary:
    'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'bg-rose-600 text-white hover:bg-rose-500',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3 text-sm',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-6 text-base',
};

/** Button look, also usable on links. */
export function buttonClasses(variant: Variant = 'secondary', size: Size = 'md', className?: string): string {
  return cn(
    'inline-flex shrink-0 items-center justify-center rounded-xl font-bold transition select-none',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500',
    'disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClasses(variant, size, className)} {...props} />;
}

export function IconButton({ label, className, ...props }: ComponentProps<'button'> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800',
        'focus-visible:outline-2 focus-visible:outline-violet-500 disabled:opacity-40',
        'dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
        className,
      )}
      {...props}
    />
  );
}
