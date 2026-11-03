import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextOccurrence, generateRecurring, createRecurring } from '../../src/game/recurring';
import { completeTask } from '../../src/game/actions';
import { applyChanges, type GameState, type Outcome } from '../../src/game/state';
import type { RecurringTemplate } from '../../src/game/types';
import { makeCtx, makeState } from './fixtures';

const run = (s: GameState, o: Outcome) => applyChanges(s, o.changes);
const tpl = (p: Partial<RecurringTemplate>): RecurringTemplate => ({ id: 'r', title: 'Уборка', stat: 'DIS', rank: 'C', points: 3, every: 'week', anchorDay: '2026-11-02', ...p });

test('weekly on Wednesday from Tuesday → next day', () => {
  assert.equal(nextOccurrence(tpl({ every: 'week', weekday: 3 }), '2026-11-03'), '2026-11-04');
  assert.equal(nextOccurrence(tpl({ every: 'week', weekday: 2 }), '2026-11-03'), '2026-11-03');
});

test('every 2 weeks from the anchor', () => {
  assert.equal(nextOccurrence(tpl({ every: '2weeks', anchorDay: '2026-11-02' }), '2026-11-10'), '2026-11-16');
  assert.equal(nextOccurrence(tpl({ every: '2weeks', anchorDay: '2026-11-02' }), '2026-11-02'), '2026-11-02');
});

test('monthly on the 31st clamps to the month length', () => {
  assert.equal(nextOccurrence(tpl({ every: 'month', monthDay: 31 }), '2026-11-03'), '2026-11-30');
  assert.equal(nextOccurrence(tpl({ every: 'month', monthDay: 2 }), '2026-11-03'), '2026-12-02');
});

test('generation creates one open task per template, next one after completion', () => {
  const ctx = makeCtx(); // 2026-11-03
  let s = makeState();
  s = run(s, createRecurring(s, ctx, { title: 'Уборка', stat: 'DIS', rank: 'C', every: 'week', weekday: 3 }));
  s = run(s, generateRecurring(s, ctx));
  let open = Object.values(s.tasks);
  assert.equal(open.length, 1);
  assert.equal(open[0].dueDay, '2026-11-04');
  assert.equal(open[0].recurringId, Object.keys(s.recurring)[0]);
  assert.deepEqual(generateRecurring(s, ctx).changes.put.tasks ?? [], []);
  s = run(s, completeTask(s, ctx, open[0].id));
  s = run(s, generateRecurring(s, ctx));
  const next = Object.values(s.tasks).find((t) => t.status === 'open')!;
  assert.equal(next.dueDay, '2026-11-11');
});
