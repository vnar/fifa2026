/**
 * UI smoke tests: filter reset + ticket row highlight + destructive reset confirm.
 * Requires: python3 -m http.server 8765 from repo root.
 * Run: node scripts/test-ui.mjs
 */
import assert from 'assert';
import { chromium } from 'playwright';

const base = process.env.TEST_BASE || 'http://127.0.0.1:8765/';

async function resetWithConfirm(page) {
  page.once('dialog', (d) => {
    assert.strictEqual(d.type(), 'confirm');
    d.accept();
  });
  await page.click('#btnResetFilters');
  await page.waitForTimeout(280);
}

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

// --- Dismissing reset confirm keeps scores ---
const firstScoreInp = page.locator('#tableBody .score-inp').first();
await firstScoreInp.fill('9');
await firstScoreInp.evaluate((el) => {
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
});
await page.waitForTimeout(200);
page.once('dialog', (d) => d.dismiss());
await page.click('#btnResetFilters');
await page.waitForTimeout(150);
const stillNine = await page.locator('#tableBody .score-inp').first().inputValue();
assert.strictEqual(stillNine, '9', 'dismissing reset confirm should keep scores');

// --- Filter + reset (confirm) ---
await page.selectOption('#stageFilter', { label: 'FINAL' });
await page.waitForTimeout(250);
const filtered = await page.locator('#tableBody tr').count();
assert(filtered < totalMatches, 'expected fewer rows after FINAL filter, was ' + filtered + ' vs ' + totalMatches);

await resetWithConfirm(page);
const afterReset = await page.locator('#tableBody tr').count();
assert.strictEqual(afterReset, totalMatches, 'reset should show all matches again, got ' + afterReset);

const stageVal = await page.locator('#stageFilter').inputValue();
assert.strictEqual(stageVal, '', 'stage filter should be cleared');

const firstScoreAfterWipe = await page.locator('#tableBody .score-inp').first().inputValue();
assert.strictEqual(firstScoreAfterWipe, '', 'reset accept should clear scores in the table');

const ticketStillChecked = await page.locator('#tableBody tr').first().locator('input.ticket-cb').isChecked();
assert.strictEqual(ticketStillChecked, false, 'reset accept should clear ticket selection');

// --- Reset returns to “home”: schedule tab, scroll top (after scroll) ---
await page.evaluate(() => window.scrollTo(0, 800));
await page.waitForTimeout(100);
await resetWithConfirm(page);
const scrollY = await page.evaluate(() => window.scrollY || document.documentElement.scrollTop);
assert(scrollY < 80, 'reset should scroll page to top, scrollY=' + scrollY);
const scheduleActive = await page.locator('#tab-schedule.tab-panel.active').count();
assert.strictEqual(scheduleActive, 1, 'reset should leave Schedule tab active');

// --- Group selector “All Groups” after reset (was on single group) ---
await page.getByRole('button', { name: /Group Tables/i }).click();
await page.waitForSelector('#tab-groups.tab-panel.active');
await page.locator('#groupSelector .group-btn').nth(1).click();
await page.waitForTimeout(150);
await page.locator('#tabBtnSchedule').click();
await page.selectOption('#stageFilter', { label: 'FINAL' });
await page.waitForTimeout(200);
await resetWithConfirm(page);
await page.waitForTimeout(100);
await page.getByRole('button', { name: /Group Tables/i }).click();
const allGroupsActive = await page.locator('#groupSelector .group-btn.active').first().innerText();
assert(allGroupsActive.includes('All Groups'), 'reset should restore All Groups view, got: ' + allGroupsActive);

await browser.close();
console.log('PASS: ticket highlight + filter reset + destructive confirm');
