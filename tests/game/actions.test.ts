import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTask, completeTask, uncompleteTask, updateTask, rescheduleTask, deleteTask, toggleChecklistItem, RescheduleLockedError } from '../../src/game/actions';
import { applyChanges, type GameState, type Outcome } from '../../src/game/state';
import { makeCtx, makeState, T0 } from './fixtures';

const run = (s: GameState, o: Outcome) => applyChanges(s, o.changes);
const newTaskId = (o: Outcome) => o.changes.put.tasks![0].id;

test('create C task gets 3 points; 99 points clamps to 50; empty title rejected', () => {
  const s = makeState(); const ctx = makeCtx();
  const o = createTask(s, ctx, { kind: 'task', title: 'Лаба', stat: 'INT', rank: 'C' });
  assert.equal(o.changes.put.tasks![0].points, 3);
  assert.equal(o.changes.put.tasks![0].status, 'open');
  assert.equal(o.changes.put.tasks![0].penalize, true);
  const big = createTask(s, ctx, { kind: 'task', title: 'X', stat: 'INT', rank: 'S', points: 99 });
  assert.equal(big.changes.put.tasks![0].points, 50);
  assert.throws(() => createTask(s, ctx, { kind: 'task', title: '   ', stat: 'INT', rank: 'C' }));
});

test('complete → done, QUEST_COMPLETED, ledger entry', () => {
  const ctx = makeCtx();
  let s = makeState();
  const c = createTask(s, ctx, { kind: 'task', title: 'Зал', stat: 'STR', rank: 'B' });
  s = run(s, c);
  const o = completeTask(s, ctx, newTaskId(c));
  s = run(s, o);
  const t = Object.values(s.tasks)[0];
  assert.equal(t.status, 'done');
  assert.ok(t.ledgerId && s.ledger[t.ledgerId]);
  assert.deepEqual(o.events[0], { type: 'QUEST_COMPLETED', title: 'Зал', stat: 'STR', points: 5, xp: 50, anchorId: t.id });
  assert.equal(s.profile.totals.stats.STR, 5);
});

test('complete → uncomplete → complete counts once', () => {
  const ctx = makeCtx();
  let s = makeState();
  const c = createTask(s, ctx, { kind: 'task', title: 'Зал', stat: 'STR', rank: 'B' });
  s = run(s, c); const id = newTaskId(c);
  s = run(s, completeTask(s, ctx, id));
  s = run(s, uncompleteTask(s, ctx, id));
  assert.equal(s.tasks[id].status, 'open');
  assert.equal(s.profile.totals.stats.STR, 0); assert.equal(s.profile.totals.xp, 0);
  s = run(s, completeTask(s, ctx, id));
  assert.equal(s.profile.totals.stats.STR, 5); assert.equal(s.profile.totals.xp, 50);
});

test('editing points of a done task adjusts totals by the difference', () => {
  const ctx = makeCtx();
  let s = makeState();
  const c = createTask(s, ctx, { kind: 'task', title: 'Лаба', stat: 'INT', rank: 'C' });
  s = run(s, c); const id = newTaskId(c);
  s = run(s, completeTask(s, ctx, id));
  const o = updateTask(s, ctx, id, { points: 5 });
  s = run(s, o);
  assert.equal(s.profile.totals.stats.INT, 5); assert.equal(s.profile.totals.xp, 50);
  assert.deepEqual(o.events, []);
  s = run(s, updateTask(s, ctx, id, { stat: 'MST' }));
  assert.equal(s.profile.totals.stats.INT, 0); assert.equal(s.profile.totals.stats.MST, 5);
});

test('reschedule allowed until 12:00 MSK on the due day', () => {
  const ctx = makeCtx(Date.UTC(2026, 10, 4, 8, 59)); // 11:59 MSK on 2026-11-04
  let s = makeState();
  const c = createTask(s, ctx, { kind: 'task', title: 'X', stat: 'DIS', rank: 'D', dueDay: '2026-11-04' });
  s = run(s, c); const id = newTaskId(c);
  const moved = run(s, rescheduleTask(s, ctx, id, '2026-11-06'));
  assert.equal(moved.tasks[id].dueDay, '2026-11-06');
  ctx.setNow(Date.UTC(2026, 10, 4, 9, 0)); // 12:00 MSK
  assert.throws(() => rescheduleTask(s, ctx, id, '2026-11-06'), RescheduleLockedError);
});

test('checklist toggles and delete removes the task', () => {
  const ctx = makeCtx();
  let s = makeState();
  const c = createTask(s, ctx, { kind: 'quest', questType: 'side', title: 'Уборка', stat: 'DIS', rank: 'C', checklist: [{ id: 'a', text: 'Пол', done: false }] });
  s = run(s, c); const id = newTaskId(c);
  s = run(s, toggleChecklistItem(s, ctx, id, 'a'));
  assert.equal(s.tasks[id].checklist![0].done, true);
  s = run(s, deleteTask(s, ctx, id));
  assert.equal(s.tasks[id], undefined);
});

test('completing a failed task still awards points', () => {
  const ctx = makeCtx();
  let s = makeState();
  const c = createTask(s, ctx, { kind: 'task', title: 'X', stat: 'DIS', rank: 'D', dueDay: '2026-11-02' });
  s = run(s, c); const id = newTaskId(c);
  s = { ...s, tasks: { ...s.tasks, [id]: { ...s.tasks[id], status: 'failed' } } };
  s = run(s, completeTask(s, ctx, id));
  assert.equal(s.tasks[id].status, 'done');
  assert.equal(s.profile.totals.stats.DIS, 2);
});
