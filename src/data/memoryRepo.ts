// In-memory repository (tests, demo mode). Several repos on one store behave like several devices.
import { applyChanges, type Changes, type GameState } from '../game/state';
import { canClaim, type EvalLock, type Repo } from './repo';
import { applyDayPatch, applyProfilePatch, dayPatch, profilePatch } from './merge';

export interface MemoryStore { state: GameState | null; lock: EvalLock | null; listeners: Set<(s: GameState) => void> }

export const createMemoryStore = (state: GameState | null = null): MemoryStore => ({ state, lock: null, listeners: new Set() });

const clone = <T>(v: T): T => structuredClone(v);

export function createMemoryRepo(store: MemoryStore, onChange?: (s: GameState) => void): Repo {
  const emit = () => { if (store.state) { const snap = store.state; store.listeners.forEach((l) => l(snap)); onChange?.(snap); } };
  return {
    async load() { return store.state ? clone(store.state) : null; },
    async init(state) { store.state = clone(state); emit(); },
    async commit(c: Changes, before) {
      if (!store.state) throw new Error('no state');
      const { profile, put: { days, ...put }, ...rest } = clone(c);
      let next = applyChanges(store.state, { ...rest, put });
      if (profile) next = { ...next, profile: applyProfilePatch(next.profile, profilePatch(before.profile, profile)) };
      if (days?.length) {
        const merged = { ...next.days };
        for (const d of days) merged[d.day] = applyDayPatch(merged[d.day], dayPatch(before.days[d.day], d));
        next = { ...next, days: merged };
      }
      store.state = next;
      emit();
    },
    subscribe(cb) { store.listeners.add(cb); return () => { store.listeners.delete(cb); }; },
    async claimEvaluation(day, token, now) {
      if (!canClaim(store.lock, day, token, now)) return false;
      store.lock = { day, token, at: now };
      return true;
    },
  };
}
