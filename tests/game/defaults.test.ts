import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RESTRICTIONS, STARTER_SKILLS, newGameState } from '../../src/game/defaults';
import { STATS } from '../../src/game/types';
import { T0 } from './fixtures';

test('new game state starts at zero on the current Moscow day', () => {
  const s = newGameState('Никита', T0);
  assert.equal(s.profile.firstDay, '2026-11-03');
  assert.equal(s.profile.totals.xp, 0);
  for (const st of STATS) assert.equal(s.profile.totals.stats[st], 0);
  assert.equal(s.profile.settings.timezone, 'Europe/Moscow');
  assert.equal(s.profile.settings.dayEndHour, 0);
  assert.equal(s.profile.settings.sickDaysPerMonth, 2);
  assert.equal(s.profile.settings.sound, false);
  assert.deepEqual(s.habits, {});
  assert.equal(Object.keys(s.skills).length, STARTER_SKILLS.length);
});

test('default restrictions: 9 items, "написать другу" disabled', () => {
  assert.equal(DEFAULT_RESTRICTIONS.length, 9);
  assert.equal(DEFAULT_RESTRICTIONS.filter((r) => !r.enabled).length, 1);
  assert.match(DEFAULT_RESTRICTIONS.find((r) => !r.enabled)!.text, /другу/);
});

test('starter skills: 8, handstand unlocks at STR 5 with 5 trials', () => {
  assert.equal(STARTER_SKILLS.length, 8);
  const hs = STARTER_SKILLS.find((k) => k.name === 'Стойка на руках')!;
  assert.equal(hs.stat, 'STR'); assert.equal(hs.unlockLevel, 5); assert.equal(hs.levels.length, 5); assert.equal(hs.currentLevel, 0);
});
