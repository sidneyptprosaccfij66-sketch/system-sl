import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers.mjs';

test('probe page shows SYSTEM OFFLINE when Firebase CDN is unreachable', async () => {
  const app = await openApp();
  try {
    await app.page.goto(`${app.url}/probe.html`);
    await app.page.getByText('SYSTEM OFFLINE').waitFor({ timeout: 8000 });
    assert.ok(await app.page.getByText('Нет связи с сервером').isVisible());
    assert.deepEqual(app.errors, []);
  } finally {
    await app.close();
  }
});
