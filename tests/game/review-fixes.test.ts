import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTask, completeTask, updateTask, createHabit, deleteTask, RescheduleLockedError } from '../../src/game/actions';
import { toggleHabit, streakLength } from '../../src/game/daily';
import { applyChanges, type GameState, type Outcome } from '../../src/game/state';
import { planImport, type CalEvent } from '../../src/calendar/sync';
import type { Penalty } from '../../src/game/types';
import { makeCtx, makeState } from './fixtures';

const run = (s: GameState, o: Outcome) => applyChanges(s, o.changes);
const at = (d: number, hMsk: number, mi = 0) => Date.UTC(2026, 10, d, hMsk - 3, mi);

test('#4 streak keeps growing past the loaded history window', () => {
  const ctx = makeCtx(at(3, 12));
  let s = makeState({ firstDay: '2026-01-01' });
  s = run(s, createHabit(s, ctx, { title: 'H', stat: 'STR' }));
  const h = Object.keys(s.habits)[0];
  s = { ...s, days: { '2026-11-02': { day: '2026-11-02', habitsDone: [h], sick: false, evaluated: true, habitLedger: {}, streakLedger: {}, streaks: { [h]: 125 } } } };
  const o = toggleHabit(s, ctx, h, '2026-11-03');
  s = run(s, o);
  assert.equal(streakLength(s, h, '2026-11-03'), 126);
  assert.ok(o.events.some((e) => e.type === 'STREAK'));
});

test('#5 the editor cannot move a task after 12:00 on its due day', () => {
  const ctx = makeCtx(at(3, 10));
  let s = makeState();
  s = run(s, createTask(s, ctx, { kind: 'task', title: 'X', stat: 'DIS', rank: 'D', dueDay: '2026-11-03' }));
  const id = Object.keys(s.tasks)[0];
  ctx.setNow(at(3, 15));
  assert.throws(() => updateTask(s, ctx, id, { dueDay: '2026-11-05' }), RescheduleLockedError);
  assert.throws(() => updateTask(s, ctx, id, { dueDay: undefined }), RescheduleLockedError);
  assert.doesNotThrow(() => updateTask(s, ctx, id, { title: 'Y' }));
});

test('#6 the daily bonus is never awarded twice in a day', () => {
  const ctx = makeCtx(at(3, 12));
  let s = makeState();
  s = run(s, createHabit(s, ctx, { title: 'A', stat: 'STR' }));
  const a = Object.keys(s.habits)[0];
  s = run(s, toggleHabit(s, ctx, a, '2026-11-03'));
  s = run(s, createHabit(s, ctx, { title: 'B', stat: 'VIT' }));
  const b = Object.keys(s.habits).find((x) => x !== a)!;
  const o = toggleHabit(s, ctx, b, '2026-11-03');
  s = run(s, o);
  assert.equal(s.profile.totals.stats.DIS, 3);
  assert.ok(!o.events.some((e) => e.type === 'DAILY_QUEST_COMPLETED'));
});

test('#7 a deleted calendar task is not imported again', () => {
  const ctx = makeCtx();
  let s = makeState();
  const ev: CalEvent = { id: 'e1', status: 'confirmed', summary: 'День рождения', start: { date: '2026-11-06' }, end: { date: '2026-11-07' } };
  s = run(s, planImport(s, ctx, 'c', [ev], false));
  s = run(s, deleteTask(s, ctx, Object.keys(s.tasks)[0]));
  s = run(s, planImport(s, ctx, 'c', [ev], false));
  assert.equal(Object.keys(s.tasks).length, 0);
});

test('#8 end time must be after start time', () => {
  const s = makeState();
  assert.throws(() => createTask(s, makeCtx(), { kind: 'task', title: 'X', stat: 'DIS', rank: 'D', dueDay: '2026-11-03', dueTime: '18:00', endTime: '17:00' }), /позже начала/);
});

test('#9 correcting a done task during a penalty keeps its original multiplier', () => {
  const ctx = makeCtx(at(3, 12));
  let s = makeState();
  s = run(s, createTask(s, ctx, { kind: 'task', title: 'X', stat: 'INT', rank: 'A' }));
  const id = Object.keys(s.tasks)[0];
  s = run(s, completeTask(s, ctx, id));
  const p: Penalty = { id: 'p', forDay: '2026-11-02', targetDay: '2026-11-03', issuedAt: 0, severity: 'medium', score: 5, reasons: [], restrictions: [], activeUntil: at(4, 0), status: 'active' };
  s = { ...s, penalties: { p } };
  s = run(s, updateTask(s, ctx, id, { stat: 'MST' }));
  assert.equal(s.profile.totals.stats.MST, 8);
  assert.equal(s.profile.totals.xp, 80);
});
