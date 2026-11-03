import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withApp, nav } from './app-helpers.mjs';

test('time is picked in 24-hour Moscow time and shown with the current Moscow time', () => withApp('', async ({ page }) => {
  const today = await nav(page, 'Сегодня');
  await today.getByLabel('Новое задание').fill('Созвон с куратором');
  await today.getByText('Сейчас 12:00 МСК').waitFor();
  await today.getByLabel('С: часы').selectOption('21');
  await today.getByLabel('С: минуты').selectOption('30');
  await today.getByLabel('До: часы').selectOption('22');
  await today.getByLabel('До: минуты').selectOption('15');
  const hours = await today.getByLabel('С: часы').locator('option').allTextContents();
  assert.ok(hours.includes('23') && !hours.some((h) => /AM|PM/i.test(h)));
  await today.getByRole('button', { name: 'Добавить' }).click();
  const block = today.locator('.tl-block', { hasText: 'Созвон с куратором' });
  await block.waitFor();
  assert.equal(await block.locator('.tl-time').textContent(), '21:30–22:15');
}));
