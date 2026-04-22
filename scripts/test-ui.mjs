/**
 * UI smoke tests: filter reset + ticket row highlight.
 * Requires: python3 -m http.server 8765 from repo root.
 * Run: node scripts/test-ui.mjs
 */
import assert from 'assert';
import { chromium } from 'playwright';

const base = process.env.TEST_BASE || 'http://127.0.0.1:8765/';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 25000 });
await page.waitForSelector('#tableBody tr', { timeout: 25000 });

const totalMatches = await page.locator('#tableBody tr').count();
assert(totalMatches >= 100, 'expected full schedule rows, got ' + totalMatches);

// --- Ticket row highlight ---
const firstRow = page.locator('#tableBody tr').first();
await firstRow.locator('input.ticket-cb').check();
await page.waitForTimeout(200);
const cls = await firstRow.getAttribute('class');
assert(cls && cls.includes('row-ticket'), 'expected tr.row-ticket after checking ticket, class=' + cls);

// --- Filter + reset ---
await page.selectOption('#stageFilter', { label: 'FINAL' });
await page.waitForTimeout(250);
const filtered = await page.locator('#tableBody tr').count();
assert(filtered < totalMatches, 'expected fewer rows after FINAL filter, was ' + filtered + ' vs ' + totalMatches);

await page.click('#btnResetFilters');
await page.waitForTimeout(250);
const afterReset = await page.locator('#tableBody tr').count();
assert.strictEqual(afterReset, totalMatches, 'reset should show all matches again, got ' + afterReset);

const stageVal = await page.locator('#stageFilter').inputValue();
assert.strictEqual(stageVal, '', 'stage filter should be cleared');

await browser.close();
console.log('PASS: ticket highlight + filter reset');
