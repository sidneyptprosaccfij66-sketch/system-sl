import type { Rank } from './types';

/** Rank → base points (spec §3.1). */
export const RANK_POINTS: Record<Rank, number> = { E: 1, D: 2, C: 3, B: 5, A: 8, S: 13 };

/** Penalty points for a failed task of this rank (spec §6.2). */
export function penaltyWeight(rank: Rank): 1 | 2 | 4 {
  if (rank === 'E' || rank === 'D') return 1;
  if (rank === 'C' || rank === 'B') return 2;
  return 4;
}

export const clampPoints = (p: number): number => Math.min(50, Math.max(1, Math.round(p)));
