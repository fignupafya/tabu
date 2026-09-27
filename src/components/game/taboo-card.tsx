import type { Card } from '@/core/words/word';
import { cn } from '@/lib/cn';

export function TabooCard({ card, concealed = false }: { card: Card; concealed?: boolean }) {
  return (
    <div
      aria-hidden={concealed}
      className={cn(
        'w-full max-w-sm animate-card-in overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10',
        concealed && 'blur-xl select-none',
      )}
    >
      <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 px-5 py-7 text-center">
        <h2
          className={cn(
            'font-black break-words text-white uppercase',
            card.word.length > 24 ? 'text-xl' : card.word.length > 14 ? 'text-2xl' : 'text-4xl',
          )}
        >
          {card.word}
        </h2>
      </div>
      <ul className="divide-y divide-slate-100 px-5 py-1 dark:divide-slate-800">
        {card.taboo.map((word) => (
          <li key={word} className="py-2 text-center text-lg font-bold text-rose-600 dark:text-rose-400">
            {word}
          </li>
        ))}
      </ul>
    </div>
  );
}
