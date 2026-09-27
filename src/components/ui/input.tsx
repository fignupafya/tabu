import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

// 16px on phones: smaller inputs make mobile browsers zoom in on focus.
const FIELD =
  'w-full rounded-xl bg-slate-50 px-3 text-base sm:text-sm ring-1 ring-slate-200 outline-none transition placeholder:text-slate-400 ' +
  'focus:bg-white focus:ring-2 focus:ring-violet-500 dark:bg-slate-800 dark:ring-slate-700 dark:placeholder:text-slate-500 dark:focus:bg-slate-900';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(FIELD, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(FIELD, 'py-2 leading-relaxed', className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300', className)} {...props} />;
}
