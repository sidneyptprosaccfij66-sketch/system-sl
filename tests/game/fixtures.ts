// Test helpers: a minimal game state and a deterministic context.
import type { GameState } from '../../src/game/state';
import type { Ctx } from '../../src/game/state';
import { STATS, type Profile, type StatCode } from '../../src/game/types';

export const T0 = Date.UTC(2026, 10, 3, 9, 0); // 2026-11-03 12:00 MSK

export function makeState(over: Partial<Profile> = {}): GameState {
  const stats = Object.fromEntries(STATS.map((s) => [s, 0])) as Record<StatCode, number>;
  const profile: Profile = {
    name: 'Никита', createdAt: T0, firstDay: '2026-11-03',
    totals: { xp: 0, stats },
    settings: {
      timezone: 'Europe/Moscow', dayEndHour: 0, sickDaysPerMonth: 2, sound: false,
      restrictions: [
        { id: 'r1', text: 'Без YouTube', enabled: true },
        { id: 'r2', text: 'Без музыки', enabled: true },
        { id: 'r3', text: 'Без игр', enabled: true },
      ],
      calendar: { connected: false, imports: [] },
    },
    ...over,
  };
  return { profile, tasks: {}, habits: {}, days: {}, recurring: {}, ideas: {}, skills: {}, penalties: {}, ledger: {}, learned: {} };
}

export function makeCtx(now = T0, seed = 1): Ctx & { setNow(t: number): void } {
  let n = 0;
  let s = seed;
  const ctx = {
    now,
    newId: () => `id${++n}`,
    rng: () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; },
    setNow(t: number) { ctx.now = t; },
  };
  return ctx;
}

export const withTotals = (s: GameState, xp: number, stats: Partial<Record<StatCode, number>> = {}): GameState =>
  ({ ...s, profile: { ...s.profile, totals: { xp, stats: { ...s.profile.totals.stats, ...stats } } } });
