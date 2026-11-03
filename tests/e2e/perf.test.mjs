// Guards for rendering cost: endless animations must stay GPU-only and long-cycled,
// scrolling pauses ambient motion, and the lite-graphics switch works.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withApp, nav } from './app-helpers.mjs';

const CHEAP = new Set(['transform', 'opacity', 'offset', 'easing', 'composite', 'computedOffset']);

test('every endless animation moves only transform/opacity and has a long cycle', () => withApp('', async ({ page }) => {
  await page.waitForTimeout(2500);
  const bad = await page.evaluate((cheap) => document.getAnimations()
    .filter((a) => a.effect?.getTiming().iterations === Infinity)
    .map((a) => {
      const props = [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))].filter((p) => !cheap.includes(p));
      const dur = Number(a.effect.getTiming().duration);
      const el = a.effect.target;
      return { name: a.animationName, on: `${el?.className}${a.effect.pseudoElement ?? ''}`, props, dur };
    })
    .filter((x) => x.props.length || x.dur < 18000), [...CHEAP]);
  assert.deepEqual(bad, []);
}));

test('ambient animations pause while the page scrolls and resume afterwards', () => withApp('', async ({ page }) => {
  // record the dust animation state at the exact moments the class flips (no timing race)
  await page.evaluate(() => {
    window.__states = [];
    const root = document.documentElement;
    new MutationObserver(() => {
      window.__states.push([root.classList.contains('is-scrolling'), getComputedStyle(document.querySelector('.dust > i')).animationPlayState]);
    }).observe(root, { attributes: true, attributeFilter: ['class'] });
  });
  await page.mouse.move(195, 400);
  await page.mouse.wheel(0, 600);
  await page.waitForFunction(() => window.__states.length >= 2, null, { timeout: 5000 });
  const states = await page.evaluate(() => window.__states.slice(0, 2));
  assert.deepEqual(states, [[true, 'paused'], [false, 'running']]);
}));

test('lite graphics switch turns off particles, ambient motion and blur, and is remembered', () => withApp('', async ({ page }) => {
  const more = await nav(page, 'Ещё');
  await more.getByRole('link', { name: /Настройки/ }).click();
  await page.getByRole('switch', { name: 'Облегчённая графика' }).click();
  const state = async () => page.evaluate(() => ({
    lite: document.documentElement.classList.contains('holo-lite'),
    dust: getComputedStyle(document.querySelector('.dust')).display,
    endless: document.getAnimations().filter((a) => a.effect?.getTiming().iterations === Infinity && a.playState === 'running').length,
  }));
  assert.deepEqual(await state(), { lite: true, dust: 'none', endless: 0 });
  await page.reload();
  await page.locator('[data-app-ready]').waitFor();
  assert.deepEqual(await state(), { lite: true, dust: 'none', endless: 0 });
  await page.getByRole('switch', { name: 'Облегчённая графика' }).click();
  assert.equal((await state()).lite, false);
}));

