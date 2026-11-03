import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKeyOf, dayStart, dayEnd, localTime, addDays, daysBetween, monthOf, weekdayOf, compareDays } from '../../src/game/time';

const MSK = 'Europe/Moscow';

test('day boundary at midnight Moscow', () => {
  assert.equal(dayKeyOf(Date.UTC(2026, 10, 3, 20, 59), MSK, 0), '2026-11-03');
  assert.equal(dayKeyOf(Date.UTC(2026, 10, 3, 21, 0), MSK, 0), '2026-11-04');
});

test('day boundary at 22:00 Moscow', () => {
  assert.equal(dayKeyOf(Date.UTC(2026, 10, 3, 18, 59), MSK, 22), '2026-11-03');
  assert.equal(dayKeyOf(Date.UTC(2026, 10, 3, 19, 0), MSK, 22), '2026-11-04');
});

test('dayStart and dayEnd', () => {
  assert.equal(dayEnd('2026-11-03', MSK, 0), Date.UTC(2026, 10, 3, 21));
  assert.equal(dayStart('2026-11-03', MSK, 0), Date.UTC(2026, 10, 2, 21));
  assert.equal(dayEnd('2026-11-03', MSK, 22), Date.UTC(2026, 10, 3, 19));
  assert.equal(dayStart('2026-11-03', MSK, 22), Date.UTC(2026, 10, 2, 19));
});

test('localTime converts a calendar date and clock time to an instant', () => {
  assert.equal(localTime('2026-11-04', '12:00', MSK), Date.UTC(2026, 10, 4, 9));
});

test('day arithmetic', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.deepEqual(daysBetween('2026-10-30', '2026-11-02'), ['2026-10-30', '2026-10-31', '2026-11-01']);
  assert.deepEqual(daysBetween('2026-11-02', '2026-11-02'), []);
  assert.equal(monthOf('2026-11-03'), '2026-11');
  assert.equal(weekdayOf('2026-11-02'), 1);
  assert.equal(weekdayOf('2026-11-08'), 7);
  assert.ok(compareDays('2026-11-02', '2026-11-10') < 0);
});

test('works in another time zone', () => {
  assert.equal(dayKeyOf(Date.UTC(2026, 10, 3, 4, 59), 'America/New_York', 0), '2026-11-02');
});
