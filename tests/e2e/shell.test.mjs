import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withApp, nav } from './app-helpers.mjs';

for (const vp of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`navigation works and nothing overflows at ${vp.width}px`, () => withApp('', async ({ page }) => {
    for (const [name, hash, heading] of [['Сегодня', '#/today', 'Сегодня'], ['Задания', '#/tasks', 'Задания'], ['Навыки', '#/skills', 'Навыки'], ['Ещё', '#/more', 'Ещё'], ['Статус', '#/status', 'Status']]) {
      await nav(page, name);
      await page.getByRole('heading', { name: heading, exact: true }).first().waitFor();
      assert.ok(page.url().endsWith(hash), page.url());
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow on ${name}`);
    }
  }, vp));
}

test('first sign-in asks to accept the System', () => withApp('&fresh=1', async ({ page }) => {
  await page.getByText('Will you accept?').waitFor();
  await page.getByRole('button', { name: 'Принять' }).click();
  await page.getByRole('heading', { name: 'Status', exact: true }).waitFor();
}));
