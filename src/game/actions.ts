// Task, quest, checklist and habit actions. Every action returns an Outcome.
import type { ChecklistItem, DayKey, Habit, Rank, Settings, StatCode, Task } from './types';
import { learn } from './classifier';
import { type Ctx, type GameState, type Outcome, GameError, applyChanges, emptyChanges, mergeOutcomes, todayKey } from './state';
import { award, revert, toOutcome } from './awards';
import { RANK_POINTS, clampPoints } from './ranks';
import { localTime } from './time';

export class RescheduleLockedError extends GameError { constructor() { super('RESCHEDULE_LOCKED', 'Перенос закрыт после 12:00 в день дедлайна'); } }
export class MainQuestLimitError extends GameError { constructor() { super('MAIN_QUEST_LIMIT', 'Не больше 3 сюжетных квестов'); } }
export class NotFoundError extends GameError { constructor(what: string) { super('NOT_FOUND', `${what} не найдено`); } }

export type TaskInput = Pick<Task, 'kind' | 'title' | 'stat' | 'rank'> &
  Partial<Pick<Task, 'points' | 'questType' | 'dueDay' | 'dueTime' | 'endTime' | 'checklist' | 'victory' | 'note' | 'skillId' | 'recurringId' | 'ideaId' | 'source' | 'penalize' | 'calendarId' | 'calendarEventId'>>;

const put = (tasks: Task[]): Outcome => { const c = emptyChanges(); c.put.tasks = tasks; return { changes: c, events: [] }; };
const getTask = (s: GameState, id: string): Task => { const t = s.tasks[id]; if (!t) throw new NotFoundError('Задание'); return t; };
const activeMainQuests = (s: GameState) => Object.values(s.tasks).filter((t) => t.kind === 'quest' && t.questType === 'main' && t.status === 'open').length;

function checkTimes(t: Pick<Task, 'dueTime' | 'endTime'>): void {
  if (t.endTime && (!t.dueTime || t.endTime <= t.dueTime)) throw new GameError('BAD_TIME', 'Время окончания должно быть позже начала');
}

export function createTask(s: GameState, ctx: Ctx, input: TaskInput): Outcome {
  const title = input.title.trim();
  if (!title) throw new GameError('EMPTY_TITLE', 'Напиши, что нужно сделать');
  checkTimes(input);
  if (input.kind === 'quest' && input.questType === 'main' && activeMainQuests(s) >= 3) throw new MainQuestLimitError();
  const { points, source, penalize, ...rest } = input;
  const task: Task = {
    ...rest,
    id: ctx.newId(),
    title,
    points: clampPoints(points ?? RANK_POINTS[input.rank]),
    status: 'open',
    source: source ?? 'manual',
    penalize: penalize ?? true,
    createdAt: ctx.now,
  };
  if (task.kind === 'quest' && !task.questType) task.questType = 'side';
  return put([task]);
}

export function completeTask(s: GameState, ctx: Ctx, id: string): Outcome {
  const t = getTask(s, id);
  if (t.status === 'done') return { changes: emptyChanges(), events: [] };
  const r = award(s, ctx, { kind: 'task', stat: t.stat, basePoints: t.points, refId: t.id });
  const o = toOutcome(s, r);
  o.changes.put.tasks = [{ ...t, status: 'done', completedAt: ctx.now, ledgerId: r.entry.id }];
  if (t.ideaId && s.ideas[t.ideaId]) o.changes.put.ideas = [{ ...s.ideas[t.ideaId], status: 'done' }];
  o.events = [{ type: 'QUEST_COMPLETED', title: t.title, stat: t.stat, points: r.entry.points, xp: r.entry.xp, anchorId: t.id }, ...r.events];
  return o;
}

export function uncompleteTask(s: GameState, ctx: Ctx, id: string): Outcome {
  const t = getTask(s, id);
  if (t.status !== 'done' || !t.ledgerId) return { changes: emptyChanges(), events: [] };
  const o = toOutcome(s, revert(s, ctx, t.ledgerId));
  const failed = t.dueDay !== undefined && s.days[t.dueDay]?.evaluated === true;
  const { completedAt: _c, ledgerId: _l, ...restTask } = t;
  o.changes.put.tasks = [{ ...restTask, status: failed ? 'failed' : 'open' }];
  if (t.ideaId && s.ideas[t.ideaId]) o.changes.put.ideas = [{ ...s.ideas[t.ideaId], status: 'taken' }];
  return o;
}

export function updateTask(s: GameState, ctx: Ctx, id: string, patch: Partial<Omit<Task, 'id' | 'status' | 'ledgerId' | 'createdAt'>>): Outcome {
  const t = getTask(s, id);
  const next: Task = { ...t, ...patch, title: (patch.title ?? t.title).trim() || t.title };
  const moved = ('dueDay' in patch && patch.dueDay !== t.dueDay) || ('dueTime' in patch && patch.dueTime !== t.dueTime) || ('endTime' in patch && patch.endTime !== t.endTime);
  if (moved && t.dueDay && !canReschedule(s, ctx.now, t)) throw new RescheduleLockedError();
  if (moved && next.dueDay && next.dueDay !== t.dueDay && next.dueDay < todayKey(s, ctx.now)) throw new GameError('PAST_DAY', 'Нельзя перенести в прошлое');
  checkTimes(next);
  if (patch.points !== undefined) next.points = clampPoints(patch.points);
  else if (patch.rank && patch.rank !== t.rank) next.points = RANK_POINTS[patch.rank];
  if (t.status === 'done' && t.ledgerId && (next.points !== t.points || next.stat !== t.stat)) {
    const back = toOutcome(s, revert(s, ctx, t.ledgerId));
    const s1 = applyChanges(s, back.changes);
    const r = award(s1, ctx, { kind: 'task', stat: next.stat, basePoints: next.points, refId: t.id, multiplier: s.ledger[t.ledgerId].multiplier });
    const fwd = toOutcome(s1, r);
    const o = mergeOutcomes(back, fwd);
    o.events = [];
    o.changes.put.tasks = [{ ...next, ledgerId: r.entry.id }];
    return o;
  }
  return put([next]);
}

export function canReschedule(s: GameState, now: number, t: Task): boolean {
  if (t.status !== 'open') return false;
  if (!t.dueDay) return true;
  const today = todayKey(s, now);
  if (t.dueDay > today) return true;
  if (t.dueDay < today) return false;
  return now < localTime(t.dueDay, '12:00', s.profile.settings.timezone);
}

export function rescheduleTask(s: GameState, ctx: Ctx, id: string, newDay: DayKey | undefined): Outcome {
  const t = getTask(s, id);
  if (!canReschedule(s, ctx.now, t)) throw new RescheduleLockedError();
  if (newDay !== undefined && newDay < todayKey(s, ctx.now)) throw new GameError('PAST_DAY', 'Нельзя перенести в прошлое');
  const next: Task = { ...t, dueDay: newDay };
  if (newDay === undefined) { delete next.dueTime; delete next.endTime; }
  return put([next]);
}

/** Deleting keeps points already earned (the work was done); a calendar event is queued for removal. */
export function deleteTask(s: GameState, _ctx: Ctx, id: string): Outcome {
  const t = getTask(s, id);
  const c = emptyChanges();
  c.remove.tasks = [id];
  const cal = s.profile.settings.calendar;
  if (t.calendarEventId && t.source === 'manual') {
    c.profile = { ...s.profile, settings: { ...s.profile.settings, calendar: { ...cal, pendingDeletes: [...(cal.pendingDeletes ?? []), t.calendarEventId] } } };
  }
  if (t.calendarEventId && t.source === 'calendar') {
    c.profile = { ...s.profile, settings: { ...s.profile.settings, calendar: { ...cal, dismissed: [...(cal.dismissed ?? []), t.calendarEventId] } } };
  }
  return { changes: c, events: [] };
}

export function toggleChecklistItem(s: GameState, _ctx: Ctx, taskId: string, itemId: string): Outcome {
  const t = getTask(s, taskId);
  const checklist = (t.checklist ?? []).map((i) => (i.id === itemId ? { ...i, done: !i.done } : i));
  return put([{ ...t, checklist }]);
}

export function setChecklist(s: GameState, _ctx: Ctx, taskId: string, checklist: ChecklistItem[]): Outcome {
  return put([{ ...getTask(s, taskId), checklist }]);
}

/* ---------- Habits (daily quest composition) ---------- */

const putHabits = (h: Habit[]): Outcome => { const c = emptyChanges(); c.put.habits = h; return { changes: c, events: [] }; };

export function createHabit(s: GameState, ctx: Ctx, input: { title: string; stat: StatCode; points?: number; rank?: Rank }): Outcome {
  const title = input.title.trim();
  if (!title) throw new GameError('EMPTY_TITLE', 'Напиши название привычки');
  const order = Object.values(s.habits).reduce((m, h) => Math.max(m, h.order), -1) + 1;
  return putHabits([{ id: ctx.newId(), title, stat: input.stat, points: clampPoints(input.points ?? (input.rank ? RANK_POINTS[input.rank] : 2)), active: true, order }]);
}

export function updateHabit(s: GameState, _ctx: Ctx, id: string, patch: Partial<Omit<Habit, 'id'>>): Outcome {
  const h = s.habits[id];
  if (!h) throw new NotFoundError('Привычка');
  const next = { ...h, ...patch };
  if (patch.points !== undefined) next.points = clampPoints(patch.points);
  return putHabits([next]);
}

export function deleteHabit(s: GameState, _ctx: Ctx, id: string): Outcome {
  if (!s.habits[id]) throw new NotFoundError('Привычка');
  const c = emptyChanges(); c.remove.habits = [id];
  return { changes: c, events: [] };
}

/* ---------- Profile & settings ---------- */

export function updateProfile(s: GameState, _ctx: Ctx, patch: { name?: string; settings?: Partial<Settings> }): Outcome {
  const name = patch.name !== undefined ? patch.name.trim() || s.profile.name : s.profile.name;
  const settings = { ...s.profile.settings, ...patch.settings };
  if (settings.dayEndHour < 0 || settings.dayEndHour > 23) throw new GameError('BAD_HOUR', 'Конец дня — от 0 до 23 часов');
  const c = emptyChanges();
  c.profile = { ...s.profile, name, settings };
  return { changes: c, events: [] };
}

/** Records that the owner chose `stat` for this title, so the next suggestion matches. */
export function rememberStat(s: GameState, _ctx: Ctx, title: string, stat: StatCode): Outcome {
  const c = emptyChanges();
  c.learned = learn(s.learned, title, stat);
  return { changes: c, events: [] };
}
