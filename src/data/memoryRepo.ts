// In-memory repository (tests, demo mode). Several repos on one store behave like several devices.
import { applyChanges, type Changes, type GameState } from '../game/state';
import { canClaim, type EvalLock, type Repo } from './repo';

export interface MemoryStore { state: GameState | null; lock: EvalLock | null; listeners: Set<(s: GameState) => void> }

export const createMemoryStore = (state: GameState | null = null): MemoryStore => ({ state, lock: null, listeners: new Set() });

const clone = <T>(v: T): T => structuredClone(v);

export function createMemoryRepo(store: MemoryStore, onChange?: (s: GameState) => void): Repo {
  const emit = () => { if (store.state) { const snap = store.state; store.listeners.forEach((l) => l(snap)); onChange?.(snap); } };
  return {
    async load() { return store.state ? clone(store.state) : null; },
    async init(state) { store.state = clone(state); emit(); },
    async commit(c: Changes) {
      if (!store.state) throw new Error('no state');
      store.state = applyChanges(store.state, clone(c));
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
