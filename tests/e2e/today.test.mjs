import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withApp, nav, waitWindow } from './app-helpers.mjs';

const intPoints = (page) => page.locator('[data-stat="INT"]').getAttribute('data-points').then(Number);

test('quick add suggests the stat; completing awards points; unchecking reverts', () => withApp('', async ({ page }) => {
  const before = await intPoints(page);
  await nav(page, 'Сегодня');
  await page.getByLabel('Новое задание').fill('Лаба по ИСиТ');
  await page.getByRole('button', { name: 'Характеристика: INT' }).waitFor();
  await page.getByRole('radio', { name: 'Сложность C' }).click();
  await page.getByRole('button', { name: 'Добавить' }).click();
  const box = page.getByRole('checkbox', { name: 'Лаба по ИСиТ', exact: true });
  await box.click();
  await waitWindow(page, 'QUEST COMPLETED');
  await nav(page, 'Статус');
  assert.equal(await intPoints(page), before + 3);
  await nav(page, 'Сегодня');
  await page.getByRole('checkbox', { name: 'Лаба по ИСиТ', exact: true }).click();
  await nav(page, 'Статус');
  assert.equal(await intPoints(page), before);
}));

test('closing every habit completes the daily quest', () => withApp('', async ({ page }) => {
  await nav(page, 'Сегодня');
  await page.getByRole('checkbox', { name: '20 страниц книги' }).click();
  await page.getByRole('checkbox', { name: 'Без сладкого после 18:00' }).click();
  await waitWindow(page, 'DAILY QUEST COMPLETED');
}));

test('no habits → hint to add them', () => withApp('&fresh=1', async ({ page }) => {
  await page.getByRole('button', { name: 'Принять' }).click();
  await nav(page, 'Сегодня');
  await page.getByText('Добавь привычки в Настройках').waitFor();
}));

test('penalty banner shows on Status and Today', () => withApp('&penalty=1', async ({ page }) => {
  await page.getByText('PENALTY ZONE').first().waitFor();
  await nav(page, 'Сегодня');
  await page.getByText('PENALTY ZONE').first().waitFor();
}));
