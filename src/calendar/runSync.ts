// Executes a calendar sync: export tasks to "Quests", then import selected calendars.
import type { Engine } from '../app/engine';
import { updateProfile } from '../game/actions';
import { clearPendingDeletes, markExported, planExport, planImport } from './sync';
import type { CalendarApi } from './api';

export async function ensureQuestsCalendar(engine: Engine, api: CalendarApi): Promise<string> {
  const cal = engine.getState()!.profile.settings.calendar;
  if (cal.questsCalendarId) return cal.questsCalendarId;
  const existing = (await api.listCalendars()).find((c) => c.summary === 'Quests' && c.accessRole === 'owner');
  const id = existing?.id ?? (await api.createQuestsCalendar());
  await engine.run((s, c) => updateProfile(s, c, { settings: { calendar: { ...s.profile.settings.calendar, connected: true, questsCalendarId: id } } }));
  return id;
}

export async function runSync(engine: Engine, api: CalendarApi): Promise<void> {
  const questsId = await ensureQuestsCalendar(engine, api);
  const deleted: string[] = [];
  for (const op of planExport(engine.getState()!)) {
    if (op.op === 'insert') {
      const r = await api.insertEvent(questsId, op.event);
      await engine.run((s, c) => markExported(s, c, op.taskId, r.id, op.event));
    } else if (op.op === 'patch') {
      await api.patchEvent(questsId, op.eventId, op.event);
      await engine.run((s, c) => markExported(s, c, op.taskId, op.eventId, op.event));
    } else {
      await api.deleteEvent(questsId, op.eventId);
      if (op.taskId) await engine.run((s, c) => markExported(s, c, op.taskId!, undefined));
      else deleted.push(op.eventId);
    }
  }
  if (deleted.length) await engine.run((s, c) => clearPendingDeletes(s, c, deleted));
  const now = engine.now();
  const timeMin = new Date(now - 86400e3).toISOString();
  const timeMax = new Date(now + 14 * 86400e3).toISOString();
  for (const imp of engine.getState()!.profile.settings.calendar.imports) {
    const events = await api.listEvents(imp.calendarId, timeMin, timeMax);
    await engine.run((s, c) => planImport(s, c, imp.calendarId, events, imp.penalize));
  }
  await engine.run((s, c) => updateProfile(s, c, { settings: { calendar: { ...s.profile.settings.calendar, lastSyncAt: now } } }));
}
