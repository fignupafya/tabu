'use client';

import { Download, FileUp, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { DIFFICULTY_LEVELS } from '@/core/words/difficulty';
import { wordId, type WordEntry } from '@/core/words/word';
import { matchesQuery, type TagCount } from '@/core/words/word-query';
import { backend, errorMessages } from '@/lib/backend';
import { cn } from '@/lib/cn';
import { STATIC_EXPORT } from '@/lib/deployment';
import { downloadTextFile } from '@/lib/download';
import { useLoadedData } from '@/lib/hooks';
import { DIFFICULTY_LABELS, LEVEL_STYLES } from '@/lib/labels';
import { Button, IconButton } from '../ui/button';
import { Input } from '../ui/input';
import { Modal } from '../ui/modal';
import { TagChip } from '../ui/tag-chip';
import { ImportPanel } from './import-panel';
import { WordForm } from './word-form';

const PAGE_SIZE = 60;

type Dialog = { type: 'create' } | { type: 'edit'; entry: WordEntry } | { type: 'import' } | null;

interface WordData {
  words: WordEntry[];
  tags: TagCount[];
}

const loadWords = async (): Promise<WordData> => {
  const [words, tags] = await Promise.all([backend.listWords(), backend.listTags()]);
  return { words, tags };
};

/** Words rendered by the server (server mode) or loaded in the browser (static build). */
export function WordManager({ initial }: { initial: WordData | null }) {
  const { data, error, reload } = useLoadedData(initial, loadWords);
  if (error) {
    return <p className="rounded-2xl bg-rose-50 p-4 font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>;
  }
  if (!data) return <p className="text-slate-500 dark:text-slate-400">Kelimeler yükleniyor…</p>;
  return <WordBrowser words={data.words} tags={data.tags} onChanged={reload} />;
}

function WordBrowser({ words, tags, onChanged }: WordData & { onChanged: () => void }) {
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [dialog, setDialog] = useState<Dialog>(null);
  const query = useDeferredValue(search);

  const filtered = useMemo(
    () => words.filter((entry) => matchesQuery(entry, { search: query, tags: selectedTags })),
    [words, query, selectedTags],
  );

  const close = () => setDialog(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]));
    setLimit(PAGE_SIZE);
  };

  const remove = async (entry: WordEntry) => {
    if (!window.confirm(`"${entry.word}" silinsin mi?`)) return;
    try {
      await backend.deleteWord(wordId(entry.word));
      onChanged();
    } catch (error) {
      window.alert(errorMessages(error, 'Silinemedi').join('\n'));
    }
  };

  const exportWords = async () => {
    try {
      const date = new Date().toISOString().slice(0, 10);
      downloadTextFile(await backend.exportWords(), `tabu-kelimeler-${date}.json`);
    } catch (error) {
      window.alert(errorMessages(error, 'Dışa aktarılamadı').join('\n'));
    }
  };

  const resetWords = async () => {
    const confirmed = window.confirm(
      'Bu cihazda eklenen, düzenlenen ve silinen kelimeler geri alınsın mı? Liste sitedeki haline döner.',
    );
    if (!confirmed || !backend.resetWords) return;
    await backend.resetWords();
    onChanged();
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Kelimeler</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            {words.length} kelime · {tags.length} kategori
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => setDialog({ type: 'create' })}>
            <Plus className="size-4" /> Yeni kelime
          </Button>
          <Button onClick={() => setDialog({ type: 'import' })}>
            <FileUp className="size-4" /> JSON içe aktar
          </Button>
          <Button onClick={exportWords}>
            <Download className="size-4" /> Dışa aktar
          </Button>
        </div>
      </div>

      {STATIC_EXPORT && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200 sm:flex-row sm:items-center sm:justify-between dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-500/30">
          <p>
            Bu sürümde kelimelerde yaptığın değişiklikler sadece bu tarayıcıda saklanır. Site verilerini temizlersen
            ya da değişiklikleri sıfırlarsan sitedeki kelime listesine dönülür.
          </p>
          <Button size="sm" onClick={resetWords}>
            <RotateCcw className="size-4" /> Değişiklikleri sıfırla
          </Button>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-bold">Zorluk birikimlidir:</span>
        {DIFFICULTY_LEVELS.map((level, index) => (
          <span key={level} className="flex items-center gap-1">
            <span className={cn('rounded-md px-1.5 py-0.5 font-bold', LEVEL_STYLES[level])}>
              {DIFFICULTY_LABELS[level].label}
            </span>
            {index === 0 ? 'her modda yasak' : 'bu modda eklenir'}
          </span>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setLimit(PAGE_SIZE);
            }}
            placeholder="Kelime ara…"
            aria-label="Kelime ara"
            className="pl-9"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              <strong>Kategoriler</strong> · birden fazla seçebilirsin
            </span>
            {selectedTags.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTags([]);
                  setLimit(PAGE_SIZE);
                }}
                className="font-bold text-violet-600 hover:underline dark:text-violet-400"
              >
                Temizle ({selectedTags.length})
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(({ tag, count }) => (
              <TagChip
                key={tag}
                size="sm"
                selected={selectedTags.includes(tag)}
                onClick={() => toggleTag(tag)}
                count={count}
              >
                {tag}
              </TagChip>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 mb-2 text-sm font-bold text-slate-500 dark:text-slate-400">{filtered.length} sonuç</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, limit).map((entry) => (
          <WordTile
            key={wordId(entry.word)}
            entry={entry}
            onEdit={() => setDialog({ type: 'edit', entry })}
            onDelete={() => remove(entry)}
          />
        ))}
      </div>
      {filtered.length > limit && (
        <div className="mt-4 text-center">
          <Button onClick={() => setLimit((current) => current + PAGE_SIZE)}>
            Daha fazla göster ({filtered.length - limit})
          </Button>
        </div>
      )}

      <Modal
        open={dialog?.type === 'create' || dialog?.type === 'edit'}
        onClose={close}
        title={dialog?.type === 'edit' ? 'Kelimeyi düzenle' : 'Yeni kelime'}
      >
        <WordForm
          initial={dialog?.type === 'edit' ? dialog.entry : undefined}
          knownTags={tags}
          onSaved={() => {
            close();
            onChanged();
          }}
        />
      </Modal>
      <Modal open={dialog?.type === 'import'} onClose={close} title="JSON içe aktar">
        <ImportPanel onImported={onChanged} onClose={close} />
      </Modal>
    </>
  );
}

function WordTile({ entry, onEdit, onDelete }: { entry: WordEntry; onEdit: () => void; onDelete: () => void }) {
  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg leading-tight font-extrabold">{entry.word}</h2>
        <div className="-mt-1 -mr-2 flex">
          <IconButton label="Düzenle" onClick={onEdit}>
            <Pencil className="size-4" />
          </IconButton>
          <IconButton label="Sil" onClick={onDelete} className="hover:text-rose-600 dark:hover:text-rose-400">
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>
      {entry.tags.length > 0 && (
        <p className="mt-0.5 text-xs font-bold text-violet-600 dark:text-violet-400">
          {entry.tags.map((tag) => `#${tag}`).join(' ')}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-1">
        {DIFFICULTY_LEVELS.flatMap((level) =>
          entry.taboo[level].map((word) => (
            <span
              key={`${level}:${word}`}
              title={DIFFICULTY_LABELS[level].label}
              className={cn('rounded-md px-1.5 py-0.5 text-xs font-bold', LEVEL_STYLES[level])}
            >
              {word}
            </span>
          )),
        )}
      </div>
    </article>
  );
}
