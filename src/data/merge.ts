// Field-level patches so a device with stale state never overwrites another device's work.
import { STATS, type DayRecord, type Profile, type StatCode, type Totals } from '../game/types';

export interface TotalsDelta { xp: number; stats: Partial<Record<StatCode, number>> }
export interface ProfilePatch { fields: Partial<Omit<Profile, 'totals'>>; delta: TotalsDelta }

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function totalsDelta(before: Totals, after: Totals): TotalsDelta {
  const stats: Partial<Record<StatCode, number>> = {};
  for (const s of STATS) { const d = after.stats[s] - before.stats[s]; if (d) stats[s] = d; }
  return { xp: after.xp - before.xp, stats };
}

export function profilePatch(before: Profile, after: Profile): ProfilePatch {
  const fields: Partial<Omit<Profile, 'totals'>> = {};
  for (const k of Object.keys(after) as (keyof Profile)[]) {
    if (k === 'totals') continue;
    if (!same(before[k], after[k])) (fields as any)[k] = after[k];
  }
  return { fields, delta: totalsDelta(before.totals, after.totals) };
}

export function applyProfilePatch(stored: Profile, p: ProfilePatch): Profile {
  const stats = { ...stored.totals.stats };
  for (const [s, d] of Object.entries(p.delta.stats) as [StatCode, number][]) stats[s] += d;
  return { ...stored, ...p.fields, totals: { xp: stored.totals.xp + p.delta.xp, stats } };
}

type MapKey = 'habitLedger' | 'streakLedger' | 'streaks';
export interface DayPatch {
  day: string;
  /** Scalar fields that changed on this device (null = remove). */
  set: { sick?: boolean; evaluated?: boolean; bonusLedgerId?: string | null };
  addDone: string[];
  removeDone: string[];
  maps: Record<MapKey, Record<string, string | number | null>>;
}

function mapDiff(before: Record<string, any> = {}, after: Record<string, any> = {}): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of Object.keys(after)) if (before[k] !== after[k]) out[k] = after[k];
  for (const k of Object.keys(before)) if (!(k in after)) out[k] = null;
  return out;
}

export function dayPatch(before: DayRecord | undefined, after: DayRecord): DayPatch {
  const b: Partial<DayRecord> = before ?? {};
  const set: DayPatch['set'] = {};
  if (b.sick !== after.sick) set.sick = after.sick;
  if (b.evaluated !== after.evaluated) set.evaluated = after.evaluated;
  if (b.bonusLedgerId !== after.bonusLedgerId) set.bonusLedgerId = after.bonusLedgerId ?? null;
  const was = new Set(b.habitsDone ?? []), now = new Set(after.habitsDone);
  return {
    day: after.day,
    set,
    addDone: after.habitsDone.filter((h) => !was.has(h)),
    removeDone: [...was].filter((h) => !now.has(h)),
    maps: { habitLedger: mapDiff(b.habitLedger, after.habitLedger), streakLedger: mapDiff(b.streakLedger, after.streakLedger), streaks: mapDiff(b.streaks, after.streaks) },
  };
}

export function applyDayPatch(stored: DayRecord | undefined, p: DayPatch): DayRecord {
  const base: DayRecord = stored ?? { day: p.day, habitsDone: [], sick: false, evaluated: false, habitLedger: {}, streakLedger: {} };
  const next: DayRecord = { ...base, habitLedger: { ...base.habitLedger }, streakLedger: { ...base.streakLedger }, streaks: { ...base.streaks } };
  if (p.set.sick !== undefined) next.sick = p.set.sick;
  if (p.set.evaluated !== undefined) next.evaluated = p.set.evaluated;
  if (p.set.bonusLedgerId !== undefined) { if (p.set.bonusLedgerId === null) delete next.bonusLedgerId; else next.bonusLedgerId = p.set.bonusLedgerId; }
  next.habitsDone = [...new Set([...base.habitsDone, ...p.addDone])].filter((h) => !p.removeDone.includes(h));
  for (const key of ['habitLedger', 'streakLedger', 'streaks'] as MapKey[]) {
    for (const [k, v] of Object.entries(p.maps[key])) {
      if (v === null) delete (next[key] as any)[k];
      else (next[key] as any)[k] = v;
    }
  }
  return next;
}
