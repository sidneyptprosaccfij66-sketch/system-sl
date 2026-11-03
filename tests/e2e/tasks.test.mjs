import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withApp, nav, waitWindow } from './app-helpers.mjs';

test('main quest with checklist: progress and completion', () => withApp('', async ({ page }) => {
  const tasks = await nav(page, 'Задания');
  await tasks.getByRole('button', { name: 'Новый квест' }).click();
  const d = page.getByRole('dialog');
  await d.getByLabel('Название').fill('Пробежать 10 км');
  await d.getByRole('radio', { name: 'Сюжетный' }).click();
  await d.getByLabel('Условие победы').fill('10 км без остановки');
  for (const step of ['Купить кроссовки', 'Пробежать 5 км']) {
    await d.getByLabel('Новый шаг').fill(step);
    await d.getByRole('button', { name: 'Добавить шаг' }).click();
  }
  await d.getByRole('button', { name: 'Сохранить' }).click();
  await tasks.getByRole('tab', { name: 'Квесты' }).click();
  const card = tasks.locator('[data-quest]', { hasText: 'Пробежать 10 км' });
  await card.getByText('0/2').waitFor();
  await card.getByRole('checkbox', { name: 'Купить кроссовки' }).click();
  await card.getByText('1/2').waitFor();
  await card.getByRole('button', { name: 'Завершить квест' }).click();
  await waitWindow(page, 'QUEST COMPLETED');
}));

test('a fourth main quest is refused', () => withApp('', async ({ page }) => {
  const tasks = await nav(page, 'Задания');
  for (const t of ['Цель 2', 'Цель 3', 'Цель 4']) {
    await tasks.getByRole('button', { name: 'Новый квест' }).click();
    const d = page.getByRole('dialog');
    await d.getByLabel('Название').fill(t);
    await d.getByRole('radio', { name: 'Сюжетный' }).click();
    await d.getByRole('button', { name: 'Сохранить' }).click();
  }
  await waitWindow(page, 'Не больше 3 сюжетных квестов');
}));

test('rescheduling locks after 12:00 on the due day', () => withApp('', async ({ page }) => {
  await page.goto(page.url().replace(/now=[^&]+/, 'now=2026-11-03T09:30:00Z'));
  await page.locator('[data-app-ready]').waitFor();
  const today = await nav(page, 'Сегодня');
  await today.getByRole('button', { name: 'Открыть: Разобрать стол и вынести мусор' }).click();
  await page.getByRole('dialog').getByText('Перенос закрыт после 12:00').waitFor();
  assert.ok(await page.getByRole('button', { name: 'Перенести на завтра' }).isDisabled());
}));
