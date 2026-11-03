import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers.mjs';

async function withProto(opts, fn) {
  const app = await openApp({ dir: 'dist-proto', ...opts });
  try {
    await app.page.goto(`${app.url}/index.html`);
    await fn(app);
    assert.deepEqual(app.errors, []);
  } finally {
    await app.close();
  }
}

test('completing a task shows QUEST COMPLETED window that closes by itself', () => withProto({}, async ({ page }) => {
  await page.getByRole('button', { name: 'Выполнить задание' }).click();
  const win = page.locator('[role=status]', { hasText: 'QUEST COMPLETED' });
  await win.waitFor({ state: 'visible', timeout: 3000 });
  await win.waitFor({ state: 'detached', timeout: 12000 });
}));

test('level up plays the LEVEL UP scene', () => withProto({}, async ({ page }) => {
  await page.getByRole('button', { name: 'Level up' }).click();
  await page.locator('.scene-levelup', { hasText: 'LEVEL UP' }).waitFor({ timeout: 3000 });
}));

test('penalty plays the PENALTY scene', () => withProto({}, async ({ page }) => {
  await page.getByRole('button', { name: 'Штраф' }).click();
  await page.locator('.scene-penalty', { hasText: 'PENALTY' }).waitFor({ timeout: 3000 });
}));

test('reduced motion still shows the same messages', () => withProto({ reducedMotion: 'reduce' }, async ({ page }) => {
  await page.getByRole('button', { name: 'Выполнить задание' }).click();
  await page.locator('[role=status]', { hasText: 'QUEST COMPLETED' }).waitFor({ timeout: 3000 });
  await page.getByRole('button', { name: 'Level up' }).click();
  await page.locator('.scene-levelup', { hasText: 'LEVEL UP' }).waitFor({ timeout: 6000 });
}));

test('prototype has no horizontal scroll on phone width', () => withProto({}, async ({ page }) => {
  const ok = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  assert.ok(ok);
}));
