import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withApp, nav } from './app-helpers.mjs';

for (const vp of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`menu scrolls the feed to each section; nothing overflows at ${vp.width}px`, () => withApp('', async ({ page }) => {
    for (const [name, hash] of [['Навыки', '#/skills'], ['Сегодня', '#/today'], ['Ещё', '#/more'], ['Задания', '#/tasks'], ['Статус', '#/status']]) {
      const sec = await nav(page, name);
      await page.waitForFunction((h) => location.hash === h, hash);
      await page.waitForFunction((el) => Math.abs(el.getBoundingClientRect().top) < 120, await sec.elementHandle());
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${name}`);
    }
  }, vp));
}

test('scrolling the feed highlights the current section in the menu', () => withApp('', async ({ page }) => {
  await page.locator('[data-section="skills"]').scrollIntoViewIfNeeded();
  await page.evaluate(() => document.querySelector('[data-section="skills"]').scrollIntoView({ block: 'start' }));
  const link = page.getByRole('navigation', { name: 'Разделы' }).getByRole('link', { name: 'Навыки', exact: true });
  await page.waitForFunction((el) => el.getAttribute('aria-current') === 'page', await link.elementHandle());
}));

test('settings open as a separate page with a way back', () => withApp('', async ({ page }) => {
  const more = await nav(page, 'Ещё');
  await more.getByRole('link', { name: /Настройки/ }).click();
  await page.getByRole('heading', { name: 'Настройки' }).waitFor();
  await page.getByRole('link', { name: 'Назад' }).click();
  await page.locator('[data-section="status"]').waitFor();
}));

test('first sign-in asks to accept the System', () => withApp('&fresh=1', async ({ page }) => {
  await page.getByText('Will you accept?').waitFor();
  await page.getByRole('button', { name: 'Принять' }).click();
  await page.getByRole('heading', { name: 'Status', exact: true }).waitFor();
}));
