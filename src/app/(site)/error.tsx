'use client';

import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <TriangleAlert className="mx-auto size-10 text-amber-500" />
      <h1 className="mt-4 text-2xl font-black">Bir şeyler ters gitti</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">{error.message}</p>
      <p className="mt-4 text-sm text-slate-500">
        Kelime dosyasını elle düzenlediysen şu komutla kontrol edebilirsin:{' '}
        <code className="rounded bg-slate-200 px-1.5 py-0.5 dark:bg-slate-800">npm run words -- check</code>
      </p>
      <Button variant="primary" className="mt-6" onClick={reset}>
        Tekrar dene
      </Button>
    </main>
  );
}
