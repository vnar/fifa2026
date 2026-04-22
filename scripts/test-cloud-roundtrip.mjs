/**
 * Cross-browser cloud sync (Supabase). Uses a disposable temp site + config.js.
 *
 * Requires: TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY (anon public key only).
 * Optional: TEST_MATCH_ID (default 1).
 *
 * Run: npm run test:cloud
 * Skips with exit 0 if env vars are not set.
 */
import assert from 'assert';
import { chromium } from 'playwright';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const url = String(process.env.TEST_SUPABASE_URL || '').trim();
const key = String(process.env.TEST_SUPABASE_ANON_KEY || '').trim();
const mid = parseInt(process.env.TEST_MATCH_ID || '1', 10);

if (url.length < 16 || key.length < 36) {
  console.log('SKIP test:cloud (set TEST_SUPABASE_URL and TEST_SUPABASE_ANON_KEY to run)');
  process.exit(0);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fifa-cloud-'));
fs.copyFileSync(path.join(root, 'index.html'), path.join(tmp, 'index.html'));
if (fs.existsSync(path.join(root, 'public-board.json'))) {
  fs.copyFileSync(path.join(root, 'public-board.json'), path.join(tmp, 'public-board.json'));
}
fs.writeFileSync(
  path.join(tmp, 'config.js'),
  `window.__FIFA_SUPABASE__ = ${JSON.stringify({ url, anonKey: key, publicBoardUrl: '' })};\n`,
  'utf8',
);

const port = 8800 + Math.floor(Math.random() * 80);
const base = `http://127.0.0.1:${port}/`;
const srv = spawn('python3', ['-m', 'http.server', String(port)], { cwd: tmp, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 500));

function cleanup() {
  try {
    srv.kill('SIGTERM');
  } catch (_) {}
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch (_) {}
}

const browser = await chromium.launch({ headless: true });

try {
  const ctx1 = await browser.newContext();
  const page1 = await ctx1.newPage();
  await page1.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page1.waitForSelector(`#tableBody tr[data-mid="${mid}"]`, { timeout: 30000 });

  const rowSel = `#tableBody tr[data-mid="${mid}"]`;
  await page1.locator(`${rowSel} input.score-inp[data-side="t1"]`).fill('7');
  await page1.locator(`${rowSel} input.score-inp[data-side="t1"]`).evaluate((el) => {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page1.locator(`${rowSel} input.ticket-cb`).check();
  await page1.locator(`${rowSel} input.comment-inp`).fill('cloud-e2e-note');
  await page1.locator(`${rowSel} input.comment-inp`).evaluate((el) => {
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });

  await new Promise((r) => setTimeout(r, 2800));

  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await page2.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page2.waitForSelector(`#tableBody tr[data-mid="${mid}"]`, { timeout: 30000 });

  const t1 = await page2.locator(`${rowSel} input.score-inp[data-side="t1"]`).inputValue({ timeout: 20000 });
  assert.strictEqual(t1, '7', 'second browser should load score from Supabase');

  const tick = await page2.locator(`${rowSel} input.ticket-cb`).isChecked();
  assert.strictEqual(tick, true, 'second browser should see ticket from Supabase');

  const note = await page2.locator(`${rowSel} input.comment-inp`).inputValue();
  assert.strictEqual(note, 'cloud-e2e-note', 'second browser should load comment from Supabase');

  await ctx1.close();
  await ctx2.close();

  console.log('PASS: cloud round-trip (score + ticket + note visible in fresh browser context)');
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
  cleanup();
}

if (process.exitCode) process.exit(1);
