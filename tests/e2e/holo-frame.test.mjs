import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withApp, nav } from './app-helpers.mjs';

// The HUD frame lives on the windows themselves, not around the viewport.
for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`HUD frame is drawn on windows, not on the screen edges, at ${viewport.width}px`, async () => {
    await withApp('', async ({ page }) => {
      const body = await page.evaluate(() => ['::before', '::after'].map((p) => getComputedStyle(document.body, p).content));
      assert.deepEqual(body, ['none', 'none'], 'no frame along the screen edges');

      for (const name of ['Статус', 'Навыки']) {
        const sec = await nav(page, name);
        const frame = await sec.locator('.panel').first().evaluate((el) => {
          const a = getComputedStyle(el, '::after');
          return { content: a.content, bg: a.backgroundImage, corners: (a.backgroundImage.match(/svg/g) || []).length };
        });
        assert.notEqual(frame.content, 'none', `${name}: frame layer exists`);
        assert.ok(frame.corners >= 6, `${name}: 4 HUD corners + 2 side tabs (got ${frame.corners})`);
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal scroll');
    }, viewport);
  });
}
