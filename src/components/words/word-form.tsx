'use client';

import { useState, type FormEvent } from 'react';
import { DIFFICULTY_LEVELS, type DifficultyLevel } from '@/core/words/difficulty';
import { WORD_LIMITS, normalizeText, wordId, type TabooByLevel, type WordEntry } from '@/core/words/word';
import type { TagCount } from '@/core/words/word-query';
import { ApiError, api } from '@/lib/api-client';
import { DIFFICULTY_LABELS } from '@/lib/labels';
import { Button } from '../ui/button';
import { Input, Label, Textarea } from '../ui/input';
import { TagChip } from '../ui/tag-chip';
import { ErrorList } from './error-list';

const splitList = (text: string) =>
  text
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

function levelHint(index: number): string {
  if (index === 0) return 'her modda yasak';
  const label = DIFFICULTY_LABELS[DIFFICULTY_LEVELS[index]].label.toLocaleLowerCase('tr-TR');
  return index === DIFFICULTY_LEVELS.length - 1 ? `sadece ${label} modda eklenir` : `${label} ve daha zor modlarda eklenir`;
}

/** Create (`initial` absent) or edit a single word. */
export function WordForm({
  initial,
  knownTags,
  onSaved,
}: {
  initial?: WordEntry;
  knownTags: TagCount[];
  onSaved: () => void;
}) {
  const [word, setWord] = useState(initial?.word ?? '');
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '');
  const [taboo, setTaboo] = useState(
    () =>
      Object.fromEntries(DIFFICULTY_LEVELS.map((level) => [level, initial?.taboo[level].join(', ') ?? ''])) as Record<
        DifficultyLevel,
        string
      >,
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const selectedTags = splitList(tags).map(normalizeText);
  const toggleTag = (tag: string) =>
    setTags(
      (selectedTags.includes(tag) ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag]).join(', '),
    );

  async function submit(event: FormEvent) {
    event.preventDefault();
    const entry: WordEntry = {
      word,
      tags: splitList(tags),
      taboo: Object.fromEntries(DIFFICULTY_LEVELS.map((level) => [level, splitList(taboo[level])])) as TabooByLevel,
    };
    setSaving(true);
    try {
      if (initial) await api.updateWord(wordId(initial.word), entry);
      else await api.createWord(entry);
      onSaved();
    } catch (error) {
      setErrors(error instanceof ApiError ? [error.message, ...error.details] : ['Kaydedilemedi']);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="word">Kelime</Label>
        <Input
          id="word"
          value={word}
          onChange={(event) => setWord(event.target.value)}
          maxLength={WORD_LIMITS.wordLength}
          required
          autoFocus
        />
      </div>

      <div>
        <Label htmlFor="tags">
          Kategoriler{' '}
          <span className="font-normal text-slate-500">(birden fazla seç ya da virgülle yeni kategori yaz)</span>
        </Label>
        <Input id="tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="yemek, türkiye" />
        <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto p-0.5">
          {knownTags.map(({ tag }) => (
            <TagChip key={tag} size="sm" selected={selectedTags.includes(tag)} onClick={() => toggleTag(tag)}>
              {tag}
            </TagChip>
          ))}
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-bold text-slate-700 dark:text-slate-300">
          Yasaklı kelimeler <span className="font-normal text-slate-500">(virgül ya da satırla ayır)</span>
        </legend>
        {DIFFICULTY_LEVELS.map((level, index) => (
          <div key={level}>
            <Label htmlFor={`taboo-${level}`} className="text-xs">
              {DIFFICULTY_LABELS[level].label} <span className="font-normal text-slate-500">— {levelHint(index)}</span>
            </Label>
            <Textarea
              id={`taboo-${level}`}
              rows={2}
              value={taboo[level]}
              onChange={(event) => setTaboo((current) => ({ ...current, [level]: event.target.value }))}
              required={index === 0}
            />
          </div>
        ))}
      </fieldset>

      <ErrorList messages={errors} />

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </div>
    </form>
  );
}
