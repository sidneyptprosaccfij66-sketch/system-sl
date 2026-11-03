// Ledger entries and totals (spec §3.2). The ledger is append-only: corrections are 'revert' entries.
import type { GameEvent, LedgerEntry, LedgerKind, StatCode, Totals } from './types';
import { type Ctx, type GameState, type Outcome, GameError, emptyChanges, isPenaltyZone, todayKey } from './state';
import { hunterRank, levelFromXp, statLevel } from './levels';

export interface AwardResult { entry: LedgerEntry; totals: Totals; events: GameEvent[] }

function addToTotals(t: Totals, stat: StatCode, points: number, xp: number): Totals {
  return { xp: t.xp + xp, stats: { ...t.stats, [stat]: t.stats[stat] + points } };
}

/** Level/rank events between two totals; only upward changes produce events. */
export function progressEvents(before: Totals, after: Totals, stat: StatCode): GameEvent[] {
  const ev: GameEvent[] = [];
  const s0 = statLevel(before.stats[stat]), s1 = statLevel(after.stats[stat]);
  if (s1 > s0) ev.push({ type: 'STAT_LEVEL_UP', stat, from: s0, to: s1 });
  const l0 = levelFromXp(before.xp), l1 = levelFromXp(after.xp);
  if (l1 > l0) ev.push({ type: 'LEVEL_UP', from: l0, to: l1 });
  const r0 = hunterRank(l0), r1 = hunterRank(l1);
  if (l1 > l0 && r1 !== r0) ev.push({ type: 'RANK_UP', from: r0, to: r1 });
  return ev;
}

export function award(s: GameState, ctx: Ctx, a: { kind: LedgerKind; stat: StatCode; basePoints: number; refId: string; multiplier?: 1 | 0.5 }): AwardResult {
  const m: 1 | 0.5 = a.multiplier ?? (isPenaltyZone(s, ctx.now) ? 0.5 : 1);
  const points = m === 1 ? a.basePoints : Math.max(1, Math.floor(a.basePoints * m));
  const xp = m === 1 ? a.basePoints * 10 : Math.max(10, Math.floor(a.basePoints * 10 * m));
  const entry: LedgerEntry = { id: ctx.newId(), at: ctx.now, day: todayKey(s, ctx.now), kind: a.kind, stat: a.stat, points, xp, multiplier: m, refId: a.refId };
  const before = s.profile.totals;
  const totals = addToTotals(before, a.stat, points, xp);
  return { entry, totals, events: progressEvents(before, totals, a.stat) };
}

export function revert(s: GameState, ctx: Ctx, entryId: string): AwardResult {
  const orig = s.ledger[entryId];
  if (!orig) throw new GameError('LEDGER_MISSING', 'Это выполнено слишком давно — отменить начисление нельзя');
  const entry: LedgerEntry = { id: ctx.newId(), at: ctx.now, day: todayKey(s, ctx.now), kind: 'revert', stat: orig.stat, points: -orig.points, xp: -orig.xp, multiplier: orig.multiplier, refId: orig.refId, revertsId: orig.id };
  return { entry, totals: addToTotals(s.profile.totals, orig.stat, -orig.points, -orig.xp), events: [] };
}

/** Entry with exact values (penalty losses): no multiplier, no events. */
export function rawEntry(s: GameState, ctx: Ctx, e: { kind: LedgerKind; stat: StatCode; points: number; xp: number; refId?: string }): AwardResult {
  const entry: LedgerEntry = { id: ctx.newId(), at: ctx.now, day: todayKey(s, ctx.now), kind: e.kind, stat: e.stat, points: e.points, xp: e.xp, multiplier: 1, refId: e.refId };
  return { entry, totals: addToTotals(s.profile.totals, e.stat, e.points, e.xp), events: [] };
}

export function toOutcome(s: GameState, r: AwardResult): Outcome {
  const changes = emptyChanges();
  changes.put.ledger = [r.entry];
  changes.profile = { ...s.profile, totals: r.totals };
  return { changes, events: r.events };
}
