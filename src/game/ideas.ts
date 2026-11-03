// Side-quest idea bank (spec §4.5).
import type { Idea, Rank, StatCode } from './types';
import { type Ctx, type GameState, type Outcome, GameError, emptyChanges } from './state';
import { createTask } from './actions';

export interface IdeaInput { title: string; tags: string[]; hours?: number; note?: string }

const cleanTags = (tags: string[]) => [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];

export function createIdea(_s: GameState, ctx: Ctx, input: IdeaInput): Outcome {
  const title = input.title.trim();
  if (!title) throw new GameError('EMPTY_TITLE', 'Напиши идею');
  const c = emptyChanges();
  c.put.ideas = [{ id: ctx.newId(), title, tags: cleanTags(input.tags), hours: input.hours, note: input.note?.trim() || undefined, status: 'bank' }];
  return { changes: c, events: [] };
}

export function updateIdea(s: GameState, _ctx: Ctx, id: string, patch: Partial<Omit<Idea, 'id'>>): Outcome {
  const i = s.ideas[id];
  if (!i) throw new GameError('NOT_FOUND', 'Идея не найдена');
  const c = emptyChanges();
  c.put.ideas = [{ ...i, ...patch, ...(patch.tags ? { tags: cleanTags(patch.tags) } : {}) }];
  return { changes: c, events: [] };
}

export function deleteIdea(s: GameState, _ctx: Ctx, id: string): Outcome {
  if (!s.ideas[id]) throw new GameError('NOT_FOUND', 'Идея не найдена');
  const c = emptyChanges(); c.remove.ideas = [id];
  return { changes: c, events: [] };
}

export function takeIdea(s: GameState, ctx: Ctx, ideaId: string, stat: StatCode, rank: Rank): Outcome {
  const i = s.ideas[ideaId];
  if (!i) throw new GameError('NOT_FOUND', 'Идея не найдена');
  const o = createTask(s, ctx, { kind: 'quest', questType: 'side', title: i.title, stat, rank, note: i.note, ideaId });
  o.changes.put.ideas = [{ ...i, status: 'taken' }];
  return o;
}

/** Ideas that carry every selected tag (no tags selected → all in the bank). */
export function filterIdeas(s: GameState, tags: string[]): Idea[] {
  return Object.values(s.ideas).filter((i) => i.status === 'bank' && tags.every((t) => i.tags.includes(t)));
}
