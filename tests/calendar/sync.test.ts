import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventForTask, planExport, planImport, markExported, type CalEvent } from '../../src/calendar/sync';
import { createTask, completeTask } from '../../src/game/actions';
import { applyChanges, type GameState, type Outcome } from '../../src/game/state';
import { makeCtx, makeState } from '../game/fixtures';

const run = (s: GameState, o: Outcome) => applyChanges(s, o.changes);

test('task without time → all-day event; with a range → timed event in Moscow time', () => {
  const ctx = makeCtx();
  let s = makeState();
  s = run(s, createTask(s, ctx, { kind: 'task', title: 'Уборка', stat: 'DIS', rank: 'C', dueDay: '2026-11-05' }));
  s = run(s, createTask(s, ctx, { kind: 'task', title: 'Зал', stat: 'STR', rank: 'B', dueDay: '2026-11-05', dueTime: '18:30' }));
  const [a, b] = Object.values(s.tasks);
  assert.deepEqual(eventForTask(a).start, { date: '2026-11-05' });
  assert.deepEqual(eventForTask(a).end, { date: '2026-11-06' });
  assert.deepEqual(eventForTask(b).start, { dateTime: '2026-11-05T18:30:00', timeZone: 'Europe/Moscow' });
  assert.deepEqual(eventForTask(b).end, { dateTime: '2026-11-05T19:30:00', timeZone: 'Europe/Moscow' });
});

test('export plan: insert new, patch changed, skip unchanged, ✅ after completion, delete pending', () => {
  const ctx = makeCtx();
  let s = makeState();
  s = run(s, createTask(s, ctx, { kind: 'task', title: 'Зал', stat: 'STR', rank: 'B', dueDay: '2026-11-03', dueTime: '18:00', endTime: '19:30' }));
  const t = Object.values(s.tasks)[0];
  assert.deepEqual(planExport(s).map((o) => o.op), ['insert']);
  s = run(s, markExported(s, ctx, t.id, 'ev-1', eventForTask(s.tasks[t.id])));
  assert.deepEqual(planExport(s), []);
  s = run(s, completeTask(s, ctx, t.id));
  const ops = planExport(s);
  assert.equal(ops[0].op, 'patch');
  assert.match(ops[0].event!.summary, /^✅ Зал/);
  s = { ...s, profile: { ...s.profile, settings: { ...s.profile.settings, calendar: { ...s.profile.settings.calendar, pendingDeletes: ['ev-9'] } } } };
  assert.ok(planExport(s).some((o) => o.op === 'delete' && o.eventId === 'ev-9'));
});

const ev = (p: Partial<CalEvent>): CalEvent => ({ id: 'e1', status: 'confirmed', summary: 'Пара: Базы данных', start: { dateTime: '2026-11-04T12:00:00+03:00' }, end: { dateTime: '2026-11-04T13:30:00+03:00' }, ...p });

test('import: calendar event becomes an INT task without penalty; no duplicates; updates and cancellations', () => {
  const ctx = makeCtx();
  let s = makeState();
  s = run(s, planImport(s, ctx, 'cal-1', [ev({})], false));
  let t = Object.values(s.tasks);
  assert.equal(t.length, 1);
  assert.equal(t[0].stat, 'INT'); assert.equal(t[0].rank, 'D'); assert.equal(t[0].penalize, false);
  assert.equal(t[0].source, 'calendar');
  assert.equal(t[0].dueDay, '2026-11-04'); assert.equal(t[0].dueTime, '12:00'); assert.equal(t[0].endTime, '13:30');
  s = run(s, planImport(s, ctx, 'cal-1', [ev({})], false));
  assert.equal(Object.values(s.tasks).length, 1);
  s = run(s, planImport(s, ctx, 'cal-1', [ev({ summary: 'Пара: БД (перенос)', start: { dateTime: '2026-11-04T14:00:00+03:00' }, end: { dateTime: '2026-11-04T15:30:00+03:00' } })], false));
  t = Object.values(s.tasks);
  assert.equal(t[0].title, 'Пара: БД (перенос)'); assert.equal(t[0].dueTime, '14:00');
  s = run(s, planImport(s, ctx, 'cal-1', [ev({ status: 'cancelled' })], false));
  assert.equal(Object.values(s.tasks).length, 0);
});

test('import never touches a completed task', () => {
  const ctx = makeCtx();
  let s = makeState();
  s = run(s, planImport(s, ctx, 'cal-1', [ev({})], true));
  const id = Object.keys(s.tasks)[0];
  s = run(s, completeTask(s, ctx, id));
  s = run(s, planImport(s, ctx, 'cal-1', [ev({ status: 'cancelled' })], true));
  assert.equal(s.tasks[id].status, 'done');
});

test('all-day imported event has no time', () => {
  const ctx = makeCtx();
  let s = makeState();
  s = run(s, planImport(s, ctx, 'cal-1', [ev({ start: { date: '2026-11-06' }, end: { date: '2026-11-07' }, summary: 'День рождения мамы' })], false));
  const t = Object.values(s.tasks)[0];
  assert.equal(t.dueDay, '2026-11-06'); assert.equal(t.dueTime, undefined); assert.equal(t.stat, 'CHA');
});
