// Suggests a stat from a task title: built-in Russian word stems + learned corrections (spec §5).
import { STATS, type Learned, type StatCode } from './types';

export const DICTIONARY: Record<StatCode, string[]> = {
  STR: ['зал', 'трениров', 'бег', 'пробеж', 'отжим', 'подтяг', 'присед', 'растяж', 'шаг', 'спорт', 'качал', 'кардио', 'плаван', 'турник', 'штанг', 'пресс'],
  VIT: ['сон', 'спат', 'врач', 'медитац', 'вода', 'душ', 'еда', 'завтрак', 'обед', 'ужин', 'витамин', 'отдых', 'прогул', 'лечь', 'лечен', 'стоматолог', 'анализ', 'йог'],
  INT: ['пара', 'пары', 'пару', 'паре', 'лаб', 'экзам', 'лекц', 'книг', 'курс', 'учеб', 'универ', 'семинар', 'конспект', 'читат', 'прочит', 'зачет', 'диплом', 'реферат', 'домашк', 'англ', 'изуч', 'учит', 'контрольн'],
  MST: ['работ', 'проект', 'портфолио', 'заказ', 'код', 'дизайн', 'фриланс', 'скетч', 'рисова', 'верстк', 'клиент', 'макет'],
  DIS: ['убор', 'убра', 'стир', 'посуд', 'счет', 'оплат', 'документ', 'магаз', 'мусор', 'помыт', 'пылесос', 'разобр', 'готов', 'подъем', 'встат', 'глаж'],
  CHA: ['встреч', 'позвон', 'звонок', 'друг', 'друз', 'мам', 'пап', 'родит', 'свидан', 'гост', 'помоч', 'поздрав', 'бабушк', 'дедушк'],
};

const LEARNED_WEIGHT = 3;

export function tokenize(title: string): string[] {
  return title.toLowerCase().replaceAll('ё', 'е').split(/[^\p{L}]+/u).filter((t) => t.length >= 3);
}

export function suggestStat(title: string, learned: Learned, fallback: StatCode): StatCode {
  const score = Object.fromEntries(STATS.map((s) => [s, 0])) as Record<StatCode, number>;
  for (const tok of tokenize(title)) {
    for (const [stat, n] of Object.entries(learned[tok] ?? {}) as [StatCode, number][]) score[stat] += LEARNED_WEIGHT * n;
    for (const stat of STATS) if (DICTIONARY[stat].some((stem) => tok.startsWith(stem))) score[stat] += 1;
  }
  let best: StatCode = fallback;
  let max = 0;
  for (const s of STATS) if (score[s] > max) { max = score[s]; best = s; }
  return best;
}

export function learn(learned: Learned, title: string, stat: StatCode): Learned {
  const next: Learned = { ...learned };
  for (const tok of tokenize(title)) next[tok] = { ...next[tok], [stat]: (next[tok]?.[stat] ?? 0) + 1 };
  return next;
}
