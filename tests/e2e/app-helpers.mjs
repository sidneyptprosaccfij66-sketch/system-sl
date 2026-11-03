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

export const nav = (page, name) => page.getByRole('link', { name, exact: true }).click();
export async function waitWindow(page, title) {
  await page.locator('[role=status]', { hasText: title }).first().waitFor({ timeout: 4000 });
}
export async function dismissAll(page) {
  await page.evaluate(() => window.__fx?.clear());
}
