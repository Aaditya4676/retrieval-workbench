import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const directory = 'Z:/STUDY/res/Portfolio/work/review/after2/rag';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const proof = { item: 15, at: new Date().toISOString(), method: 'Browser network gates deliberately keep requests pending; no fabricated result or model answer is displayed.', states: [] };
try {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const context = await browser.newContext({ reducedMotion, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let releaseSearch;
    const searchGate = new Promise(resolve => { releaseSearch = resolve; });
    await page.route('**/api/search', async route => { await searchGate; await route.abort('failed').catch(() => {}); });
    let releaseAnswer;
    const answerGate = new Promise(resolve => { releaseAnswer = resolve; });
    await page.route('**/api/answer', async route => { await answerGate; await route.abort('failed').catch(() => {}); });
    try {
      await page.goto('http://127.0.0.1:3300', { waitUntil: 'networkidle' });
      assert.equal(await page.locator('.search-progress').count(), 0, 'No idle progress bar');
      await page.getByRole('button', { name: 'Search passages', exact: true }).click();
      await page.locator('.search-progress__bar').waitFor();
      const first = await page.locator('.search-progress__bar').evaluate(element => {
        const style = getComputedStyle(element);
        return { duration: style.animationDuration, name: style.animationName, transform: style.transform, width: element.getBoundingClientRect().width, trackWidth: element.parentElement.getBoundingClientRect().width, height: element.getBoundingClientRect().height };
      });
      await page.waitForTimeout(100);
      const secondTransform = await page.locator('.search-progress__bar').evaluate(element => getComputedStyle(element).transform);
      assert.equal(first.height, 2);
      if (reducedMotion === 'reduce') {
        assert.equal(first.duration, '0s');
        assert.equal(first.name, 'none');
        assert.equal(first.width, first.trackWidth);
        assert.equal(first.transform, secondTransform);
      } else {
        assert.equal(first.name, 'request-progress');
        assert.notEqual(first.transform, secondTransform);
        assert.ok(first.width < first.trackWidth);
      }
      const scan = await new AxeBuilder({ page }).analyze();
      assert.deepEqual(scan.violations, []);
      releaseSearch();
      await page.locator('.search-progress').waitFor({ state: 'detached' });
      await page.getByRole('button', { name: 'Draft an answer', exact: true }).click();
      await page.locator('.search-progress__bar').waitFor();
      await page.getByRole('button', { name: 'Stop answer', exact: true }).click();
      releaseAnswer();
      await page.locator('.search-progress').waitFor({ state: 'detached' });
      assert.match(await page.locator('.answer-region .error').innerText(), /Answer stopped/);
      assert.deepEqual(errors, []);
      proof.states.push({ reducedMotion, pendingSearch: first, secondTransform, pendingGenerationShown: true, removedAfterFailureAndCancellation: true, axeViolations: 0, pageErrors: errors });
    } finally { releaseSearch(); releaseAnswer(); await context.close(); }
  }
  proof.passed = true;
} finally { await browser.close(); await writeFile(`${directory}/item15-motion.json`, JSON.stringify(proof, null, 2)); }
console.log('PASS item15: pending-only progress, moving normal bar, static reduced bar, search failure and answer cancellation cleanup.');
