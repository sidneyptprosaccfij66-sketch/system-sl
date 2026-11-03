import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../../scripts/serve.mjs';

const require = createRequire('/opt/npm-tools/node_modules/');
export const { chromium } = require('playwright');
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Starts a server over dist/ and a browser; blocks every non-local request. */
export async function openApp({ viewport = { width: 390, height: 844 }, reducedMotion = 'no-preference', dir = 'dist' } = {}) {
  const server = await startServer(path.join(root, dir));
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport, reducedMotion });
  const errors = [];
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  return { page, errors, url: server.url, async close() { await browser.close(); await server.close(); } };
}
