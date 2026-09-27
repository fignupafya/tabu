/**
 * Regenerates the README screenshots in docs/screenshots by playing a short game in a real browser.
 *
 *   npm run dev            # in another terminal (or npm run build && npm start)
 *   npm run screenshots
 *
 * Uses the locally installed Chrome/Edge through puppeteer-core (CHROME_PATH overrides the path,
 * BASE_URL the server). Plays in a fresh browser profile, so saved games on your browser are untouched.
 */
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import puppeteer, { type Page } from 'puppeteer-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.join(process.cwd(), 'docs', 'screenshots');
// Phone-sized by width only: toggling isMobile/hasTouch makes Puppeteer reload the page and lose the form.
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2 };
const DESKTOP = { width: 1280, height: 860, deviceScaleFactor: 1 };

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function clickText(page: Page, selector: string, text: string): Promise<void> {
  await page.waitForFunction(
    (sel, t) => [...document.querySelectorAll(sel)].some((el) => el.textContent?.trim().startsWith(t)),
    {},
    selector,
    text,
  );
  await page.$$eval(
    selector,
    (elements, t) => (elements.find((el) => el.textContent?.trim().startsWith(t)) as HTMLElement).click(),
    text,
  );
  await sleep(250);
}

async function type(page: Page, label: string, text: string): Promise<void> {
  const input = await page.waitForSelector(`input[aria-label="${label}"]`);
  await input!.click({ count: 3 });
  await input!.type(text);
}

async function shot(page: Page, name: string, fullPage = false): Promise<void> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const viewport = page.viewport()!;
  if (fullPage) {
    // Grow the viewport to the page instead of using `fullPage`, which leaves sticky bars mid-page.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewport({ ...viewport, height });
  }
  await sleep(400);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
  if (fullPage) await page.setViewport(viewport);
  console.log(`✓ docs/screenshots/${name}.png`);
}

async function playTurn(page: Page, outcomes: ('Doğru' | 'Tabu' | 'Pas')[]): Promise<void> {
  await clickText(page, 'main button', 'Başla');
  for (const outcome of outcomes) await clickText(page, 'main button', outcome);
}

async function endTurn(page: Page): Promise<void> {
  await page.click('button[aria-label="Duraklat"]');
  await clickText(page, 'main button', 'Sırayı bitir');
}

async function main(): Promise<void> {
  const executablePath = CHROME_CANDIDATES.find((candidate) => candidate && existsSync(candidate));
  if (!executablePath) throw new Error('Chrome/Edge bulunamadı; CHROME_PATH ile yolunu verin.');
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);

    // Setup (desktop, whole page)
    await page.setViewport(DESKTOP);
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await type(page, 'Kırmızı Takım 1. oyuncu', 'Ahmet');
    await type(page, 'Kırmızı Takım 2. oyuncu', 'Ayşe');
    await type(page, 'Mavi Takım 1. oyuncu', 'Bora');
    await type(page, 'Mavi Takım 2. oyuncu', 'Can');
    await clickText(page, 'button[aria-pressed]', 'yemek');
    await clickText(page, 'button[aria-pressed]', 'spor');
    await clickText(page, 'button[aria-pressed]', 'türkiye');
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, 'setup', true);

    // A one-round game on a phone
    await page.setViewport(MOBILE);
    await clickText(page, 'button[aria-pressed]', 'Tümü');
    for (let round = 4; round > 1; round--) await page.click('button[aria-label="Azalt"]');
    await clickText(page, 'button', 'Oyunu başlat');
    await page.waitForFunction(() => location.pathname === '/play');

    await playTurn(page, ['Doğru', 'Doğru', 'Tabu', 'Doğru', 'Pas']);
    await shot(page, 'card');
    await endTurn(page);
    await clickText(page, 'main li:last-child button', 'Doğru');
    await shot(page, 'review');
    await clickText(page, 'main button', 'Onayla');
    await shot(page, 'turn');

    await playTurn(page, ['Doğru', 'Tabu', 'Doğru', 'Doğru']);
    await endTurn(page);
    await clickText(page, 'main button', 'Onayla');
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
    await shot(page, 'summary', true);

    // Word management (desktop)
    await page.setViewport(DESKTOP);
    await page.goto(`${BASE_URL}/words`, { waitUntil: 'networkidle0' });
    await clickText(page, 'button[aria-pressed]', 'mitoloji');
    await clickText(page, 'button[aria-pressed]', 'uzay');
    await shot(page, 'words');

    await page.evaluate(() => window.scrollTo(0, 0));
    await clickText(page, 'button', 'JSON içe aktar');
    const sample = {
      words: [
        { word: 'Kuzguncuk', tags: ['coğrafya', 'türkiye'], taboo: { easy: ['İstanbul', 'Üsküdar', 'Boğaz'], medium: ['semt', 'sahil'], hard: ['dizi', 'yalı'] } },
        { word: 'Çay', taboo: ['semaver'] },
      ],
    };
    await page.$eval(
      'dialog[open] textarea',
      (el, value) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
        setter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      },
      JSON.stringify(sample, null, 2),
    );
    await clickText(page, 'dialog[open] button', 'Önizle');
    await page.$eval('dialog[open] .overflow-y-auto', (el) => el.scrollTo(0, el.scrollHeight));
    await shot(page, 'import');
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
