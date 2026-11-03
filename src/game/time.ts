// Game-day arithmetic in the owner's time zone (spec §6.1). A day key is 'YYYY-MM-DD'.
// dayEndHour h: h = 0 → day D = [D 00:00, D+1 00:00); h > 0 → day D = [D−1 h:00, D h:00).
import type { DayKey } from './types';

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    fmtCache.set(tz, f);
  }
  return f;
}

interface Parts { y: number; m: number; d: number; h: number; mi: number; s: number }
function localParts(at: number, tz: string): Parts {
  const o: Record<string, number> = {};
  for (const p of fmt(tz).formatToParts(new Date(at))) if (p.type !== 'literal') o[p.type] = Number(p.value);
  return { y: o.year, m: o.month, d: o.day, h: o.hour, mi: o.minute, s: o.second };
}

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (y: number, m: number, d: number): DayKey => `${y}-${pad(m)}-${pad(d)}`;
const parse = (day: DayKey) => { const [y, m, d] = day.split('-').map(Number); return { y, m, d }; };

function offsetMs(at: number, tz: string): number {
  const p = localParts(at, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(at / 1000) * 1000;
}

/** Instant of wall-clock time `hh:mm` on calendar date `day` in `tz`. */
function zonedInstant(day: DayKey, hh: number, mm: number, tz: string): number {
  const { y, m, d } = parse(day);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let at = guess - offsetMs(guess, tz);
  const corrected = guess - offsetMs(at, tz);
  if (corrected !== at) at = corrected;
  return at;
}

export function addDays(day: DayKey, n: number): DayKey {
  const { y, m, d } = parse(day);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return keyOf(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export const compareDays = (a: DayKey, b: DayKey): number => (a < b ? -1 : a > b ? 1 : 0);
export const maxDay = (a: DayKey, b: DayKey): DayKey => (a >= b ? a : b);

export function dayKeyOf(at: number, tz: string, dayEndHour: number): DayKey {
  const p = localParts(at, tz);
  const key = keyOf(p.y, p.m, p.d);
  return dayEndHour > 0 && p.h >= dayEndHour ? addDays(key, 1) : key;
}

export function dayEnd(day: DayKey, tz: string, dayEndHour: number): number {
  return dayEndHour === 0 ? zonedInstant(addDays(day, 1), 0, 0, tz) : zonedInstant(day, dayEndHour, 0, tz);
}

export const dayStart = (day: DayKey, tz: string, dayEndHour: number): number => dayEnd(addDays(day, -1), tz, dayEndHour);

/** Instant of clock time 'HH:mm' on the calendar date `day`. */
export function localTime(day: DayKey, hhmm: string, tz: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return zonedInstant(day, h, m, tz);
}

/** Days from `a` (inclusive) to `b` (exclusive). */
export function daysBetween(a: DayKey, b: DayKey): DayKey[] {
  const out: DayKey[] = [];
  for (let d = a; d < b; d = addDays(d, 1)) out.push(d);
  return out;
}

export const monthOf = (day: DayKey): string => day.slice(0, 7);

/** ISO weekday: Monday = 1 … Sunday = 7. */
export function weekdayOf(day: DayKey): number {
  const { y, m, d } = parse(day);
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return w === 0 ? 7 : w;
}

export function daysInMonth(day: DayKey): number {
  const { y, m } = parse(day);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
