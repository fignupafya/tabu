'use client';

import { useState } from 'react';
import { MERGE_STRATEGIES, type ImportReport, type MergeStrategy } from '@/core/words/word-import';
import { ApiError, api } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { STRATEGY_LABELS } from '@/lib/labels';
import { Button } from '../ui/button';
import { Label, Textarea } from '../ui/input';
import { Segmented } from '../ui/segmented';
import { ErrorList } from './error-list';

const EXAMPLE = `{
  "words": [
    {
      "word": "Çay",
      "tags": ["içecek", "türkiye"],
      "taboo": {
        "easy": ["demlik", "bardak", "sıcak"],
        "medium": ["Rize", "şeker"],
        "hard": ["kahve", "içmek"]
      }
    }
  ]
}`;

/** Upload or paste a word file, preview what would change (dry run), then import. */
export function ImportPanel({ onImported, onClose }: { onImported: () => void; onClose: () => void }) {
  const [text, setText] = useState('');
  const [strategy, setStrategy] = useState<MergeStrategy>('skip');
  const [preview, setPreview] = useState<ImportReport | null>(null);
  const [result, setResult] = useState<ImportReport | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const changeInput = (next: string) => {
    setText(next);
    setPreview(null);
    setErrors([]);
  };

  async function run(dryRun: boolean) {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch (error) {
      setErrors([`Geçersiz JSON: ${(error as Error).message}`]);
      return;
    }
    setBusy(true);
    setErrors([]);
    try {
      const report = await api.importWords(data, { strategy, dryRun });
      if (dryRun) {
        setPreview(report);
      } else {
        setResult(report);
        onImported();
      }
    } catch (error) {
      setErrors(error instanceof ApiError ? [error.message, ...error.details] : ['İçe aktarılamadı']);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <ReportView report={result} />
        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Tamam
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <details className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
        <summary className="cursor-pointer font-bold">Dosya biçimi</summary>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{EXAMPLE}</pre>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-300">
          <li>
            <code>easy</code> her modda yasaktır; <code>medium</code> orta ve zor modda, <code>hard</code> sadece zor
            modda eklenir. Zor mod = hepsi.
          </li>
          <li>Bir kelime birden fazla kategoride olabilir. Sadece <code>word</code> ve <code>taboo.easy</code> zorunlu.</li>
          <li>
            <code>taboo</code> düz bir liste de olabilir; o zaman hepsi <code>easy</code> sayılır.
          </li>
        </ul>
      </details>

      <div>
        <Label htmlFor="import-file">JSON dosyası</Label>
        <input
          id="import-file"
          type="file"
          accept=".json,application/json"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) changeInput(await file.text());
          }}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-2 file:font-bold file:text-violet-700 dark:text-slate-300 dark:file:bg-violet-500/20 dark:file:text-violet-200"
        />
      </div>

      <div>
        <Label htmlFor="import-text">…ya da içeriği yapıştır</Label>
        <Textarea
          id="import-text"
          rows={7}
          value={text}
          onChange={(event) => changeInput(event.target.value)}
          placeholder='{ "words": [ … ] }'
          className="font-mono text-xs"
          spellCheck={false}
        />
      </div>

      <div>
        <p className="mb-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">Zaten var olan kelimeler</p>
        <Segmented
          label="Zaten var olan kelimeler"
          value={strategy}
          options={MERGE_STRATEGIES.map((value) => ({ value, label: STRATEGY_LABELS[value].label }))}
          onChange={(value) => {
            setStrategy(value);
            setPreview(null);
          }}
        />
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{STRATEGY_LABELS[strategy].hint}</p>
      </div>

      <ErrorList messages={errors} />
      {preview && <ReportView report={preview} />}

      <div className="flex justify-end gap-2">
        <Button onClick={() => run(true)} disabled={!text.trim() || busy}>
          Önizle
        </Button>
        <Button variant="primary" onClick={() => run(false)} disabled={!text.trim() || busy}>
          İçe aktar
        </Button>
      </div>
    </div>
  );
}

function ReportView({ report }: { report: ImportReport }) {
  const planned = report.dryRun;
  const groups: [label: string, words: string[], className: string][] = [
    [planned ? 'Eklenecek' : 'Eklendi', report.added, 'text-emerald-600 dark:text-emerald-400'],
    [planned ? 'Güncellenecek' : 'Güncellendi', report.updated, 'text-sky-600 dark:text-sky-400'],
    ['Değişmeyen', report.unchanged, 'text-slate-500'],
    [planned ? 'Atlanacak (zaten var)' : 'Atlandı (zaten var)', report.skipped, 'text-amber-600 dark:text-amber-400'],
  ];

  return (
    <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
      <p className="font-black">
        {planned ? 'Önizleme' : 'İçe aktarıldı'} · {report.total} kayıt
      </p>
      {groups
        .filter(([, words]) => words.length > 0)
        .map(([label, words, className]) => (
          <details key={label}>
            <summary className={cn('cursor-pointer font-bold', className)}>
              {label}: {words.length}
            </summary>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{words.join(', ')}</p>
          </details>
        ))}
      {report.invalid.length > 0 && (
        <details open>
          <summary className="cursor-pointer font-bold text-rose-600 dark:text-rose-400">
            Hatalı (alınmayacak): {report.invalid.length}
          </summary>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
            {report.invalid.map((item) => (
              <li key={item.index}>
                #{item.index + 1} {item.word ?? '(kelime yok)'}: {item.errors.join('; ')}
              </li>
            ))}
          </ul>
        </details>
      )}
      {report.warnings.length > 0 && (
        <details>
          <summary className="cursor-pointer font-bold text-slate-500">Uyarılar: {report.warnings.length}</summary>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
            {report.warnings.map((warning, index) => (
              <li key={index}>
                {warning.word}: {warning.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
