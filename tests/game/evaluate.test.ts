import { test } from 'node:test';
import assert from 'node:assert/strict';
import { severityFor, scoreDay, evaluatePending, checkPenalties, servePenalty, markSick, PenaltyNotFinishedError, SickLimitError } from '../../src/game/evaluate';
import { createTask, createHabit } from '../../src/game/actions';
import { applyChanges, type GameState, type Outcome } from '../../src/game/state';
import type { Rank } from '../../src/game/types';
import { makeCtx, makeState, withTotals } from './fixtures';

const run = (s: GameState, o: Outcome) => applyChanges(s, o.changes);
const at = (y: number, mo: number, d: number, hMsk: number, mi = 0) => Date.UTC(y, mo - 1, d, hMsk - 3, mi);
const H = 3600e3;

function withTasks(ranks: Rank[], day = '2026-11-03', extra: Partial<{ penalize: boolean }> = {}) {
  const ctx = makeCtx(at(2026, 11, 3, 10));
  let s = makeState();
  for (const r of ranks) s = run(s, createTask(s, ctx, { kind: 'task', title: `Задача ${r}`, stat: 'DIS', rank: r, dueDay: day, ...extra }));
  return { s, ctx };
}
const penalties = (s: GameState) => Object.values(s.penalties);

test('severity thresholds', () => {
  assert.equal(severityFor(0), null);
  assert.equal(severityFor(1), 'light'); assert.equal(severityFor(3), 'light');
  assert.equal(severityFor(4), 'medium'); assert.equal(severityFor(8), 'medium');
  assert.equal(severityFor(9), 'heavy');
});

test('an empty day gives no penalty', () => {
  const ctx = makeCtx(at(2026, 11, 4, 9));
  const s0 = makeState();
  const s = run(s0, evaluatePending(s0, ctx));
  assert.equal(penalties(s).length, 0);
  assert.equal(s.profile.lastEvaluatedDay, '2026-11-03');
  assert.equal(s.days['2026-11-03'].evaluated, true);
});

test('unfinished daily quest → medium (5)', () => {
  const ctx = makeCtx(at(2026, 11, 3, 10));
  let s = makeState();
  s = run(s, createHabit(s, ctx, { title: 'Отжимания', stat: 'STR' }));
  ctx.setNow(at(2026, 11, 4, 9));
  const o = evaluatePending(s, ctx);
  s = run(s, o);
  const [p] = penalties(s);
  assert.equal(p.severity, 'medium'); assert.equal(p.score, 5);
  assert.equal(p.restrictions.length, 1);
  assert.equal(p.targetDay, '2026-11-04');
  assert.ok(o.events.some((e) => e.type === 'PENALTY'));
});

test('two B + one E → 5 → medium; tasks become failed', () => {
  let { s, ctx } = withTasks(['B', 'B', 'E']);
  ctx.setNow(at(2026, 11, 4, 9));
  s = run(s, evaluatePending(s, ctx));
  assert.equal(penalties(s)[0].severity, 'medium');
  assert.equal(penalties(s)[0].score, 5);
  assert.ok(Object.values(s.tasks).every((t) => t.status === 'failed'));
});

test('one E → light until 15:00 next day', () => {
  let { s, ctx } = withTasks(['E']);
  ctx.setNow(at(2026, 11, 4, 9));
  s = run(s, evaluatePending(s, ctx));
  const [p] = penalties(s);
  assert.equal(p.severity, 'light');
  assert.equal(p.activeUntil, at(2026, 11, 4, 15));
});

test('S + S + E → 9 → heavy with 2 different restrictions', () => {
  let { s, ctx } = withTasks(['S', 'S', 'E']);
  ctx.setNow(at(2026, 11, 4, 9));
  s = run(s, evaluatePending(s, ctx));
  const [p] = penalties(s);
  assert.equal(p.severity, 'heavy'); assert.equal(p.score, 9);
  assert.equal(p.restrictions.length, 2);
  assert.notEqual(p.restrictions[0], p.restrictions[1]);
  assert.equal(p.activeUntil, at(2026, 11, 5, 0));
});

test('sick day → no penalty, task still failed', () => {
  let { s, ctx } = withTasks(['A']);
  s = run(s, markSick(s, ctx, '2026-11-03'));
  ctx.setNow(at(2026, 11, 4, 9));
  s = run(s, evaluatePending(s, ctx));
  assert.equal(penalties(s).length, 0);
  assert.equal(Object.values(s.tasks)[0].status, 'failed');
});

test('calendar task with penalize=false → failed, no score', () => {
  let { s, ctx } = withTasks(['A'], '2026-11-03', { penalize: false });
  assert.equal(scoreDay(s, '2026-11-03').score, 0);
  ctx.setNow(at(2026, 11, 4, 9));
  s = run(s, evaluatePending(s, ctx));
  assert.equal(penalties(s).length, 0);
  assert.equal(Object.values(s.tasks)[0].status, 'failed');
});

test('three missed days are evaluated once each; a second run does nothing', () => {
  const ctx = makeCtx(at(2026, 11, 3, 10));
  let s = makeState();
  s = run(s, createHabit(s, ctx, { title: 'Отжимания', stat: 'STR' }));
  ctx.setNow(at(2026, 11, 6, 9));
  s = run(s, evaluatePending(s, ctx));
  assert.equal(penalties(s).length, 3);
  assert.deepEqual(penalties(s).map((p) => p.forDay).sort(), ['2026-11-03', '2026-11-04', '2026-11-05']);
  assert.ok(penalties(s).every((p) => p.targetDay === '2026-11-06'));
  const again = evaluatePending(s, ctx);
  assert.deepEqual(again.events, []);
  assert.equal(run(s, again).profile.lastEvaluatedDay, '2026-11-05');
  assert.equal(Object.keys(run(s, again).penalties).length, 3);
});

test('light penalty issued after 15:00 of the target day moves to tomorrow', () => {
  let { s, ctx } = withTasks(['E']);
  ctx.setNow(at(2026, 11, 5, 16)); // two days later, 16:00
  s = run(s, evaluatePending(s, ctx));
  const p = penalties(s).find((x) => x.forDay === '2026-11-03')!;
  assert.equal(p.targetDay, '2026-11-06');
  assert.equal(p.activeUntil, at(2026, 11, 6, 15));
});

test('all restrictions disabled → penalty with no restrictions, zone active', () => {
  let { s, ctx } = withTasks(['B', 'B']);
  s = { ...s, profile: { ...s.profile, settings: { ...s.profile.settings, restrictions: s.profile.settings.restrictions.map((r) => ({ ...r, enabled: false })) } } };
  ctx.setNow(at(2026, 11, 4, 9));
  s = run(s, evaluatePending(s, ctx));
  assert.deepEqual(penalties(s)[0].restrictions, []);
  assert.equal(penalties(s)[0].status, 'active');
});

test('48h after activeUntil an unserved penalty fails and burns 20% of in-level progress', () => {
  let { s, ctx } = withTasks(['B', 'B']);
  s = withTotals(s, 500, { STR: 7, INT: 25 });
  ctx.setNow(at(2026, 11, 4, 9));
  s = run(s, evaluatePending(s, ctx));
  const p = penalties(s)[0];
  ctx.setNow(p.activeUntil + 48 * H - 1);
  assert.deepEqual(checkPenalties(s, ctx).events, []);
  ctx.setNow(p.activeUntil + 48 * H);
  const o = checkPenalties(s, ctx);
  s = run(s, o);
  assert.equal(s.penalties[p.id].status, 'failed');
  assert.deepEqual(o.events, [{ type: 'PENALTY_FAILED', penaltyId: p.id }]);
  assert.equal(s.profile.totals.stats.STR, 7);   // into 2 → floor(0.4) = 0
  assert.equal(s.profile.totals.stats.INT, 24);  // lvl 6, into 5 → −1
  assert.equal(s.profile.totals.xp, 500);
});

test('serving before activeUntil is refused; after it works', () => {
  let { s, ctx } = withTasks(['B', 'B']);
  ctx.setNow(at(2026, 11, 4, 9));
  s = run(s, evaluatePending(s, ctx));
  const p = penalties(s)[0];
  assert.throws(() => servePenalty(s, ctx, p.id), PenaltyNotFinishedError);
  ctx.setNow(p.activeUntil);
  s = run(s, servePenalty(s, ctx, p.id));
  assert.equal(s.penalties[p.id].status, 'served');
});

test('third sick day in a month is refused', () => {
  const ctx = makeCtx(at(2026, 11, 3, 10));
  let s = makeState();
  s = run(s, markSick(s, ctx, '2026-11-03'));
  ctx.setNow(at(2026, 11, 4, 10));
  s = { ...s, days: { ...s.days, '2026-11-03': { ...s.days['2026-11-03'], evaluated: true } } };
  s = run(s, markSick(s, ctx, '2026-11-04'));
  ctx.setNow(at(2026, 11, 5, 10));
  assert.throws(() => markSick(s, ctx, '2026-11-05'), SickLimitError);
});

test('switching dayEndHour 0 → 22 neither repeats nor skips a day', () => {
  const ctx = makeCtx(at(2026, 11, 4, 9));
  let s = makeState();
  s = run(s, evaluatePending(s, ctx));
  assert.equal(s.profile.lastEvaluatedDay, '2026-11-03');
  s = { ...s, profile: { ...s.profile, settings: { ...s.profile.settings, dayEndHour: 22 } } };
  ctx.setNow(at(2026, 11, 4, 23)); // with h=22 today is 2026-11-05
  s = run(s, evaluatePending(s, ctx));
  assert.equal(s.profile.lastEvaluatedDay, '2026-11-04');
  assert.equal(Object.values(s.days).filter((d) => d.evaluated).length, 2);
});
