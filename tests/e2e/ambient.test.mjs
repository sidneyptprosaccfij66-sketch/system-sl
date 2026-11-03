import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers.mjs';

async function load(reducedMotion) {
  const app = await openApp({ reducedMotion });
  await app.page.goto(`${app.url}/index.html?demo=1&now=2026-11-03T09:00:00Z`);
  await app.page.locator('[data-app-ready]').waitFor();
  return app;
}
const running = (page) => page.evaluate(() => document.querySelector('[data-section="status"]').getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length);

test('status screen boots with an intro and keeps a light ambient animation', async () => {
  const app = await load('no-preference');
  try {
    const lv = await app.page.locator('.hero-num').textContent();
    assert.notEqual(lv, '12', 'level counts up from zero on open');
    await app.page.waitForTimeout(2500);
    assert.equal(await app.page.locator('.hero-num').textContent(), '12');
    assert.ok((await running(app.page)) > 0, 'ambient animation keeps running');
  } finally { await app.close(); }
});

test('reduced motion: no ambient animation, values shown at once', async () => {
  const app = await load('reduce');
  try {
    assert.equal(await app.page.locator('.hero-num').textContent(), '12');
    await app.page.waitForTimeout(300);
    assert.equal(await running(app.page), 0);
  } finally { await app.close(); }
});
