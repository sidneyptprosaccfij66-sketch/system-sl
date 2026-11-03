import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../../src/app/engine';
import { createMemoryStore, createMemoryRepo } from '../../src/data/memoryRepo';
import { createTask, completeTask, createHabit } from '../../src/game/actions';
import type { Repo } from '../../src/data/repo';

const at = (d: number, hMsk: number) => Date.UTC(2026, 10, d, hMsk - 3);
function opts(now: () => number) { let n = 0; return { clock: now, rng: () => 0.42, newId: () => `e${++n}-${Math.random().toString(36).slice(2, 8)}` }; }

test('boot on an empty repo creates a profile starting today', async () => {
  const store = createMemoryStore();
  const e = createEngine(createMemoryRepo(store), opts(() => at(3, 12)));
  assert.equal(await e.start(), 'new');
  await e.create('Никита');
  assert.equal(e.getState()!.profile.firstDay, '2026-11-03');
  assert.equal(store.state!.profile.name, 'Никита');
  assert.equal(await createEngine(createMemoryRepo(store), opts(() => at(3, 13))).start(), 'ready');
});

test('run(completeTask) persists the ledger entry and totals', async () => {
  const store = createMemoryStore();
  const e = createEngine(createMemoryRepo(store), opts(() => at(3, 12)));
  await e.boot('Никита');
  await e.run((s, ctx) => createTask(s, ctx, { kind: 'task', title: 'Зал', stat: 'STR', rank: 'B' }));
  const id = Object.keys(e.getState()!.tasks)[0];
  const seen: string[] = [];
  e.events.subscribe(() => { const c = e.events.current(); if (c) seen.push(c.event.type); });
  assert.equal(await e.run((s, ctx) => completeTask(s, ctx, id)), true);
  assert.equal(store.state!.profile.totals.stats.STR, 5);
  assert.equal(Object.values(store.state!.ledger).length, 1);
  assert.ok(seen.includes('QUEST_COMPLETED'));
});

test('two devices opening after a missed day issue the penalty once', async () => {
  const store = createMemoryStore();
  const a = createEngine(createMemoryRepo(store), opts(() => at(3, 10)));
  await a.boot('Никита');
  await a.run((s, ctx) => createHabit(s, ctx, { title: 'Отжимания', stat: 'STR' }));
  const phone = createEngine(createMemoryRepo(store), opts(() => at(4, 9)));
  const pc = createEngine(createMemoryRepo(store), opts(() => at(4, 9)));
  await Promise.all([phone.start(), pc.start()]);
  assert.equal(Object.keys(store.state!.penalties).length, 1);
  assert.equal(Object.keys(pc.getState()!.penalties).length, 1);
});

test('a failed save rolls the state back and reports an error', async () => {
  const store = createMemoryStore();
  const repo = createMemoryRepo(store);
  const e = createEngine(repo, opts(() => at(3, 12)));
  await e.boot('Никита');
  const broken: Repo = { ...repo, commit: async () => { throw new Error('offline'); } };
  const e2 = createEngine(broken, opts(() => at(3, 12)));
  await e2.start();
  const ok = await e2.run((s, ctx) => createTask(s, ctx, { kind: 'task', title: 'X', stat: 'DIS', rank: 'E' }));
  assert.equal(ok, false);
  assert.deepEqual(e2.getState()!.tasks, {});
  assert.equal(e2.events.current()?.event.type, 'ERROR');
});

test('a game error (e.g. empty title) is reported, nothing changes', async () => {
  const e = createEngine(createMemoryRepo(createMemoryStore()), opts(() => at(3, 12)));
  await e.boot('Никита');
  const ok = await e.run((s, ctx) => createTask(s, ctx, { kind: 'task', title: ' ', stat: 'DIS', rank: 'E' }));
  assert.equal(ok, false);
  const ev = e.events.current()?.event;
  assert.equal(ev?.type, 'ERROR');
  assert.match(ev?.type === 'ERROR' ? ev.message : '', /Напиши/);
});
