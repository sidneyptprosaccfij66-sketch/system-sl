import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutColumns } from '../../src/ui/components/timelineLayout';

test('non-overlapping items take the full width', () => {
  const r = layoutColumns([{ id: 'a', s: 600, e: 690 }, { id: 'b', s: 720, e: 810 }]);
  assert.deepEqual(r, { a: { col: 0, cols: 1 }, b: { col: 0, cols: 1 } });
});

test('overlapping items split the width; a later free slot is reused', () => {
  const r = layoutColumns([{ id: 'a', s: 900, e: 1020 }, { id: 'b', s: 930, e: 990 }, { id: 'c', s: 1000, e: 1010 }]);
  assert.equal(r.a.col, 0); assert.equal(r.b.col, 1); assert.equal(r.c.col, 1);
  assert.equal(r.a.cols, 2); assert.equal(r.b.cols, 2); assert.equal(r.c.cols, 2);
});

test('touching items do not overlap', () => {
  const r = layoutColumns([{ id: 'a', s: 600, e: 660 }, { id: 'b', s: 660, e: 720 }]);
  assert.equal(r.b.cols, 1);
});
