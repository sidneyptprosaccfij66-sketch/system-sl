// Game state container, change sets and helpers shared by all actions.
import type { DayRecord, GameEvent, Habit, Idea, LedgerEntry, Learned, Penalty, Profile, RecurringTemplate, Skill, Task, DayKey } from './types';
import { dayKeyOf } from './time';

export interface GameState {
  profile: Profile;
  tasks: Record<string, Task>;
  habits: Record<string, Habit>;
  days: Record<DayKey, DayRecord>;
  recurring: Record<string, RecurringTemplate>;
  ideas: Record<string, Idea>;
  skills: Record<string, Skill>;
  penalties: Record<string, Penalty>;
  ledger: Record<string, LedgerEntry>;
  learned: Learned;
}

export type Collection = Exclude<keyof GameState, 'profile' | 'learned'>;
export const COLLECTIONS: readonly Collection[] = ['tasks', 'habits', 'days', 'recurring', 'ideas', 'skills', 'penalties', 'ledger'];
type Item<C extends Collection> = GameState[C][string];

export interface Changes {
  profile?: Profile;
  learned?: Learned;
  put: { [C in Collection]?: Item<C>[] };
  remove: { [C in Collection]?: string[] };
}

export interface Ctx { now: number; newId(): string; rng(): number }
export interface Outcome { changes: Changes; events: GameEvent[] }

export const emptyChanges = (): Changes => ({ put: {}, remove: {} });
export const emptyOutcome = (): Outcome => ({ changes: emptyChanges(), events: [] });

const idOf = (c: Collection, item: any): string => (c === 'days' ? item.day : item.id);

export function applyChanges(s: GameState, c: Changes): GameState {
  const next: GameState = { ...s };
  if (c.profile) next.profile = c.profile;
  if (c.learned) next.learned = c.learned;
  for (const col of COLLECTIONS) {
    const puts = c.put[col] as any[] | undefined;
    const rms = c.remove[col];
    if (!puts?.length && !rms?.length) continue;
    const map: Record<string, any> = { ...(s[col] as Record<string, any>) };
    for (const id of rms ?? []) delete map[id];
    for (const item of puts ?? []) map[idOf(col, item)] = item;
    (next as any)[col] = map;
  }
  return next;
}

/** Merge change sets in order: later puts win by id; a later put revives a removed id. */
export function mergeChanges(a: Changes, b: Changes): Changes {
  const out: Changes = { profile: b.profile ?? a.profile, learned: b.learned ?? a.learned, put: {}, remove: {} };
  for (const col of COLLECTIONS) {
    const byId = new Map<string, any>();
    for (const item of (a.put[col] as any[]) ?? []) byId.set(idOf(col, item), item);
    const removed = new Set(a.remove[col] ?? []);
    for (const id of b.remove[col] ?? []) { byId.delete(id); removed.add(id); }
    for (const item of (b.put[col] as any[]) ?? []) { byId.set(idOf(col, item), item); removed.delete(idOf(col, item)); }
    if (byId.size) (out.put as any)[col] = [...byId.values()];
    if (removed.size) out.remove[col] = [...removed];
  }
  if (!out.profile) delete out.profile;
  if (!out.learned) delete out.learned;
  return out;
}

export function mergeOutcomes(...os: Outcome[]): Outcome {
  return os.reduce((acc, o) => ({ changes: mergeChanges(acc.changes, o.changes), events: [...acc.events, ...o.events] }), emptyOutcome());
}

/** Run steps in sequence, each on the state produced by the previous ones. */
export function chain(s: GameState, ...steps: ((s: GameState) => Outcome)[]): Outcome {
  let cur = s;
  let acc = emptyOutcome();
  for (const step of steps) {
    const o = step(cur);
    cur = applyChanges(cur, o.changes);
    acc = mergeOutcomes(acc, o);
  }
  return acc;
}

export const isPenaltyZone = (s: GameState, _now: number): boolean => Object.values(s.penalties).some((p) => p.status === 'active');

export const todayKey = (s: GameState, now: number): DayKey => dayKeyOf(now, s.profile.settings.timezone, s.profile.settings.dayEndHour);

export class GameError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
