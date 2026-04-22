/**
 * Local persistence smoke test (localStorage, single global keys).
 * Requires: python3 -m http.server 8765 (from repo root) running first.
 * Run: node scripts/test-persistence.mjs
 */
import { chromium } from 'playwright';

const base = process.env.TEST_BASE || 'http://127.0.0.1:8765/';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 25000 });
await page.waitForSelector('#tableBody .score-inp', { timeout: 25000 });

const first = page.locator('#tableBody .score-inp').first();
await first.fill('3');
await first.evaluate((el) => {
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 600));

const keysBefore = await page.evaluate(() =>
  Object.keys(localStorage).filter((k) => k.startsWith('fifa2026')),
);

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('#tableBody .score-inp', { timeout: 25000 });

const val = await page.locator('#tableBody .score-inp').first().inputValue();
const keysAfter = await page.evaluate(() =>
  Object.keys(localStorage).filter((k) => k.startsWith('fifa2026')),
);

const banner = await page.locator('#syncBanner').innerText().catch(() => '');
const finalUrl = page.url();

await browser.close();

console.log(
  JSON.stringify(
    { base, url: finalUrl, firstScoreAfterReload: val, keysBefore, keysAfter, banner: banner.slice(0, 200) },
    null,
    2,
  ),
);

if (val !== '3') {
  console.error('FAIL: expected first schedule score input to remain "3" after reload');
  process.exit(1);
}
if (!keysAfter.includes('fifa2026_scores')) {
  console.error('FAIL: expected fifa2026_scores localStorage key');
  process.exit(1);
}

console.log('PASS: local persistence (localStorage) survives reload');
