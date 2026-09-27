'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { IconButton } from './button';

/** Accessible modal on top of the native <dialog> element (focus trap and Esc for free). */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={cn(
        'm-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-white p-0 text-slate-900 shadow-2xl',
        'backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm dark:bg-slate-900 dark:text-slate-100',
        className,
      )}
    >
      {open && (
        <>
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 className="text-lg font-extrabold">{title}</h2>
            <IconButton label="Kapat" onClick={onClose}>
              <X className="size-5" />
            </IconButton>
          </div>
          <div className="max-h-[75dvh] overflow-y-auto p-5">{children}</div>
        </>
      )}
    </dialog>
  );
}
