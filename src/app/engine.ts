// Runs game actions: applies outcomes optimistically, persists them, and feeds events to the UI.
import { type Ctx, type GameState, type Outcome, GameError, applyChanges, chain, todayKey } from '../game/state';
import { addDays, dayEnd } from '../game/time';
import { PENALTY_GRACE_MS } from '../game/evaluate';
import { newGameState } from '../game/defaults';
import { evaluatePending } from '../game/evaluate';
import { generateRecurring } from '../game/recurring';
import { checkSkillUnlocks } from '../game/skills';
import type { Repo } from '../data/repo';
import { createEventQueue, type EventQueue } from '../ui/fx/eventQueue';

export interface EngineOpts { clock(): number; rng(): number; newId(): string }
export type Action = (s: GameState, ctx: Ctx) => Outcome;

export interface Engine {
  getState(): GameState | null;
  subscribe(cb: () => void): () => void;
  events: EventQueue;
  /** Loads the profile and runs the daily tick. 'new' means no profile yet (show onboarding). */
  start(): Promise<'ready' | 'new'>;
  create(name: string): Promise<void>;
  /** start() + create() when needed (tests, demo). */
  boot(name: string): Promise<void>;
  run(action: Action): Promise<boolean>;
  /** End-of-day evaluation, recurring chores, skill unlocks. Safe to call any time. */
  tick(): Promise<void>;
  /** Re-runs tick() right after each day boundary and when the app becomes visible. Returns a stop function. */
  autoTick(): () => void;
  now(): number;
}

export const SAVE_ERROR = 'Не удалось сохранить. Проверь интернет и повтори.';

export function createEngine(repo: Repo, opts: EngineOpts): Engine {
  let state: GameState | null = null;
  const subs = new Set<() => void>();
  const events = createEventQueue();
  const token = opts.newId();
  const notify = () => subs.forEach((s) => s());
  const ctx = (): Ctx => ({ now: opts.clock(), newId: opts.newId, rng: opts.rng });
  let unsubscribeRepo: (() => void) | null = null;
  let tickInFlight: Promise<void> | null = null;

  /** True when a past day is not evaluated yet or an active penalty has run out its 48 h. */
  function needsEvaluation(s: GameState, now: number): boolean {
    const today = todayKey(s, now);
    const last = s.profile.lastEvaluatedDay ?? addDays(s.profile.firstDay, -1);
    if (last < addDays(today, -1)) return true;
    return Object.values(s.penalties).some((p) => p.status === 'active' && now >= p.activeUntil + PENALTY_GRACE_MS);
  }

  async function runTick(): Promise<void> {
    if (!state) return;
    const c = ctx();
    const steps: ((s: GameState) => Outcome)[] = [];
    if (needsEvaluation(state, c.now) && (await repo.claimEvaluation(todayKey(state, c.now), token, c.now))) {
      const fresh = await repo.load();
      if (fresh) state = fresh;
      if (needsEvaluation(state, c.now)) steps.push((s) => evaluatePending(s, c));
    }
    steps.push((s) => generateRecurring(s, c), (s) => checkSkillUnlocks(s));
    const outcome = chain(state!, ...steps);
    const empty = !outcome.events.length && !outcome.changes.profile && !Object.keys(outcome.changes.put).length && !Object.keys(outcome.changes.remove).length;
    if (!empty) await apply(outcome);
  }

  async function apply(outcome: Outcome): Promise<boolean> {
    if (!state) return false;
    const before = state;
    state = applyChanges(state, outcome.changes);
    notify();
    events.push(outcome.events);
    try {
      await repo.commit(outcome.changes, before);
    } catch {
      state = before;
      notify();
      events.push([{ type: 'ERROR', message: SAVE_ERROR }]);
      return false;
    }
    return true;
  }

  const engine: Engine = {
    getState: () => state,
    subscribe(cb) { subs.add(cb); return () => { subs.delete(cb); }; },
    events,
    now: () => opts.clock(),

    async start() {
      state = await repo.load();
      if (!state) return 'new';
      unsubscribeRepo ??= repo.subscribe((s) => { state = s; notify(); });
      notify();
      await engine.tick();
      return 'ready';
    },

    async create(name) {
      const fresh = newGameState(name.trim() || 'Игрок', opts.clock());
      await repo.init(fresh);
      state = fresh;
      unsubscribeRepo ??= repo.subscribe((s) => { state = s; notify(); });
      notify();
      await engine.tick();
    },

    async boot(name) {
      if ((await engine.start()) === 'new') await engine.create(name);
    },

    async run(action) {
      if (!state) return false;
      let outcome: Outcome;
      try {
        outcome = chain(state, (s) => action(s, ctx()), (s) => checkSkillUnlocks(s));
      } catch (e) {
        events.push([{ type: 'ERROR', message: e instanceof GameError ? e.message : String(e) }]);
        return false;
      }
      return apply(outcome);
    },

    tick() {
      tickInFlight ??= runTick().finally(() => { tickInFlight = null; });
      return tickInFlight;
    },

    autoTick() {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let stopped = false;
      const schedule = () => {
        if (stopped || !state) return;
        const now = opts.clock();
        const { timezone, dayEndHour } = state.profile.settings;
        const until = dayEnd(todayKey(state, now), timezone, dayEndHour) - now + 1000;
        timer = setTimeout(() => { void engine.tick().finally(schedule); }, Math.min(Math.max(until, 1000), 3_600_000));
      };
      const onVisible = () => { if (typeof document !== 'undefined' && document.visibilityState === 'visible') void engine.tick(); };
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
      schedule();
      return () => { stopped = true; clearTimeout(timer); if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible); };
    },
  };
  return engine;
}
