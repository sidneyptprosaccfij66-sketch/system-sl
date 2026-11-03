import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers.mjs';

async function open(opts) {
  const app = await openApp({ dir: 'dist-proto-holo', ...opts });
  await app.page.goto(`${app.url}/index.html`);
  await app.page.locator('[data-app-ready]').waitFor({ timeout: 10000 });
  return app;
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`holographic prototype runs the real app at ${viewport.width}px`, async () => {
    const app = await open({ viewport });
    const p = app.page;
    try {
      assert.ok(await p.evaluate(() => document.documentElement.classList.contains('holo2')));
      const frame = await p.evaluate(() => getComputedStyle(document.body, '::before').content);
      assert.equal(frame, 'none', 'no HUD frame along the screen edges');
      const edge = await p.evaluate(() => getComputedStyle(document.querySelector('.panel'), '::after').backgroundImage);
      assert.match(edge, /svg/, 'windows get the HUD frame');
      await p.getByRole('navigation', { name: 'Разделы' }).getByRole('link', { name: 'Задания', exact: true }).click();
      await p.locator('[data-section="tasks"]').getByRole('tab', { name: 'Все' }).waitFor();
      await p.waitForTimeout(1200);
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal scroll');
      assert.ok(await p.evaluate(() => document.getAnimations().some((a) => a.playState === 'running')), 'ambient animation runs');
      assert.deepEqual(app.errors, []);
    } finally { await app.close(); }
  });
}

test('holographic prototype respects reduced motion', async () => {
  const app = await open({ reducedMotion: 'reduce' });
  try {
    await app.page.waitForTimeout(400);
    const css = await app.page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a instanceof CSSAnimation).length);
    assert.equal(css, 0);
  } finally { await app.close(); }
});

for (const width of [390, 650, 1440]) {
  test(`tab and button labels fit at ${width}px`, async () => {
    const app = await open({ viewport: { width, height: 900 } });
    try {
      const tasks = app.page.locator('[data-section="tasks"]');
      await tasks.scrollIntoViewIfNeeded();
      const clipped = await tasks.evaluate((sec) => [...sec.querySelectorAll('.seg-btn, .btn')]
        .filter((b) => b.offsetParent && b.scrollWidth > b.clientWidth + 1).map((b) => b.textContent));
      assert.deepEqual(clipped, []);
    } finally { await app.close(); }
  });
}

test('chamfered controls draw a complete outline layer (incl. diagonals)', async () => {
  const app = await open({});
  try {
    const r = await app.page.evaluate(() => {
      const b = document.querySelector('.tl-block');
      const after = getComputedStyle(b, '::after');
      return { content: after.content, clip: after.clipPath, bg: getComputedStyle(b).backgroundImage + getComputedStyle(b).backgroundColor };
    });
    assert.notEqual(r.content, 'none');
    assert.match(r.clip, /polygon/);
  } finally { await app.close(); }
});
