import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDemoState, readDemoParams } from '../../src/app/demo';
import { levelFromXp } from '../../src/game/levels';

test('demo state is a realistic level-12 player with today tasks', () => {
  const now = Date.UTC(2026, 10, 3, 9);
  const s = createDemoState(now, true);
  assert.equal(levelFromXp(s.profile.totals.xp), 12);
  assert.equal(Object.keys(s.habits).length, 4);
  assert.ok(Object.values(s.tasks).some((t) => t.dueTime && t.endTime));
  assert.equal(Object.values(s.penalties)[0].status, 'active');
});

test('demo params', () => {
  assert.deepEqual(readDemoParams('?demo=1&penalty=1'), { demo: true, fresh: false, penalty: true, now: undefined });
  assert.equal(readDemoParams('?demo=1&now=2026-11-04T09:30:00Z').now, Date.UTC(2026, 10, 4, 9, 30));
});
