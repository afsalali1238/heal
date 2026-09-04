/**
 * Runtime QA: serves dist/ and drives it with headless Chromium.
 *
 * Assertions cover what static gates cannot: no console/page errors, gate
 * flow (trigger -> stop card -> cleared), locator blocking, timer
 * countdown, done-mark persistence across reload, search results, text-size
 * scaling, 360px overflow, and dark-theme application. Writes qa-report.json
 * and prints a Markdown summary for the PR comment. Exits 1 on any failure.
 */
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { chromium } from 'playwright';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.css': 'text/css',
  '.xml': 'application/xml',
};
const ROOT = new URL('../dist/', import.meta.url);

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const data = await readFile(new URL(`.${path}`, ROOT));
    res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    try {
      const data = await readFile(new URL('./404.html', ROOT));
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('nope');
    }
  }
});
await new Promise((resolve) => server.listen(8123, '127.0.0.1', resolve));

const errors = [];
const metrics = {};
const ok = (cond, where, what) => {
  if (!cond) errors.push(`${where}: ${what}`);
};
const BASE = 'http://127.0.0.1:8123';
const AREAS = ['neck', 'shoulder', 'elbow', 'wrist', 'lowerback', 'hip', 'knee', 'ankle'];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 360, height: 800 },
  permissions: ['clipboard-read', 'clipboard-write'],
});
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
});

// Per-page crawl: title, overflow, figures, gate flow.
let figureTotal = 0;
for (const route of ['', ...AREAS.map((a) => `${a}/`), 'find-my-area/', 'legal/', 'gallery/']) {
  const where = `/${route || '(home)'}`;
  await page.goto(BASE + '/' + route, { waitUntil: 'networkidle' });
  const title = await page.title();
  ok(title.length > 5, where, 'empty <title>');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(overflow <= 1, where, `horizontal overflow ${overflow}px at 360w`);
  const figs = await page.locator('svg[role="img"]').count();
  figureTotal += figs;
  if (route !== '' && route !== 'legal/') ok(figs >= 1, where, 'no figures rendered');
  const gate = page.locator('[data-gate]').first();
  if ((await gate.count()) > 0) {
    await gate.locator('.trigger').first().click();
    ok(await gate.locator('[data-stop]').isVisible(), where, 'stop card did not appear');
    const focused = await page.evaluate(() => !!document.activeElement?.hasAttribute?.('data-stop-title'));
    ok(focused, where, 'stop heading did not take focus');
    await gate.locator('.gate-clear').click();
    ok(await gate.locator('[data-cleared]').isVisible(), where, 'cleared line did not appear');
  }
}
metrics.pages = 3 + AREAS.length + 3;
metrics.figures = figureTotal;

// Locator blocking: grid hidden until the gate clears.
await page.goto(`${BASE}/find-my-area/`, { waitUntil: 'networkidle' });
ok(!(await page.locator('[data-gated]').first().isVisible()), 'locator', 'chooser visible before gate clears');
await page.locator('[data-gate] .trigger').first().click();
await page.locator('[data-gate] .gate-clear').click();
ok(await page.locator('[data-gated]').first().isVisible(), 'locator', 'chooser stayed hidden after clear');

// Neck area: timer, done persistence, share, search, text size.
await page.goto(`${BASE}/neck/`, { waitUntil: 'networkidle' });
await page.locator('.timer-row button').first().click();
await page.waitForTimeout(1500);
const clock = await page.locator('.timer-display').first().textContent();
ok(clock !== null && clock.trim() !== '5', 'timer', `display stuck at ${clock}`);
await page.locator('.done-toggle').first().click();
await page.reload({ waitUntil: 'networkidle' });
ok((await page.locator('.done-toggle').first().getAttribute('aria-pressed')) === 'true', 'done', 'mark lost on reload');
const progress = await page.locator('[data-progress]').first().textContent();
ok(progress !== null && progress.includes('1 of 3 done'), 'done', `progress wrong: ${progress}`);
await page.locator('.share-btn').first().click();
await page.waitForTimeout(400);
ok(((await page.locator('.share-btn').first().textContent()) || '').includes('copied'), 'share', 'no copied confirmation');
await page.locator('[aria-label="Search the library"]').click();
await page.locator('.search-box input').fill('knee');
await page.waitForTimeout(300);
const hits = await page.locator('.search-box ul a').count();
ok(hits >= 1, 'search', 'no results for "knee"');
await page.locator('.search-box ul a').first().click();
await page.waitForTimeout(500);
ok(page.url().includes('knee'), 'search', `result went nowhere: ${page.url()}`);
await page.goto(`${BASE}/neck/`, { waitUntil: 'networkidle' });
await page.locator('[aria-label^="Text size"]').click();
const scale = await page.evaluate(() => document.documentElement.style.getPropertyValue('--scale'));
ok(scale === '1.15', 'textsize', `--scale is ${scale || '(unset)'}`);

// Dark theme actually applies.
const dark = await browser.newContext({ viewport: { width: 360, height: 800 }, colorScheme: 'dark' });
const dp = await dark.newPage();
await dp.goto(`${BASE}/neck/`, { waitUntil: 'networkidle' });
const bg = await dp.evaluate(() => getComputedStyle(document.body).backgroundColor);
ok(bg === 'rgb(15, 23, 42)', 'dark', `body bg is ${bg}`);
await dark.close();
await browser.close();
server.close();

metrics.errors = errors.length;
const report = { ok: errors.length === 0, metrics, errors };
await writeFile(new URL('../qa-report.json', import.meta.url), JSON.stringify(report, null, 2));
console.log(`## Runtime QA: ${report.ok ? 'PASS' : 'FAIL'}`);
console.log(`pages ${metrics.pages}, figures ${metrics.figures}, errors ${metrics.errors}`);
for (const e of errors) console.log(`- ${e}`);
process.exit(report.ok ? 0 : 1);
