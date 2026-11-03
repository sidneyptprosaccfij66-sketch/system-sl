import { test } from 'node:test';
import assert from 'node:assert/strict';
import { award, revert, toOutcome } from '../../src/game/awards';
import { applyChanges, emptyChanges, isPenaltyZone } from '../../src/game/state';
import type { Penalty } from '../../src/game/types';
import { makeCtx, makeState, withTotals, T0 } from './fixtures';

const activePenalty: Penalty = { id: 'p1', forDay: '2026-11-02', targetDay: '2026-11-03', issuedAt: T0 - 1000, severity: 'medium', score: 5, reasons: [], restrictions: [], activeUntil: T0 + 3600e3, status: 'active' };

test('C task without penalty: 3 points, 30 xp', () => {
  const s = makeState();
  const r = award(s, makeCtx(), { kind: 'task', stat: 'STR', basePoints: 3, refId: 't1' });
  assert.equal(r.entry.points, 3); assert.equal(r.entry.xp, 30); assert.equal(r.entry.multiplier, 1);
  assert.equal(r.totals.stats.STR, 3); assert.equal(r.totals.xp, 30);
  assert.equal(r.entry.day, '2026-11-03');
});

test('under penalty: C gives 1 point / 15 xp, S gives 6 / 65', () => {
  const s = { ...makeState(), penalties: { p1: activePenalty } };
  assert.ok(isPenaltyZone(s, T0));
  const c = award(s, makeCtx(), { kind: 'task', stat: 'STR', basePoints: 3, refId: 't1' });
  assert.equal(c.entry.points, 1); assert.equal(c.entry.xp, 15); assert.equal(c.entry.multiplier, 0.5);
  const sr = award(s, makeCtx(), { kind: 'task', stat: 'STR', basePoints: 13, refId: 't2' });
  assert.equal(sr.entry.points, 6); assert.equal(sr.entry.xp, 65);
});

test('crossing 100 xp emits LEVEL_UP 1→2', () => {
  const s = withTotals(makeState(), 95);
  const r = award(s, makeCtx(), { kind: 'task', stat: 'INT', basePoints: 3, refId: 't' });
  assert.deepEqual(r.events.filter((e) => e.type === 'LEVEL_UP'), [{ type: 'LEVEL_UP', from: 1, to: 2 }]);
});

test('crossing 2700 xp emits LEVEL_UP 9→10 then RANK_UP E→D', () => {
  const s = withTotals(makeState(), 2690);
  const r = award(s, makeCtx(), { kind: 'task', stat: 'INT', basePoints: 3, refId: 't' });
  const ev = r.events.filter((e) => e.type !== 'STAT_LEVEL_UP');
  assert.deepEqual(ev.map((e) => e.type), ['LEVEL_UP', 'RANK_UP']);
  assert.deepEqual(ev[1], { type: 'RANK_UP', from: 'E', to: 'D' });
});

test('STR 4→5 points emits STAT_LEVEL_UP 2→3 before LEVEL_UP', () => {
  const s = withTotals(makeState(), 95, { STR: 4 });
  const r = award(s, makeCtx(), { kind: 'task', stat: 'STR', basePoints: 1, refId: 't' });
  assert.deepEqual(r.events[0], { type: 'STAT_LEVEL_UP', stat: 'STR', from: 2, to: 3 });
  assert.equal(r.events[1].type, 'LEVEL_UP');
});

test('revert restores totals exactly and emits nothing', () => {
  const s0 = withTotals(makeState(), 95, { STR: 4 });
  const ctx = makeCtx();
  const s1 = applyChanges(s0, toOutcome(s0, award(s0, ctx, { kind: 'task', stat: 'STR', basePoints: 5, refId: 't' })).changes);
  const entryId = Object.keys(s1.ledger)[0];
  const r = revert(s1, ctx, entryId);
  assert.deepEqual(r.totals, s0.profile.totals);
  assert.equal(r.entry.kind, 'revert'); assert.equal(r.entry.revertsId, entryId);
  assert.equal(r.entry.points, -5); assert.equal(r.entry.xp, -50);
});

test('applyChanges does not mutate its input', () => {
  const s0 = makeState();
  const frozen = JSON.stringify(s0);
  const c = emptyChanges();
  c.put.tasks = [{ id: 'x', kind: 'task', title: 'a', stat: 'DIS', rank: 'E', points: 1, status: 'open', source: 'manual', penalize: true, createdAt: T0 }];
  const s1 = applyChanges(s0, c);
  assert.equal(JSON.stringify(s0), frozen);
  assert.equal(s1.tasks.x.title, 'a');
  const c2 = emptyChanges(); c2.remove.tasks = ['x'];
  assert.equal(applyChanges(s1, c2).tasks.x, undefined);
});
