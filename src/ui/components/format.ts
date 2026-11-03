// Russian date/time formatting for the UI.
import type { DayKey } from '../../game/types';
import { addDays } from '../../game/time';

const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export function longDate(day: DayKey): string {
  const [y, m, d] = day.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS[wd]}, ${d} ${MONTHS[m - 1]}`;
}

export function relDay(day: DayKey, today: DayKey): string {
  if (day === today) return 'Сегодня';
  if (day === addDays(today, 1)) return 'Завтра';
  if (day === addDays(today, -1)) return 'Вчера';
  return longDate(day);
}

export function clock(at: number, tz = 'Europe/Moscow'): string {
  return new Intl.DateTimeFormat('ru-RU', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(new Date(at));
}

export function dateTime(at: number, tz = 'Europe/Moscow'): string {
  return new Intl.DateTimeFormat('ru-RU', { timeZone: tz, day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(at));
}

export const plusMinutes = (hhmm: string, mins: number): string => {
  const [h, m] = hhmm.split(':').map(Number);
  const t = Math.min(23 * 60 + 59, h * 60 + m + mins);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
