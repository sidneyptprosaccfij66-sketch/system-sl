// Minimal Google Calendar API v3 client over fetch.
import type { CalEvent, EventBody } from './sync';

const BASE = 'https://www.googleapis.com/calendar/v3';

export interface CalendarListItem { id: string; summary: string; primary?: boolean; accessRole?: string }

export function createCalendarApi(token: string) {
  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${BASE}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
    if (res.status === 204) return undefined as T;
    if (!res.ok) throw new Error(`Calendar API ${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
  }
  const enc = encodeURIComponent;
  return {
    async listCalendars(): Promise<CalendarListItem[]> {
      return (await call<{ items: CalendarListItem[] }>('/users/me/calendarList?maxResults=250')).items ?? [];
    },
    async createQuestsCalendar(): Promise<string> {
      return (await call<{ id: string }>('/calendars', { method: 'POST', body: JSON.stringify({ summary: 'Quests', timeZone: 'Europe/Moscow' }) })).id;
    },
    async listEvents(calendarId: string, timeMin: string, timeMax: string): Promise<CalEvent[]> {
      const q = `timeMin=${enc(timeMin)}&timeMax=${enc(timeMax)}&singleEvents=true&showDeleted=true&maxResults=250&orderBy=startTime`;
      return (await call<{ items: CalEvent[] }>(`/calendars/${enc(calendarId)}/events?${q}`)).items ?? [];
    },
    insertEvent: (calendarId: string, e: EventBody) => call<{ id: string }>(`/calendars/${enc(calendarId)}/events`, { method: 'POST', body: JSON.stringify(e) }),
    patchEvent: (calendarId: string, id: string, e: EventBody) => call<{ id: string }>(`/calendars/${enc(calendarId)}/events/${enc(id)}`, { method: 'PATCH', body: JSON.stringify(e) }),
    async deleteEvent(calendarId: string, id: string) {
      try { await call(`/calendars/${enc(calendarId)}/events/${enc(id)}`, { method: 'DELETE' }); }
      catch (e) { if (!/ 404| 410/.test(String(e))) throw e; }
    },
  };
}
export type CalendarApi = ReturnType<typeof createCalendarApi>;
