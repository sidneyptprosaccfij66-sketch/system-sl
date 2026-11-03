// Skills: unlock by stat level, level up by passing real-world trials (spec §7).
import type { Skill, StatCode } from './types';
import { type Ctx, type GameState, type Outcome, GameError, emptyChanges, emptyOutcome } from './state';
import { statLevel } from './levels';
import { award, toOutcome } from './awards';

export const TRIAL_BONUS_PER_LEVEL = 5;

export const isUnlocked = (s: GameState, k: Skill): boolean => statLevel(s.profile.totals.stats[k.stat]) >= k.unlockLevel;

export function checkSkillUnlocks(s: GameState): Outcome {
  const newly = Object.values(s.skills).filter((k) => !k.unlockedNotified && isUnlocked(s, k));
  if (!newly.length) return emptyOutcome();
  const c = emptyChanges();
  c.put.skills = newly.map((k) => ({ ...k, unlockedNotified: true }));
  return { changes: c, events: newly.map((k) => ({ type: 'NEW_SKILL_AVAILABLE' as const, skillId: k.id })) };
}

export function passTrial(s: GameState, ctx: Ctx, skillId: string): Outcome {
  const k = s.skills[skillId];
  if (!k) throw new GameError('NOT_FOUND', 'Навык не найден');
  if (!isUnlocked(s, k)) throw new GameError('SKILL_LOCKED', `Навык откроется при ${k.stat} ${k.unlockLevel}`);
  if (k.currentLevel >= k.levels.length) throw new GameError('SKILL_MAX', 'Навык уже на максимуме');
  const level = k.currentLevel + 1;
  const r = award(s, ctx, { kind: 'skill', stat: k.stat, basePoints: TRIAL_BONUS_PER_LEVEL * level, refId: `${k.id}:${level}` });
  const o = toOutcome(s, r);
  o.changes.put.skills = [{ ...k, currentLevel: level, unlockedNotified: true }];
  o.events = [{ type: 'SKILL_LEVEL_UP', skillId: k.id, level }, ...r.events];
  return o;
}

export interface SkillInput { name: string; stat: StatCode; unlockLevel: number; levels: string[] }

export function createSkill(_s: GameState, ctx: Ctx, input: SkillInput): Outcome {
  const name = input.name.trim();
  const levels = input.levels.map((l) => l.trim()).filter(Boolean);
  if (!name) throw new GameError('EMPTY_TITLE', 'Напиши название навыка');
  if (!levels.length) throw new GameError('NO_TRIALS', 'Добавь хотя бы одно испытание');
  const c = emptyChanges();
  c.put.skills = [{ id: ctx.newId(), name, stat: input.stat, unlockLevel: Math.max(1, Math.round(input.unlockLevel)), levels: levels.map((title) => ({ title })), currentLevel: 0, unlockedNotified: false }];
  return { changes: c, events: [] };
}

export function updateSkill(s: GameState, _ctx: Ctx, id: string, patch: Partial<SkillInput>): Outcome {
  const k = s.skills[id];
  if (!k) throw new GameError('NOT_FOUND', 'Навык не найден');
  const next: Skill = { ...k, ...(patch.name ? { name: patch.name.trim() } : {}), ...(patch.stat ? { stat: patch.stat } : {}),
    ...(patch.unlockLevel ? { unlockLevel: Math.max(1, Math.round(patch.unlockLevel)) } : {}) };
  if (patch.levels) {
    next.levels = patch.levels.map((l) => l.trim()).filter(Boolean).map((title) => ({ title }));
    next.currentLevel = Math.min(next.currentLevel, next.levels.length);
  }
  const c = emptyChanges(); c.put.skills = [next];
  return { changes: c, events: [] };
}

export function deleteSkill(s: GameState, _ctx: Ctx, id: string): Outcome {
  if (!s.skills[id]) throw new GameError('NOT_FOUND', 'Навык не найден');
  const c = emptyChanges(); c.remove.skills = [id];
  return { changes: c, events: [] };
}
