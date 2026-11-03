// Recurring chores: weekly / every 2 weeks / monthly templates (spec §4.3).
import type { DayKey, Rank, RecurringTemplate, StatCode } from './types';
import { type Ctx, type GameState, type Outcome, GameError, applyChanges, emptyChanges, emptyOutcome, mergeOutcomes, todayKey } from './state';
import { addDays, daysInMonth, maxDay, weekdayOf } from './time';
import { RANK_POINTS, clampPoints } from './ranks';
import { createTask } from './actions';

/** First occurrence on or after `from`. */
export function nextOccurrence(t: RecurringTemplate, from: DayKey): DayKey {
  if (t.every === 'week') {
    const wd = t.weekday ?? weekdayOf(t.anchorDay);
    return addDays(from, (wd - weekdayOf(from) + 7) % 7);
  }
  if (t.every === '2weeks') {
    let d = t.anchorDay;
    if (d >= from) { while (addDays(d, -14) >= from) d = addDays(d, -14); return d; }
    while (d < from) d = addDays(d, 14);
    return d;
  }
  const md = t.monthDay ?? Number(t.anchorDay.slice(8, 10));
  let monthStart = `${from.slice(0, 7)}-01`;
  for (;;) {
    const day = `${monthStart.slice(0, 8)}${String(Math.min(md, daysInMonth(monthStart))).padStart(2, '0')}`;
    if (day >= from) return day;
    monthStart = addDays(monthStart, daysInMonth(monthStart));
  }
}

export function generateRecurring(s: GameState, ctx: Ctx): Outcome {
  const today = todayKey(s, ctx.now);
  let cur = s;
  let acc = emptyOutcome();
  for (const t of Object.values(s.recurring)) {
    const active = t.activeTaskId ? cur.tasks[t.activeTaskId] : undefined;
    if (active && active.status === 'open') continue;
    const from = t.lastDueDay ? maxDay(today, addDays(t.lastDueDay, 1)) : today;
    const due = nextOccurrence(t, from);
    const o = createTask(cur, ctx, { kind: 'task', title: t.title, stat: t.stat, rank: t.rank, points: t.points, dueDay: due, recurringId: t.id });
    const task = o.changes.put.tasks![0];
    o.changes.put.recurring = [{ ...t, activeTaskId: task.id, lastDueDay: due }];
    cur = applyChanges(cur, o.changes);
    acc = mergeOutcomes(acc, o);
  }
  return acc;
}

export interface RecurringInput { title: string; stat: StatCode; rank: Rank; points?: number; every: RecurringTemplate['every']; weekday?: number; monthDay?: number }

export function createRecurring(s: GameState, ctx: Ctx, input: RecurringInput): Outcome {
  const title = input.title.trim();
  if (!title) throw new GameError('EMPTY_TITLE', 'Напиши название дела');
  const c = emptyChanges();
  c.put.recurring = [{ id: ctx.newId(), title, stat: input.stat, rank: input.rank, points: clampPoints(input.points ?? RANK_POINTS[input.rank]),
    every: input.every, weekday: input.weekday, monthDay: input.monthDay, anchorDay: todayKey(s, ctx.now) }];
  return { changes: c, events: [] };
}

export function updateRecurring(s: GameState, _ctx: Ctx, id: string, patch: Partial<Omit<RecurringTemplate, 'id'>>): Outcome {
  const t = s.recurring[id];
  if (!t) throw new GameError('NOT_FOUND', 'Шаблон не найден');
  const c = emptyChanges();
  c.put.recurring = [{ ...t, ...patch }];
  return { changes: c, events: [] };
}

/** Removes the template and its open (not yet done) task. */
export function deleteRecurring(s: GameState, _ctx: Ctx, id: string): Outcome {
  const t = s.recurring[id];
  if (!t) throw new GameError('NOT_FOUND', 'Шаблон не найден');
  const c = emptyChanges();
  c.remove.recurring = [id];
  const open = t.activeTaskId ? s.tasks[t.activeTaskId] : undefined;
  if (open && open.status === 'open') c.remove.tasks = [open.id];
  return { changes: c, events: [] };
}
