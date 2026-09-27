import { cn } from '@/lib/cn';

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-black tracking-tight', className)}>
      <span className="grid size-8 place-items-center rounded-[10px] bg-gradient-to-br from-violet-600 to-fuchsia-600 text-base text-white shadow-sm">
        T
      </span>
      TABU
    </span>
  );
}
