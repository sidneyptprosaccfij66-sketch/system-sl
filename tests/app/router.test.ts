import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setHashQuietly } from '../../src/ui/shell/routes';

function fakeWindow(hash: string) {
  const loc = { hash };
  (globalThis as any).location = loc;
  (globalThis as any).history = { replaceState: (_s: unknown, _t: string, url: string) => { loc.hash = url; } };
  return loc;
}

test('scroll spy updates the feed hash quietly', () => {
  const loc = fakeWindow('#/status');
  setHashQuietly('tasks');
  assert.equal(loc.hash, '#/tasks');
});

test('a late scroll-spy update never overwrites a sub-page the user just opened', () => {
  const loc = fakeWindow('#/more/bank');
  setHashQuietly('more');
  assert.equal(loc.hash, '#/more/bank');
});
