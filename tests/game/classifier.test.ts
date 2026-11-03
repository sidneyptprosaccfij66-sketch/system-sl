import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestStat, learn, tokenize } from '../../src/game/classifier';

test('tokenize lowercases, folds ё and drops short tokens', () => {
  assert.deepEqual(tokenize('Ёлка по БД, 2 часа!'), ['елка', 'часа']);
});

test('dictionary suggestions', () => {
  assert.equal(suggestStat('Лаба по БД', {}, 'MST'), 'INT');
  assert.equal(suggestStat('Сходить в зал', {}, 'MST'), 'STR');
  assert.equal(suggestStat('Уборка на кухне', {}, 'MST'), 'DIS');
  assert.equal(suggestStat('Позвонить маме', {}, 'MST'), 'CHA');
  assert.equal(suggestStat('Готовка', {}, 'MST'), 'DIS');
  assert.equal(suggestStat('Записаться к врачу', {}, 'MST'), 'VIT');
  assert.equal(suggestStat('Доделать проект для заказчика', {}, 'INT'), 'MST');
});

test('learned corrections beat the dictionary', () => {
  const l = learn({}, 'Готовка', 'VIT');
  assert.equal(suggestStat('Готовка', l, 'MST'), 'VIT');
  assert.equal(suggestStat('Готовка ужина', l, 'MST'), 'VIT');
});

test('unknown words fall back', () => {
  assert.equal(suggestStat('абракадабра', {}, 'MST'), 'MST');
  assert.equal(suggestStat('Ёлка', {}, 'CHA'), 'CHA');
  assert.equal(suggestStat('', {}, 'DIS'), 'DIS');
});
