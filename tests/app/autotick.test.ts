import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../../src/app/engine';
import { createMemoryStore, createMemoryRepo } from '../../src/data/memoryRepo';
import { createHabit } from '../../src/game/actions';

test('crossing midnight with the app open evaluates the day once', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    let now = Date.UTC(2026, 10, 3, 20, 59); // 23:59 MSK
    const store = createMemoryStore();
    let n = 0;
    const e = createEngine(createMemoryRepo(store), { clock: () => now, rng: () => 0.5, newId: () => `id${++n}` });
    await e.boot('Никита');
    await e.run((s, c) => createHabit(s, c, { title: 'Отжимания', stat: 'STR' }));
    const stop = e.autoTick();
    now = Date.UTC(2026, 10, 3, 21, 0, 2); // 00:00:02 MSK
    mock.timers.tick(65_000);
    for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
    assert.equal(Object.keys(store.state!.penalties).length, 1);
    mock.timers.tick(3_600_000);
    for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
    assert.equal(Object.keys(store.state!.penalties).length, 1);
    stop();
  } finally {
    mock.timers.reset();
  }
});
