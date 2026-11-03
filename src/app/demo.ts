// Demo mode (?demo=1): realistic example data in memory, persisted per tab in sessionStorage.
import { newGameState } from '../game/defaults';
import { applyChanges, type Ctx, type GameState, type Outcome } from '../game/state';
import { createTask, createHabit } from '../game/actions';
import { createIdea } from '../game/ideas';
import { createRecurring } from '../game/recurring';
import { toggleHabit } from '../game/daily';
import { totalXpForLevel } from '../game/levels';
import { todayKey } from '../game/state';
import { addDays } from '../game/time';
import type { GameState as GS } from '../game/state';
import { createMemoryRepo, createMemoryStore } from '../data/memoryRepo';
import type { Repo } from '../data/repo';

export interface DemoParams { demo: boolean; fresh: boolean; penalty: boolean; now?: number }

export function readDemoParams(search: string): DemoParams {
  const q = new URLSearchParams(search);
  const nowStr = q.get('now');
  const now = nowStr ? Date.parse(nowStr) : NaN;
  return { demo: q.get('demo') === '1', fresh: q.get('fresh') === '1', penalty: q.get('penalty') === '1', now: Number.isFinite(now) ? now : undefined };
}

export function createDemoState(now: number, withPenalty = false): GameState {
  let n = 0;
  const ctx: Ctx = { now: now - 60_000, newId: () => `demo${++n}`, rng: () => 0.3 };
  let s: GS = newGameState('Никита', now - 30 * 86400e3);
  const run = (o: Outcome) => { s = applyChanges(s, o.changes); };
  s = { ...s, profile: { ...s.profile, firstDay: addDays(todayKey(s, now), -30), lastEvaluatedDay: addDays(todayKey(s, now), -1),
    totals: { xp: totalXpForLevel(12) + 320, stats: { STR: 26, VIT: 12, INT: 41, MST: 6, DIS: 20, CHA: 4 } } } };
  const today = todayKey(s, now);
  for (const [title, stat] of [['50 отжиманий', 'STR'], ['Лечь до 00:30', 'VIT'], ['20 страниц книги', 'INT'], ['Без сладкого после 18:00', 'DIS']] as const) {
    run(createHabit(s, ctx, { title, stat, points: 2 }));
  }
  const habitIds = Object.keys(s.habits);
  run(toggleHabit(s, ctx, habitIds[0], today));
  run(toggleHabit(s, ctx, habitIds[1], today));
  const tasks: Parameters<typeof createTask>[2][] = [
    { kind: 'task', title: 'Лаба по ИСиТ: отчёт и защита', stat: 'INT', rank: 'C', dueDay: today, dueTime: '10:00', endTime: '11:30' },
    { kind: 'task', title: 'Пара: Управление данными', stat: 'INT', rank: 'D', dueDay: today, dueTime: '12:00', endTime: '13:30', source: 'calendar', penalize: false, calendarId: 'demo-cal', calendarEventId: 'ev1' },
    { kind: 'task', title: 'Тренировка: ноги и спина', stat: 'STR', rank: 'B', dueDay: today, dueTime: '18:00', endTime: '19:30' },
    { kind: 'task', title: 'Позвонить родителям', stat: 'CHA', rank: 'E', dueDay: today, dueTime: '20:00', endTime: '20:20' },
    { kind: 'task', title: 'Разобрать стол и вынести мусор', stat: 'DIS', rank: 'D', dueDay: today },
    { kind: 'task', title: 'Записаться к стоматологу', stat: 'VIT', rank: 'D' },
    { kind: 'task', title: 'Обновить портфолио', stat: 'MST', rank: 'B', dueDay: addDays(today, 2) },
    { kind: 'quest', questType: 'main', title: 'Сдать сессию без долгов', stat: 'INT', rank: 'S', victory: 'Все зачёты и экзамены сданы до 25 января',
      checklist: [{ id: 'c1', text: 'Закрыть лабы по ИСиТ', done: true }, { id: 'c2', text: 'Курсовая по БД', done: false }, { id: 'c3', text: 'Экзамен по матану', done: false }] },
    { kind: 'quest', questType: 'side', title: 'Сходить в новый скалодром', stat: 'STR', rank: 'C' },
  ];
  for (const t of tasks) run(createTask(s, ctx, t));
  run(createRecurring(s, ctx, { title: 'Генеральная уборка', stat: 'DIS', rank: 'C', every: 'week', weekday: 6 }));
  for (const [title, tags] of [['Сделать домашний лимонад', ['дом', 'вкусное']], ['Погулять в парке', ['природа']], ['Позвать друга на чай', ['дом', 'социальное']], ['Испечь печенье', ['дом', 'вкусное']]] as const) {
    run(createIdea(s, ctx, { title, tags: [...tags] }));
  }
  s = { ...s, skills: { ...s.skills, 'sk-pullups': { ...s.skills['sk-pullups'], currentLevel: 2, unlockedNotified: true }, 'sk-handstand': { ...s.skills['sk-handstand'], unlockedNotified: true } } };
  if (withPenalty) {
    s = { ...s, penalties: { p1: { id: 'p1', forDay: addDays(today, -1), targetDay: today, issuedAt: now - 3600e3, severity: 'medium', score: 5,
      reasons: [{ refId: 'daily', title: 'Ежедневный квест не закрыт', points: 5 }], restrictions: ['Без YouTube'], activeUntil: now + 6 * 3600e3, status: 'active' } } };
  }
  return s;
}

const KEY = 'system-demo-state';

export function createDemoRepo(p: DemoParams, now: number): Repo {
  let saved: GameState | null = null;
  try { const raw = sessionStorage.getItem(KEY); saved = raw ? JSON.parse(raw) : null; } catch { /* storage unavailable */ }
  const initial = saved ?? (p.fresh ? null : createDemoState(now, p.penalty));
  return createMemoryRepo(createMemoryStore(initial), (s) => { try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } });
}
