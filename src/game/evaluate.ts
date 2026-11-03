// End-of-day evaluation and penalties (spec §6).
import type { DayKey, Penalty, Severity, Task } from './types';
import { STATS } from './types';
import { type Ctx, type GameState, type Outcome, GameError, applyChanges, emptyChanges, emptyOutcome, mergeOutcomes, todayKey } from './state';
import { penaltyWeight } from './ranks';
import { addDays, dayEnd, daysBetween, localTime, maxDay, monthOf } from './time';
import { activeHabits, newDayRecord } from './daily';
import { rawEntry, toOutcome } from './awards';
import { statProgress } from './levels';

export class PenaltyNotFinishedError extends GameError { constructor() { super('PENALTY_NOT_FINISHED', 'Штраф ещё действует — отметь, когда срок закончится'); } }
export class SickLimitError extends GameError { constructor(n: number) { super('SICK_LIMIT', `Больничных в этом месяце больше нет (лимит ${n})`); } }

export const DAILY_QUEST_PENALTY = 5;
export const PENALTY_GRACE_MS = 48 * 3600e3;
export const PENALTY_LOSS = 0.2;

export function severityFor(score: number): Severity | null {
  if (score <= 0) return null;
  if (score <= 3) return 'light';
  if (score <= 8) return 'medium';
  return 'heavy';
}

export interface DayScore { score: number; reasons: Penalty['reasons']; failedTaskIds: string[] }

export function scoreDay(s: GameState, day: DayKey): DayScore {
  const rec = s.days[day];
  const due = Object.values(s.tasks).filter((t) => t.dueDay === day && t.status === 'open');
  const failedTaskIds = due.map((t) => t.id);
  if (rec?.sick) return { score: 0, reasons: [], failedTaskIds };
  const reasons: Penalty['reasons'] = [];
  const habits = activeHabits(s);
  if (habits.length > 0 && !habits.every((h) => rec?.habitsDone.includes(h.id))) {
    reasons.push({ refId: `daily:${day}`, title: 'Ежедневный квест не закрыт', points: DAILY_QUEST_PENALTY });
  }
  for (const t of due) if (t.penalize) reasons.push({ refId: t.id, title: `${t.title} (${t.rank})`, points: penaltyWeight(t.rank) });
  return { score: reasons.reduce((a, r) => a + r.points, 0), reasons, failedTaskIds };
}

function pickRestrictions(s: GameState, ctx: Ctx, n: number): string[] {
  const pool = s.profile.settings.restrictions.filter((r) => r.enabled).map((r) => r.text);
  const out: string[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(ctx.rng() * pool.length), 1)[0]);
  return out;
}

export function issuePenalty(s: GameState, ctx: Ctx, day: DayKey, scored: DayScore): Outcome {
  const severity = severityFor(scored.score);
  if (!severity) return emptyOutcome();
  const { timezone: tz, dayEndHour: h } = s.profile.settings;
  let targetDay = maxDay(addDays(day, 1), todayKey(s, ctx.now));
  let activeUntil: number;
  if (severity === 'light') {
    activeUntil = localTime(targetDay, '15:00', tz);
    if (ctx.now >= activeUntil) { targetDay = addDays(targetDay, 1); activeUntil = localTime(targetDay, '15:00', tz); }
  } else {
    activeUntil = dayEnd(targetDay, tz, h);
  }
  const penalty: Penalty = {
    id: ctx.newId(), forDay: day, targetDay, issuedAt: ctx.now, severity, score: scored.score, reasons: scored.reasons,
    restrictions: pickRestrictions(s, ctx, severity === 'heavy' ? 2 : 1), activeUntil, status: 'active',
  };
  const c = emptyChanges();
  c.put.penalties = [penalty];
  return { changes: c, events: [{ type: 'PENALTY', penaltyId: penalty.id }] };
}

export function evaluatePending(s: GameState, ctx: Ctx): Outcome {
  const today = todayKey(s, ctx.now);
  const start = s.profile.lastEvaluatedDay ? addDays(s.profile.lastEvaluatedDay, 1) : s.profile.firstDay;
  let cur = s;
  let acc = emptyOutcome();
  const step = (o: Outcome) => { cur = applyChanges(cur, o.changes); acc = mergeOutcomes(acc, o); };
  for (const day of daysBetween(start, today)) {
    if (!cur.days[day]?.evaluated) {
      const scored = scoreDay(cur, day);
      const c = emptyChanges();
      c.put.tasks = scored.failedTaskIds.map((id): Task => ({ ...cur.tasks[id], status: 'failed' }));
      c.put.days = [{ ...(cur.days[day] ?? newDayRecord(day)), evaluated: true }];
      step({ changes: c, events: [] });
      step(issuePenalty(cur, ctx, day, scored));
    }
    step({ changes: { ...emptyChanges(), profile: { ...cur.profile, lastEvaluatedDay: day } }, events: [] });
  }
  step(checkPenalties(cur, ctx));
  return acc;
}

export function checkPenalties(s: GameState, ctx: Ctx): Outcome {
  let cur = s;
  let acc = emptyOutcome();
  const step = (o: Outcome) => { cur = applyChanges(cur, o.changes); acc = mergeOutcomes(acc, o); };
  for (const p of Object.values(s.penalties)) {
    if (p.status !== 'active' || ctx.now < p.activeUntil + PENALTY_GRACE_MS) continue;
    const c = emptyChanges();
    c.put.penalties = [{ ...p, status: 'failed', resolvedAt: ctx.now }];
    step({ changes: c, events: [{ type: 'PENALTY_FAILED', penaltyId: p.id }] });
    for (const stat of STATS) {
      const loss = Math.floor(statProgress(cur.profile.totals.stats[stat]).into * PENALTY_LOSS);
      if (loss > 0) step(toOutcome(cur, rawEntry(cur, ctx, { kind: 'penalty_loss', stat, points: -loss, xp: 0, refId: p.id })));
    }
  }
  return acc;
}

export function servePenalty(s: GameState, ctx: Ctx, id: string): Outcome {
  const p = s.penalties[id];
  if (!p || p.status !== 'active') throw new GameError('NOT_FOUND', 'Активный штраф не найден');
  if (ctx.now < p.activeUntil) throw new PenaltyNotFinishedError();
  const c = emptyChanges();
  c.put.penalties = [{ ...p, status: 'served', resolvedAt: ctx.now }];
  return { changes: c, events: [] };
}

export function sickDaysUsed(s: GameState, month: string): number {
  return Object.values(s.days).filter((d) => d.sick && monthOf(d.day) === month).length;
}

/** Toggles a sick day for a not-yet-evaluated day within the monthly limit. */
export function markSick(s: GameState, ctx: Ctx, day: DayKey): Outcome {
  const rec = s.days[day] ?? newDayRecord(day);
  if (rec.evaluated) throw new GameError('DAY_CLOSED', 'Этот день уже подведён');
  if (day > todayKey(s, ctx.now)) throw new GameError('FUTURE_DAY', 'Больничный можно взять только на сегодня');
  const limit = s.profile.settings.sickDaysPerMonth;
  if (!rec.sick && sickDaysUsed(s, monthOf(day)) >= limit) throw new SickLimitError(limit);
  const c = emptyChanges();
  c.put.days = [{ ...rec, sick: !rec.sick }];
  return { changes: c, events: [] };
}
