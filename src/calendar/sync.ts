// Pure planning for Google Calendar sync (spec §8). The impure runner applies these plans via the API.
import type { Task } from '../game/types';
import { type Ctx, type GameState, type Outcome, applyChanges, emptyChanges, emptyOutcome, mergeOutcomes } from '../game/state';
import { createTask } from '../game/actions';
import { suggestStat } from '../game/classifier';
import { addDays, dayKeyOf } from '../game/time';
import { plusMinutes } from '../ui/components/format';

export const TZ = 'Europe/Moscow';

export interface CalTime { date?: string; dateTime?: string; timeZone?: string }
export interface CalEvent { id: string; status?: 'confirmed' | 'tentative' | 'cancelled'; summary?: string; description?: string; start?: CalTime; end?: CalTime }
export type EventBody = Required<Pick<CalEvent, 'summary' | 'description' | 'start' | 'end'>>;

export type ExportOp =
  | { op: 'insert'; taskId: string; event: EventBody }
  | { op: 'patch'; taskId: string; eventId: string; event: EventBody }
  | { op: 'delete'; taskId?: string; eventId: string; event?: undefined };

export function eventForTask(t: Task): EventBody {
  const summary = `${t.status === 'done' ? '✅ ' : ''}${t.title}`;
  const description = `THE SYSTEM · награда +${t.points} ${t.stat} · сложность ${t.rank}`;
  if (!t.dueTime) return { summary, description, start: { date: t.dueDay! }, end: { date: addDays(t.dueDay!, 1) } };
  const end = t.endTime ?? plusMinutes(t.dueTime, 60);
  return { summary, description, start: { dateTime: `${t.dueDay}T${t.dueTime}:00`, timeZone: TZ }, end: { dateTime: `${t.dueDay}T${end}:00`, timeZone: TZ } };
}

const exportable = (t: Task) => t.source === 'manual' && t.dueDay !== undefined && (t.status === 'open' || t.status === 'done' || t.status === 'failed');

export function planExport(s: GameState): ExportOp[] {
  const ops: ExportOp[] = [];
  for (const t of Object.values(s.tasks)) {
    if (t.source !== 'manual') continue;
    if (exportable(t)) {
      const event = eventForTask(t);
      if (!t.calendarEventId) ops.push({ op: 'insert', taskId: t.id, event });
      else if (t.calendarSig !== JSON.stringify(event)) ops.push({ op: 'patch', taskId: t.id, eventId: t.calendarEventId, event });
    } else if (t.calendarEventId) {
      ops.push({ op: 'delete', taskId: t.id, eventId: t.calendarEventId });
    }
  }
  for (const id of s.profile.settings.calendar.pendingDeletes ?? []) ops.push({ op: 'delete', eventId: id });
  return ops;
}

export function markExported(s: GameState, _ctx: Ctx, taskId: string, eventId: string | undefined, event?: EventBody): Outcome {
  const t = s.tasks[taskId];
  const c = emptyChanges();
  if (!t) return { changes: c, events: [] };
  const next: Task = { ...t, calendarEventId: eventId, calendarSig: event ? JSON.stringify(event) : undefined };
  if (!eventId) { delete next.calendarEventId; delete next.calendarSig; }
  c.put.tasks = [next];
  return { changes: c, events: [] };
}

export function clearPendingDeletes(s: GameState, _ctx: Ctx, done: string[]): Outcome {
  const cal = s.profile.settings.calendar;
  const c = emptyChanges();
  c.profile = { ...s.profile, settings: { ...s.profile.settings, calendar: { ...cal, pendingDeletes: (cal.pendingDeletes ?? []).filter((id) => !done.includes(id)) } } };
  return { changes: c, events: [] };
}

function hhmm(at: number): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(at));
}

function when(ev: CalEvent): Pick<Task, 'dueDay' | 'dueTime' | 'endTime'> | null {
  if (ev.start?.date) return { dueDay: ev.start.date, dueTime: undefined, endTime: undefined };
  if (!ev.start?.dateTime) return null;
  const s = Date.parse(ev.start.dateTime);
  const e = ev.end?.dateTime ? Date.parse(ev.end.dateTime) : s + 3600e3;
  return { dueDay: dayKeyOf(s, TZ, 0), dueTime: hhmm(s), endTime: hhmm(e) };
}

export function planImport(s: GameState, ctx: Ctx, calendarId: string, events: CalEvent[], penalize: boolean): Outcome {
  let cur = s;
  let acc = emptyOutcome();
  const step = (o: Outcome) => { cur = applyChanges(cur, o.changes); acc = mergeOutcomes(acc, o); };
  for (const ev of events) {
    const existing = Object.values(cur.tasks).find((t) => t.source === 'calendar' && t.calendarEventId === ev.id);
    if (ev.status === 'cancelled') {
      if (existing && existing.status === 'open') { const c = emptyChanges(); c.remove.tasks = [existing.id]; step({ changes: c, events: [] }); }
      continue;
    }
    const w = when(ev);
    if (!w) continue;
    const title = ev.summary?.trim() || '(без названия)';
    if (existing) {
      if (existing.status !== 'open') continue;
      if (existing.title === title && existing.dueDay === w.dueDay && existing.dueTime === w.dueTime && existing.endTime === w.endTime) continue;
      const next: Task = { ...existing, title, ...w };
      if (!w.dueTime) { delete next.dueTime; delete next.endTime; }
      const c = emptyChanges(); c.put.tasks = [next];
      step({ changes: c, events: [] });
      continue;
    }
    step(createTask(cur, ctx, {
      kind: 'task', title, stat: suggestStat(title, cur.learned, 'INT'), rank: 'D', ...w,
      source: 'calendar', calendarId, calendarEventId: ev.id, penalize,
    }));
  }
  return acc;
}
