/**
 * Word store CLI: inspect and change the words without opening the (large) JSON file.
 * Uses the same WordService and storage adapters as the app (WORD_STORE / WORDS_FILE / PLAYED_FILE env vars).
 *
 * Run `npm run -s words -- help` for the command list.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DEFAULT_WORDS_FILE, createRepositories } from '../src/adapters/create-repositories';
import { DIFFICULTY_LEVELS, levelsUpTo } from '../src/core/words/difficulty';
import { normalizeText, wordId, type WordEntry } from '../src/core/words/word';
import { extractEntries, formatEntry, rawWordOf, wordFileJsonSchema } from '../src/core/words/word-file';
import { MERGE_STRATEGIES, type ImportReport, type MergeStrategy } from '../src/core/words/word-import';
import { parseWordEntry } from '../src/core/words/word-schema';
import { WordService, WordServiceError } from '../src/core/words/word-service';

const HELP = `Tabu kelime aracı

Kullanım: npm run -s words -- <komut> [seçenekler]

  list                  Kelimeleri listeler (sadece kelimeler, alfabetik)
      --inline            Tek satırda, virgülle ayrılmış
      --with-tags         Etiketleriyle birlikte
      --tag <etiket>      Etikete göre süz (virgülle birden fazla: --tag yemek,içecek)
      --search <metin>    Kelimede geçen metne göre süz
  tags                  Etiketler ve kelime sayıları
  stats                 Özet istatistikler
  show <kelime...>      Kelimelerin tam kaydını gösterir
  check                 Kelime dosyasını doğrular (hatalar, tekrarlar, kalite uyarıları)
  add <dosya.json...>   JSON dosyasındaki kelimeleri ekler
      --strategy <s>      Var olan kelimeler için: skip (varsayılan) | merge | replace
      --dry-run           Değişiklikleri yazmadan sadece raporlar
  remove <kelime...>    Kelimeleri siler
  played                Oyunlarda çıkmış kelimeler, en yeniden eskiye (--inline: tek satır)
  schema                Editör desteği için words.schema.json dosyasını üretir`;

const wordsFile = process.env.WORDS_FILE ? path.resolve(process.env.WORDS_FILE) : DEFAULT_WORDS_FILE;

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      tag: { type: 'string', multiple: true },
      search: { type: 'string' },
      'with-tags': { type: 'boolean' },
      inline: { type: 'boolean' },
      strategy: { type: 'string' },
      'dry-run': { type: 'boolean' },
    },
  });
  const [command, ...args] = positionals;
  const { words, played } = createRepositories();
  const service = new WordService(words, played);
  const tags = values.tag?.flatMap((value) => value.split(',')).map(normalizeText).filter(Boolean);

  switch (command) {
    case 'list':
      return list(service, { tags, search: values.search, inline: values.inline, withTags: values['with-tags'] });
    case 'tags':
      return printTags(service, values.inline);
    case 'stats':
      return stats(service);
    case 'show':
      return show(service, args);
    case 'check':
      return check();
    case 'add':
      return add(service, args, parseStrategy(values.strategy), values['dry-run'] ?? false);
    case 'remove':
      return remove(service, args);
    case 'played':
      return printPlayed(service, values.inline);
    case 'schema':
      return schema();
    default:
      console.log(HELP);
      if (command && command !== 'help') process.exitCode = 1;
  }
}

async function list(
  service: WordService,
  options: { tags?: string[]; search?: string; inline?: boolean; withTags?: boolean },
): Promise<void> {
  const words = await service.listWords({ tags: options.tags, search: options.search });
  if (options.inline) {
    console.log(words.map((entry) => entry.word).join(', '));
  } else {
    for (const entry of words) console.log(options.withTags ? `${entry.word}  [${entry.tags.join(', ')}]` : entry.word);
  }
  console.error(`(${words.length} kelime)`);
}

async function printTags(service: WordService, inline = false): Promise<void> {
  const tags = await service.listTags();
  const items = tags.map(({ tag, count }) => `${tag} (${count})`);
  console.log(inline ? items.join(', ') : items.join('\n'));
}

async function stats(service: WordService): Promise<void> {
  const words = await service.listWords();
  const tags = await service.listTags();
  const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0).toFixed(1);

  console.log(`Kelime: ${words.length}`);
  console.log(`Etiket: ${tags.length}`);
  console.log(
    `Seviye başına yasaklı (ort.): ${DIFFICULTY_LEVELS.map((l) => `${l} ${average(words.map((w) => w.taboo[l].length))}`).join(' · ')}`,
  );
  console.log(
    `Oyunda yasaklı (ort., birikimli): ${DIFFICULTY_LEVELS.map(
      (l) => `${l} ${average(words.map((w) => levelsUpTo(l).reduce((sum, x) => sum + w.taboo[x].length, 0)))}`,
    ).join(' · ')}`,
  );
  console.log(
    `Boş seviyesi olan kelime: ${DIFFICULTY_LEVELS.map((l) => `${l} ${words.filter((w) => w.taboo[l].length === 0).length}`).join(' · ')}`,
  );
  console.log(`Etiketsiz kelime: ${words.filter((w) => w.tags.length === 0).length}`);
  console.log(`Etiketler: ${tags.map(({ tag, count }) => `${tag} ${count}`).join(' · ')}`);
}

async function show(service: WordService, names: string[]): Promise<void> {
  if (names.length === 0) throw new UsageError('Kelime belirtin: show <kelime...>');
  const found = await service.listWords();
  const byId = new Map(found.map((entry) => [wordId(entry.word), entry]));
  for (const name of names) {
    const entry = byId.get(wordId(name));
    console.log(entry ? formatEntry(entry) : `"${name}" bulunamadı`);
  }
}

/** Validates the raw file entry by entry, so every problem is listed (the app refuses a broken file). */
async function check(): Promise<void> {
  if ((process.env.WORD_STORE ?? 'json') !== 'json') throw new UsageError('check sadece JSON deposu için çalışır');

  let json: unknown;
  try {
    json = JSON.parse(await readFile(wordsFile, 'utf8'));
  } catch (error) {
    console.log(`HATA ${path.relative(process.cwd(), wordsFile)} okunamadı: ${(error as Error).message}`);
    process.exitCode = 1;
    return;
  }
  const raw = extractEntries(json);
  if (!raw) {
    console.log('HATA Beklenen biçim: { "words": [ ... ] }');
    process.exitCode = 1;
    return;
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Map<string, number>();
  const valid: WordEntry[] = [];

  raw.forEach((item, index) => {
    const label = `#${index + 1} "${rawWordOf(item) ?? '?'}"`;
    const result = parseWordEntry(item);
    if (!result.ok) {
      errors.push(...result.errors.map((message) => `${label}: ${message}`));
      return;
    }
    const { entry } = result;
    valid.push(entry);
    warnings.push(...result.warnings.map((message) => `${label}: ${message}`));

    const id = wordId(entry.word);
    if (seen.has(id)) warnings.push(`${label}: #${seen.get(id)} ile aynı kelime (yüklenirken birleştirilir)`);
    else seen.set(id, index + 1);

    for (const level of DIFFICULTY_LEVELS.slice(1)) {
      if (entry.taboo[level].length === 0) warnings.push(`${label}: "${level}" seviyesi boş`);
    }
    for (const taboo of sharesRootWithWord(entry)) {
      warnings.push(`${label}: yasaklı "${taboo}" kelimeyle aynı kökten olabilir (zaten yasak sayılır)`);
    }
  });

  const tagUsage = new Map<string, number>();
  for (const entry of valid) for (const tag of entry.tags) tagUsage.set(tag, (tagUsage.get(tag) ?? 0) + 1);
  const singleUse = [...tagUsage].filter(([, count]) => count === 1).map(([tag]) => tag);
  if (singleUse.length > 0) warnings.push(`Tek kelimede kullanılan etiketler (yazım hatası olabilir): ${singleUse.join(', ')}`);

  for (const message of errors) console.log(`HATA  ${message}`);
  for (const message of warnings) console.log(`UYARI ${message}`);
  console.log(`${raw.length} kayıt · ${errors.length} hata · ${warnings.length} uyarı`);
  if (errors.length > 0) process.exitCode = 1;
}

/** Heuristic: a taboo word starting with a word of the card (or vice versa) is usually the same root. */
function sharesRootWithWord(entry: WordEntry): string[] {
  const tokens = (text: string) => normalizeText(text).split(' ').filter((token) => token.length >= 3);
  const cardTokens = tokens(entry.word);
  return DIFFICULTY_LEVELS.flatMap((level) => entry.taboo[level]).filter((taboo) =>
    tokens(taboo).some((t) => cardTokens.some((c) => t.startsWith(c) || c.startsWith(t))),
  );
}

async function add(service: WordService, files: string[], strategy: MergeStrategy, dryRun: boolean): Promise<void> {
  if (files.length === 0) throw new UsageError('Dosya belirtin: add <dosya.json...>');
  for (const file of files) {
    let json: unknown;
    try {
      json = JSON.parse(await readFile(file, 'utf8'));
    } catch (error) {
      console.log(`${file}: okunamadı — ${(error as Error).message}`);
      process.exitCode = 1;
      continue;
    }
    printReport(file, await service.importWords(json, { strategy, dryRun }));
  }
}

function printReport(file: string, report: ImportReport): void {
  const line = (label: string, words: string[]) => {
    if (words.length > 0) console.log(`  ${label} (${words.length}): ${words.join(', ')}`);
  };
  console.log(`${file} — ${report.total} kayıt, strateji: ${report.strategy}${report.dryRun ? ' [DENEME: hiçbir şey yazılmadı]' : ''}`);
  line('Eklendi', report.added);
  line('Güncellendi', report.updated);
  line('Değişmedi', report.unchanged);
  line('Atlandı (zaten var)', report.skipped);
  if (report.invalid.length > 0) {
    console.log(`  Hatalı (${report.invalid.length}):`);
    for (const item of report.invalid) {
      console.log(`    #${item.index + 1} ${item.word ?? '(kelime yok)'}: ${item.errors.join('; ')}`);
      process.exitCode = 1;
    }
  }
  for (const warning of report.warnings) console.log(`  Uyarı: ${warning.word}: ${warning.message}`);
  if (report.skipped.length > 0 && report.strategy === 'skip') {
    console.log('  İpucu: var olan kelimelere yeni etiket/yasaklı eklemek için --strategy merge');
  }
}

async function remove(service: WordService, names: string[]): Promise<void> {
  if (names.length === 0) throw new UsageError('Kelime belirtin: remove <kelime...>');
  for (const name of names) {
    try {
      await service.deleteWord(wordId(name));
      console.log(`Silindi: ${name}`);
    } catch (error) {
      if (!(error instanceof WordServiceError) || error.code !== 'not_found') throw error;
      console.log(`Bulunamadı: ${name}`);
      process.exitCode = 1;
    }
  }
}

async function printPlayed(service: WordService, inline = false): Promise<void> {
  const played = await service.listPlayed();
  if (inline) console.log(played.map((entry) => entry.word).join(', '));
  else for (const entry of played) console.log(`${entry.word}  (${entry.playedAt.slice(0, 16).replace('T', ' ')})`);
  console.error(`(${played.length} çıkmış kelime)`);
}

async function schema(): Promise<void> {
  const target = path.join(path.dirname(wordsFile), 'words.schema.json');
  await writeFile(target, `${JSON.stringify(wordFileJsonSchema(), null, 2)}\n`, 'utf8');
  console.log(`Yazıldı: ${path.relative(process.cwd(), target)}`);
}

function parseStrategy(value: string | undefined): MergeStrategy {
  if (value === undefined) return 'skip';
  if ((MERGE_STRATEGIES as readonly string[]).includes(value)) return value as MergeStrategy;
  throw new UsageError(`Geçersiz strateji "${value}" (geçerli: ${MERGE_STRATEGIES.join(', ')})`);
}

class UsageError extends Error {}

main().catch((error: unknown) => {
  if (error instanceof UsageError) {
    console.error(error.message);
  } else if (error instanceof Error && 'problems' in error && Array.isArray(error.problems)) {
    console.error(`${error.message}\n${error.problems.join('\n')}\n(ayrıntı için: npm run -s words -- check)`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
