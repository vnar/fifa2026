/**
 * Local persistence smoke test (localStorage, single global keys).
 * Default base: http://127.0.0.1:8765/ — or set TEST_BASE. Prefer `npm test`, which starts a server on a free port.
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

const row1 = page.locator('#tableBody tr[data-mid="1"]');
await row1.locator('input.ticket-cb').check();
await row1.locator('input.comment-inp').fill('persist-note');
await row1.locator('input.comment-inp').evaluate((el) => {
  el.dispatchEvent(new Event('change', { bubbles: true }));
});

await new Promise((r) => setTimeout(r, 600));

const keysBefore = await page.evaluate(() =>
  Object.keys(localStorage).filter((k) => k.startsWith('fifa2026')),
);

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('#tableBody .score-inp', { timeout: 25000 });

const val = await page.locator('#tableBody .score-inp').first().inputValue();
const ticketChecked = await page.locator('#tableBody tr[data-mid="1"] input.ticket-cb').isChecked();
const noteVal = await page.locator('#tableBody tr[data-mid="1"] input.comment-inp').inputValue();
const keysAfter = await page.evaluate(() =>
  Object.keys(localStorage).filter((k) => k.startsWith('fifa2026')),
);

const title = await page.title().catch(() => '');
const finalUrl = page.url();

await browser.close();

console.log(
  JSON.stringify(
    {
      base,
      url: finalUrl,
      title,
      firstScoreAfterReload: val,
      ticketCheckedAfterReload: ticketChecked,
      noteAfterReload: noteVal,
      keysBefore,
      keysAfter,
    },
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
if (!keysAfter.includes('fifa2026_bought')) {
  console.error('FAIL: expected fifa2026_bought localStorage key after ticket check');
  process.exit(1);
}
if (!ticketChecked) {
  console.error('FAIL: expected ticket checkbox for match 1 to stay checked after reload');
  process.exit(1);
}
if (noteVal !== 'persist-note') {
  console.error('FAIL: expected comment to survive reload, got:', JSON.stringify(noteVal));
  process.exit(1);
}

console.log('PASS: local persistence (scores + tickets + notes in localStorage) survives reload');
