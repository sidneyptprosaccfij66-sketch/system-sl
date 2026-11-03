import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../../src/app/engine';
import { createMemoryStore, createMemoryRepo } from '../../src/data/memoryRepo';
import { createTask, updateProfile } from '../../src/game/actions';
import { runSync } from '../../src/calendar/runSync';
import type { CalendarApi } from '../../src/calendar/api';

test('one failing calendar call does not stop the rest of the sync', async () => {
  let n = 0;
  const e = createEngine(createMemoryRepo(createMemoryStore()), { clock: () => Date.UTC(2026, 10, 3, 9), rng: () => 0.5, newId: () => `i${++n}` });
  await e.boot('Никита');
  await e.run((s, c) => updateProfile(s, c, { settings: { calendar: { connected: true, questsCalendarId: 'q', imports: [{ calendarId: 'uni', name: 'Пары', penalize: false }] } } }));
  await e.run((s, c) => createTask(s, c, { kind: 'task', title: 'Плохое', stat: 'DIS', rank: 'D', dueDay: '2026-11-03' }));
  await e.run((s, c) => createTask(s, c, { kind: 'task', title: 'Хорошее', stat: 'DIS', rank: 'D', dueDay: '2026-11-04' }));
  const inserted: string[] = [];
  const api = {
    listCalendars: async () => [],
    createQuestsCalendar: async () => 'q',
    listEvents: async () => [{ id: 'ev', status: 'confirmed', summary: 'Пара: БД', start: { dateTime: '2026-11-04T12:00:00+03:00' }, end: { dateTime: '2026-11-04T13:30:00+03:00' } }],
    insertEvent: async (_c: string, ev: { summary: string }) => { if (ev.summary === 'Плохое') throw new Error('Calendar API 400'); inserted.push(ev.summary); return { id: `id-${ev.summary}` }; },
    patchEvent: async () => ({ id: 'x' }),
    deleteEvent: async () => {},
  } as unknown as CalendarApi;
  const failures = await runSync(e, api);
  assert.deepEqual(inserted, ['Хорошее']);
  assert.equal(failures.length, 1);
  assert.ok(Object.values(e.getState()!.tasks).some((t) => t.source === 'calendar' && t.title === 'Пара: БД'));
  assert.ok(e.getState()!.profile.settings.calendar.lastSyncAt);
});
