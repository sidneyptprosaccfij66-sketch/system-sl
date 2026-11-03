import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withApp, nav } from './app-helpers.mjs';

test('"Все" is the default tab and shows quests, dated and undated tasks together', () => withApp('', async ({ page }) => {
  const tasks = await nav(page, 'Задания');
  const all = tasks.getByRole('tab', { name: 'Все' });
  assert.equal(await all.getAttribute('aria-selected'), 'true');
  const panel = tasks.getByRole('tabpanel');
  await panel.locator('[data-quest]', { hasText: 'Сдать сессию без долгов' }).waitFor();
  await panel.getByRole('button', { name: 'Открыть: Обновить портфолио' }).waitFor();
  await panel.getByRole('button', { name: 'Открыть: Записаться к стоматологу' }).waitFor();
  await tasks.getByRole('tab', { name: 'Без даты' }).click();
  assert.equal(await tasks.getByRole('tabpanel').locator('[data-quest]').count(), 0);
}));
