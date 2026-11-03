import { test } from 'node:test';
import { withApp, nav, waitWindow } from './app-helpers.mjs';

test('locked skill shows its threshold; passing a trial levels up', () => withApp('', async ({ page }) => {
  await nav(page, 'Навыки');
  await page.getByText('Откроется при CHA 3').waitFor();
  const card = page.locator('[data-skill]', { hasText: 'Подтягивания' });
  await card.getByRole('button', { name: 'Испытание пройдено' }).click();
  await page.getByRole('button', { name: 'Да, прошёл' }).click();
  await waitWindow(page, 'SKILL LEVEL UP');
}));

test('custom skill can be created', () => withApp('', async ({ page }) => {
  await nav(page, 'Навыки');
  await page.getByRole('button', { name: 'Новый навык' }).click();
  const d = page.getByRole('dialog');
  await d.getByLabel('Название').fill('Жонглирование');
  await d.getByLabel('Испытания, по одному в строке').fill('3 мяча\n4 мяча\n5 мячей');
  await d.getByRole('button', { name: 'Сохранить' }).click();
  await page.locator('[data-skill]', { hasText: 'Жонглирование' }).waitFor();
}));
