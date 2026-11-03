import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateProfile, rememberStat } from '../../src/game/actions';
import { suggestStat } from '../../src/game/classifier';
import { applyChanges } from '../../src/game/state';
import { makeCtx, makeState } from './fixtures';

test('updateProfile renames and changes settings; bad hour refused', () => {
  const s0 = makeState();
  const s = applyChanges(s0, updateProfile(s0, makeCtx(), { name: 'Ник', settings: { dayEndHour: 22, sound: true } }).changes);
  assert.equal(s.profile.name, 'Ник'); assert.equal(s.profile.settings.dayEndHour, 22); assert.equal(s.profile.settings.sound, true);
  assert.throws(() => updateProfile(s0, makeCtx(), { settings: { dayEndHour: 24 } }));
});

test('rememberStat teaches the classifier', () => {
  const s0 = makeState();
  const s = applyChanges(s0, rememberStat(s0, makeCtx(), 'Готовка', 'VIT').changes);
  assert.equal(suggestStat('Готовка', s.learned, 'MST'), 'VIT');
});
