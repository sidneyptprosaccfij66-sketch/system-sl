// Player and stat level formulas (spec §3.3–§3.4).
import type { Rank } from './types';

export interface Progress { level: number; into: number; needed: number; ratio: number }

/** XP to go from `level` to `level + 1`. */
export const xpToNext = (level: number): number => 100 + 50 * (level - 1);

/** Total XP required to reach `level` from level 1. */
export const totalXpForLevel = (L: number): number => 100 * (L - 1) + 25 * (L - 1) * (L - 2);

export function levelFromXp(xp: number): number {
  let L = 1;
  while (totalXpForLevel(L + 1) <= xp) L++;
  return L;
}

export function hunterRank(level: number): Rank {
  if (level >= 75) return 'S';
  if (level >= 50) return 'A';
  if (level >= 35) return 'B';
  if (level >= 20) return 'C';
  if (level >= 10) return 'D';
  return 'E';
}

/** Total stat points required to reach stat level `L` (level 1 = 0 points). */
export const pointsForStatLevel = (L: number): number => (L * (L + 1)) / 2 - 1;

export function statLevel(points: number): number {
  let L = 1;
  while (pointsForStatLevel(L + 1) <= points) L++;
  return L;
}

function progress(value: number, levelOf: (v: number) => number, floor: (L: number) => number): Progress {
  const level = levelOf(value);
  const into = Math.max(0, value - floor(level));
  const needed = floor(level + 1) - floor(level);
  return { level, into, needed, ratio: into / needed };
}

export const statProgress = (points: number): Progress => progress(points, statLevel, pointsForStatLevel);
export const playerProgress = (xp: number): Progress => progress(xp, levelFromXp, totalXpForLevel);
