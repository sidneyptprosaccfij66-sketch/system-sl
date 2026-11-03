import { openApp } from './helpers.mjs';
import assert from 'node:assert/strict';

export const NOON = '2026-11-03T09:00:00Z'; // 12:00 MSK

/** Opens the built app in demo mode with fixed clock; `fn` gets { page, url }. */
export async function withApp(query, fn, viewport) {
  const app = await openApp(viewport ? { viewport } : {});
  try {
    await app.page.goto(`${app.url}/index.html?demo=1&now=${NOON}${query}`);
    await app.page.locator('[data-app-ready]').waitFor({ timeout: 8000 });
    await fn(app);
    assert.deepEqual(app.errors, []);
  } finally {
    await app.close();
  }
}

const KEYS = { 'Статус': 'status', 'Сегодня': 'today', 'Задания': 'tasks', 'Навыки': 'skills', 'Ещё': 'more' };
/** Clicks a menu item and returns the locator of its section in the feed. */
export async function nav(page, name) {
  await page.getByRole('navigation', { name: 'Разделы' }).getByRole('link', { name, exact: true }).click();
  return page.locator(`[data-section="${KEYS[name]}"]`);
}
export async function waitWindow(page, title) {
  await page.locator('[role=status]', { hasText: title }).first().waitFor({ timeout: 4000 });
}
export async function dismissAll(page) {
  await page.evaluate(() => window.__fx?.clear());
}
