import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toggleHabit, streakLength } from '../../src/game/daily';
import { createHabit } from '../../src/game/actions';
import { applyChanges, type GameState, type Outcome } from '../../src/game/state';
import { addDays } from '../../src/game/time';
import { makeCtx, makeState, T0 } from './fixtures';

const run = (s: GameState, o: Outcome) => applyChanges(s, o.changes);
const DAY = 86400e3;

function withHabits(n: number) {
  const ctx = makeCtx();
  let s = makeState();
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const o = createHabit(s, ctx, { title: `H${i}`, stat: i === 0 ? 'STR' : 'VIT', points: 2 });
    s = run(s, o); ids.push(o.changes.put.habits![0].id);
  }
  return { s, ctx, ids };
}

test('closing all habits awards +3 DIS and DAILY_QUEST_COMPLETED', () => {
  let { s, ctx, ids } = withHabits(3);
  s = run(s, toggleHabit(s, ctx, ids[0], '2026-11-03'));
  s = run(s, toggleHabit(s, ctx, ids[1], '2026-11-03'));
  const o = toggleHabit(s, ctx, ids[2], '2026-11-03');
  s = run(s, o);
  assert.ok(o.events.some((e) => e.type === 'DAILY_QUEST_COMPLETED'));
  assert.equal(s.profile.totals.stats.DIS, 3);
  assert.equal(s.profile.totals.stats.STR, 2);
  assert.equal(s.profile.totals.stats.VIT, 4);
  // uncheck one → bonus reverted
  s = run(s, toggleHabit(s, ctx, ids[1], '2026-11-03'));
  assert.equal(s.profile.totals.stats.DIS, 0);
  assert.equal(s.profile.totals.stats.VIT, 2);
  assert.equal(s.days['2026-11-03'].bonusLedgerId, undefined);
});

test('7 days in a row → STREAK +5; unchecking day 7 reverts it', () => {
  let { s, ctx, ids } = withHabits(2);
  for (let i = 0; i < 7; i++) {
    const day = addDays('2026-11-03', i);
    ctx.setNow(T0 + i * DAY);
    const o = toggleHabit(s, ctx, ids[0], day);
    s = run(s, o);
    if (i < 6) assert.ok(!o.events.some((e) => e.type === 'STREAK'));
    else assert.deepEqual(o.events.find((e) => e.type === 'STREAK'), { type: 'STREAK', habitTitle: 'H0', days: 7, stat: 'STR', points: 5 });
  }
  assert.equal(s.profile.totals.stats.STR, 7 * 2 + 5);
  s = run(s, toggleHabit(s, ctx, ids[0], '2026-11-09'));
  assert.equal(s.profile.totals.stats.STR, 6 * 2);
});

test('sick day neither breaks nor extends a streak', () => {
  let { s, ctx, ids } = withHabits(1);
  for (let i = 0; i < 6; i++) { ctx.setNow(T0 + i * DAY); s = run(s, toggleHabit(s, ctx, ids[0], addDays('2026-11-03', i))); }
  s = { ...s, days: { ...s.days, '2026-11-09': { day: '2026-11-09', habitsDone: [], sick: true, evaluated: true, habitLedger: {}, streakLedger: {} } } };
  ctx.setNow(T0 + 7 * DAY);
  const o = toggleHabit(s, ctx, ids[0], '2026-11-10');
  s = run(s, o);
  assert.equal(streakLength(s, ids[0], '2026-11-10'), 7);
  assert.ok(o.events.some((e) => e.type === 'STREAK'));
});

test('a future day cannot be checked', () => {
  const { s, ctx, ids } = withHabits(1);
  assert.throws(() => toggleHabit(s, ctx, ids[0], '2026-11-05'));
});

test('inactive habits do not block the daily bonus', () => {
  let { s, ctx, ids } = withHabits(2);
  s = { ...s, habits: { ...s.habits, [ids[1]]: { ...s.habits[ids[1]], active: false } } };
  const o = toggleHabit(s, ctx, ids[0], '2026-11-03');
  assert.ok(o.events.some((e) => e.type === 'DAILY_QUEST_COMPLETED'));
});
