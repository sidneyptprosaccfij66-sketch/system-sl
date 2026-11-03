// Persistence boundary: the engine talks only to this interface.
import type { Changes, GameState } from '../game/state';
import type { DayKey } from '../game/types';

export interface Repo {
  /** Full state, or null when this player has no profile yet. */
  load(): Promise<GameState | null>;
  init(state: GameState): Promise<void>;
  /** Persists changes made on top of `before` (this device's view). Totals and day records are merged field by field. */
  commit(c: Changes, before: GameState): Promise<void>;
  /** Remote changes (other devices). Called with the whole mirrored state. */
  subscribe(cb: (s: GameState) => void): () => void;
  /** Atomically claims the right to evaluate up to `day`; false if another device holds a fresh claim. */
  claimEvaluation(day: DayKey, token: string, now: number): Promise<boolean>;
}

export const EVAL_LOCK_TTL_MS = 120_000;

export interface EvalLock { day: DayKey; token: string; at: number }

export function canClaim(lock: EvalLock | null | undefined, day: DayKey, token: string, now: number): boolean {
  return !lock || lock.day < day || lock.token === token || now - lock.at > EVAL_LOCK_TTL_MS;
}
