import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../../src/app/engine';
import { createMemoryStore, createMemoryRepo } from '../../src/data/memoryRepo';
import type { Repo } from '../../src/data/repo';
import { createHabit, createTask, completeTask } from '../../src/game/actions';
import { toggleHabit } from '../../src/game/daily';

const at = (d: number, hMsk: number) => Date.UTC(2026, 10, d, hMsk - 3);
const opts = (clock: () => number) => { let n = 0; return { clock, rng: () => 0.5, newId: () => `x${++n}-${Math.random().toString(36).slice(2, 7)}` }; };

test('#1 two overlapping ticks on one engine evaluate a missed day once', async () => {
  const store = createMemoryStore();
  let now = at(3, 10);
  const e = createEngine(createMemoryRepo(store), opts(() => now));
  await e.boot('Никита');
  await e.run((s, c) => createHabit(s, c, { title: 'Отжимания', stat: 'STR' }));
  now = at(4, 9);
  await Promise.all([e.tick(), e.tick()]);
  assert.equal(Object.keys(store.state!.penalties).length, 1);
});

test('#2 a stale device does not erase another device\'s totals or habit checks', async () => {
  const store = createMemoryStore();
  const now = () => at(3, 12);
  const pc = createEngine(createMemoryRepo(store), opts(now));
  await pc.boot('Никита');
  await pc.run((s, c) => createHabit(s, c, { title: 'A', stat: 'STR' }));
  await pc.run((s, c) => createHabit(s, c, { title: 'B', stat: 'VIT' }));
  const [a, b] = Object.keys(pc.getState()!.habits);
  // phone loads now, then stops receiving updates (stale)
  const live = createMemoryRepo(store);
  const staleRepo: Repo = { ...live, subscribe: () => () => {} };
  const phone = createEngine(staleRepo, opts(now));
  await phone.start();
  await pc.run((s, c) => toggleHabit(s, c, a, '2026-11-03'));
  await phone.run((s, c) => toggleHabit(s, c, b, '2026-11-03'));
  const day = store.state!.days['2026-11-03'];
  assert.deepEqual([...day.habitsDone].sort(), [a, b].sort());
  assert.equal(store.state!.profile.totals.stats.STR, 2);
  assert.equal(store.state!.profile.totals.stats.VIT, 2);
  assert.equal(store.state!.profile.totals.xp, 40);
});

test('#3 ticking again on an already evaluated day does not reload everything', async () => {
  const store = createMemoryStore();
  const repo = createMemoryRepo(store);
  let loads = 0;
  const counting: Repo = { ...repo, load: async () => { loads++; return repo.load(); } };
  const e = createEngine(counting, opts(() => at(4, 9)));
  await createEngine(repo, opts(() => at(3, 9))).boot('Никита');
  await e.start();
  const after = loads;
  await e.tick(); await e.tick();
  assert.equal(loads, after);
});

test('engine shows game events without waiting for the server', async () => {
  const store = createMemoryStore();
  const e0 = createEngine(createMemoryRepo(store), opts(() => at(3, 12)));
  await e0.boot('Никита');
  await e0.run((s, c) => createTask(s, c, { kind: 'task', title: 'Зал', stat: 'STR', rank: 'B' }));
  const slow: Repo = { ...createMemoryRepo(store), commit: () => new Promise(() => {}) };
  const e = createEngine(slow, opts(() => at(3, 12)));
  await e.start();
  const id = Object.keys(e.getState()!.tasks)[0];
  void e.run((s, c) => completeTask(s, c, id));
  await new Promise((r) => setImmediate(r));
  assert.equal(e.events.current()?.event.type, 'QUEST_COMPLETED');
});
