import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RANK_POINTS, penaltyWeight } from '../../src/game/ranks';
import { levelFromXp, hunterRank, statLevel, statProgress, totalXpForLevel, xpToNext, pointsForStatLevel, playerProgress } from '../../src/game/levels';

test('rank points match the spec table', () => {
  assert.deepEqual(RANK_POINTS, { E: 1, D: 2, C: 3, B: 5, A: 8, S: 13 });
});

test('penalty weights by rank', () => {
  assert.equal(penaltyWeight('E'), 1); assert.equal(penaltyWeight('D'), 1);
  assert.equal(penaltyWeight('C'), 2); assert.equal(penaltyWeight('B'), 2);
  assert.equal(penaltyWeight('A'), 4); assert.equal(penaltyWeight('S'), 4);
});

test('xp curve', () => {
  assert.equal(xpToNext(1), 100);
  assert.equal(xpToNext(2), 150);
  assert.equal(totalXpForLevel(1), 0);
  assert.equal(totalXpForLevel(3), 250);
});

test('levelFromXp boundaries', () => {
  const cases: [number, number][] = [[0, 1], [99, 1], [100, 2], [249, 2], [250, 3], [2700, 10], [10450, 20], [31450, 35], [63700, 50], [142450, 75]];
  for (const [xp, lvl] of cases) assert.equal(levelFromXp(xp), lvl, `xp ${xp}`);
});

test('hunter rank thresholds', () => {
  const cases: [number, string][] = [[1, 'E'], [9, 'E'], [10, 'D'], [19, 'D'], [20, 'C'], [34, 'C'], [35, 'B'], [50, 'A'], [74, 'A'], [75, 'S']];
  for (const [lvl, r] of cases) assert.equal(hunterRank(lvl), r, `level ${lvl}`);
});

test('stat level boundaries', () => {
  const cases: [number, number][] = [[0, 1], [1, 1], [2, 2], [4, 2], [5, 3], [9, 4], [53, 9], [54, 10]];
  for (const [p, lvl] of cases) assert.equal(statLevel(p), lvl, `points ${p}`);
  assert.equal(pointsForStatLevel(10), 54);
});

test('statProgress reports progress inside the level', () => {
  const p = statProgress(7);
  assert.equal(p.level, 3); assert.equal(p.into, 2); assert.equal(p.needed, 4); assert.equal(p.ratio, 0.5);
});

test('playerProgress reports progress inside the level', () => {
  const p = playerProgress(320 + totalXpForLevel(12));
  assert.equal(p.level, 12); assert.equal(p.into, 320); assert.equal(p.needed, xpToNext(12));
});

test('negative totals clamp to level 1', () => {
  assert.equal(levelFromXp(-50), 1);
  assert.equal(statLevel(-3), 1);
});
