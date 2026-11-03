import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startScrollPause } from '../../src/ui/fx/scrollPause';

test('ambient animations pause while scrolling and resume after it stops', async () => {
  const classes = new Set<string>();
  const root = { classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) } } as unknown as HTMLElement;
  let handler: (() => void) | undefined;
  (globalThis as any).document = { addEventListener: (_t: string, h: () => void) => { handler = h; }, removeEventListener: () => {} };
  const stop = startScrollPause(root);
  handler!();
  assert.ok(classes.has('is-scrolling'));
  await new Promise((r) => setTimeout(r, 120));
  handler!(); // still scrolling: stays paused
  await new Promise((r) => setTimeout(r, 120));
  assert.ok(classes.has('is-scrolling'));
  await new Promise((r) => setTimeout(r, 200));
  assert.ok(!classes.has('is-scrolling'));
  stop();
});
