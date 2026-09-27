import { cn } from '@/lib/cn';

/** `compact`: just the badge on narrow phones, for a header that needs the room. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-black tracking-tight', className)}>
      <span className="grid size-8 place-items-center rounded-[10px] bg-gradient-to-br from-violet-600 to-fuchsia-600 text-base text-white shadow-sm">
        T
      </span>
      <span className={cn(compact && 'max-[24rem]:sr-only')}>TABU</span>
    </span>
  );
}
