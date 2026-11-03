import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withApp, nav } from './app-helpers.mjs';

test('idea bank filters by all selected tags; taking an idea creates a side quest', () => withApp('', async ({ page }) => {
  const more = await nav(page, 'Ещё');
  await more.getByRole('link', { name: /Банк/ }).click();
  await page.getByRole('button', { name: 'дом', exact: true }).click();
  await page.getByRole('button', { name: 'вкусное', exact: true }).click();
  const ideas = page.locator('[data-idea]');
  assert.equal(await ideas.count(), 2);
  await ideas.filter({ hasText: 'лимонад' }).getByRole('button', { name: 'Взять' }).click();
  await page.getByRole('link', { name: 'Назад' }).click();
  const tasks = await nav(page, 'Задания');
  await tasks.getByRole('tab', { name: 'Квесты' }).click();
  await tasks.locator('[data-quest]', { hasText: 'Сделать домашний лимонад' }).waitFor();
}));

test('a habit added in settings appears in the daily quest', () => withApp('', async ({ page }) => {
  const more = await nav(page, 'Ещё');
  await more.getByRole('link', { name: /Настройки/ }).click();
  await page.getByLabel('Новая привычка').fill('Планка 2 минуты');
  await page.getByRole('button', { name: 'Добавить привычку' }).click();
  await page.getByRole('link', { name: 'Назад' }).click();
  const today = await nav(page, 'Сегодня');
  await today.getByRole('checkbox', { name: 'Планка 2 минуты' }).waitFor();
}));

test('restriction switches persist after reload', () => withApp('', async ({ page }) => {
  const more = await nav(page, 'Ещё');
  await more.getByRole('link', { name: /Настройки/ }).click();
  const sw = page.getByRole('switch', { name: 'Без YouTube' });
  await sw.click();
  assert.equal(await sw.getAttribute('aria-checked'), 'false');
  await page.reload();
  await page.locator('[data-app-ready]').waitFor();
  assert.equal(await page.getByRole('switch', { name: 'Без YouTube' }).getAttribute('aria-checked'), 'false');
}));

test('journal lists a completed task', () => withApp('', async ({ page }) => {
  const today = await nav(page, 'Сегодня');
  await today.getByRole('checkbox', { name: 'Разобрать стол и вынести мусор' }).click();
  const more = await nav(page, 'Ещё');
  await more.getByRole('link', { name: /Журнал/ }).click();
  await page.locator('[data-ledger]', { hasText: '+2 DIS' }).first().waitFor();
}));
