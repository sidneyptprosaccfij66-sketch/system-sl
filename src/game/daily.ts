// Daily quest: habit checks, full-set bonus and 7-day streaks (spec §4.2).
import type { DayKey, DayRecord, GameEvent } from './types';
import { type Ctx, type GameState, type Outcome, GameError, applyChanges, emptyChanges, mergeOutcomes, todayKey } from './state';
import { award, revert, toOutcome } from './awards';
import { addDays } from './time';
import { NotFoundError } from './actions';

export const DAILY_BONUS = 3;
export const STREAK_BONUS = 5;
export const STREAK_EVERY = 7;

export const newDayRecord = (day: DayKey): DayRecord => ({ day, habitsDone: [], sick: false, evaluated: false, habitLedger: {}, streakLedger: {} });
export const activeHabits = (s: GameState) => Object.values(s.habits).filter((h) => h.active).sort((a, b) => a.order - b.order);

/** Consecutive days ending at `day` with the habit done; sick days are skipped (neither break nor count). */
export function streakLength(s: GameState, habitId: string, day: DayKey): number {
  let n = 0;
  for (let d = day; d >= s.profile.firstDay; d = addDays(d, -1)) {
    const rec = s.days[d];
    if (rec?.sick) continue;
    if (!rec?.habitsDone.includes(habitId)) break;
    if (d !== day && rec.streaks?.[habitId] !== undefined) return n + rec.streaks[habitId];
    n++;
  }
  return n;
}

export function toggleHabit(s: GameState, ctx: Ctx, habitId: string, day: DayKey): Outcome {
  const habit = s.habits[habitId];
  if (!habit) throw new NotFoundError('Привычка');
  const today = todayKey(s, ctx.now);
  const rec0 = s.days[day] ?? newDayRecord(day);
  if (day > today) throw new GameError('FUTURE_DAY', 'Этот день ещё не наступил');
  if (day < today && rec0.evaluated) throw new GameError('DAY_CLOSED', 'Этот день уже подведён');

  let cur = s;
  let rec: DayRecord = { ...rec0, habitLedger: { ...rec0.habitLedger }, streakLedger: { ...rec0.streakLedger }, habitsDone: [...rec0.habitsDone] };
  let acc: Outcome = { changes: emptyChanges(), events: [] };
  const step = (o: Outcome) => { cur = applyChanges(cur, o.changes); acc = mergeOutcomes(acc, o); };

  if (rec.habitsDone.includes(habitId)) {
    for (const id of [rec.habitLedger[habitId], rec.streakLedger[habitId], rec.bonusLedgerId]) if (id && cur.ledger[id]) step(toOutcome(cur, revert(cur, ctx, id)));
    delete rec.habitLedger[habitId];
    delete rec.streakLedger[habitId];
    delete rec.bonusLedgerId;
    if (rec.streaks) { rec.streaks = { ...rec.streaks }; delete rec.streaks[habitId]; }
    rec.habitsDone = rec.habitsDone.filter((h) => h !== habitId);
  } else {
    const r = award(cur, ctx, { kind: 'habit', stat: habit.stat, basePoints: habit.points, refId: habitId });
    step(toOutcome(cur, r));
    rec.habitLedger[habitId] = r.entry.id;
    rec.habitsDone.push(habitId);
    cur = applyChanges(cur, { put: { days: [rec] }, remove: {} });

    const len = streakLength(cur, habitId, day);
    rec.streaks = { ...rec.streaks, [habitId]: len };
    if (len > 0 && len % STREAK_EVERY === 0) {
      const sr = award(cur, ctx, { kind: 'streak', stat: habit.stat, basePoints: STREAK_BONUS, refId: `${habitId}:${day}` });
      step(toOutcome(cur, sr));
      rec.streakLedger[habitId] = sr.entry.id;
      acc.events.push({ type: 'STREAK', habitTitle: habit.title, days: len, stat: habit.stat, points: sr.entry.points } satisfies GameEvent);
    }
    const all = activeHabits(cur);
    if (!rec.bonusLedgerId && all.length > 0 && all.every((h) => rec.habitsDone.includes(h.id))) {
      const br = award(cur, ctx, { kind: 'daily_bonus', stat: 'DIS', basePoints: DAILY_BONUS, refId: `daily:${day}` });
      step(toOutcome(cur, br));
      rec.bonusLedgerId = br.entry.id;
      acc.events.push({ type: 'DAILY_QUEST_COMPLETED' });
    }
  }
  acc.changes.put.days = [rec];
  return acc;
}
