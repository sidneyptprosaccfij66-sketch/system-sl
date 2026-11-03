// Starting content: restrictions, starter skill library, settings and a fresh game (spec §6.4, §7).
import { STATS, type Restriction, type Settings, type Skill, type StatCode } from './types';
import type { GameState } from './state';
import { dayKeyOf } from './time';

export const DEFAULT_RESTRICTIONS: Restriction[] = [
  { id: 'r-youtube', text: 'Без YouTube', enabled: true },
  { id: 'r-music', text: 'Без музыки и подкастов', enabled: true },
  { id: 'r-shorts', text: 'Без коротких видео (Reels, Shorts, TikTok)', enabled: true },
  { id: 'r-series', text: 'Без аниме и сериалов', enabled: true },
  { id: 'r-games', text: 'Без игр', enabled: true },
  { id: 'r-social', text: 'Без соцсетей, кроме переписки', enabled: true },
  { id: 'r-gray', text: 'Телефон в чёрно-белом режиме', enabled: true },
  { id: 'r-headphones', text: 'Без наушников', enabled: true },
  { id: 'r-confess', text: 'Написать другу, что провалил задание', enabled: false },
];

const skill = (id: string, name: string, stat: StatCode, unlockLevel: number, levels: string[]): Skill =>
  ({ id, name, stat, unlockLevel, levels: levels.map((title) => ({ title })), currentLevel: 0, unlockedNotified: false });

export const STARTER_SKILLS: Skill[] = [
  skill('sk-handstand', 'Стойка на руках', 'STR', 5, ['30 секунд у стены', '5 секунд без опоры', '15 секунд без опоры', '30 секунд без опоры', '60 секунд без опоры']),
  skill('sk-pullups', 'Подтягивания', 'STR', 3, ['1 раз', '5 раз', '10 раз', '15 раз', '20 раз']),
  skill('sk-splits', 'Шпагат', 'STR', 5, ['30 см до пола', '20 см до пола', '10 см до пола', 'Касание пола', 'Полный шпагат']),
  skill('sk-sleep', 'Режим сна', 'VIT', 3, ['7 дней подряд', '14 дней подряд', '30 дней подряд', '60 дней подряд', '90 дней подряд']),
  skill('sk-english', 'Английский', 'INT', 3, ['A2', 'B1', 'B2', 'C1', 'C2']),
  skill('sk-typing', 'Слепая печать', 'MST', 3, ['30 слов в минуту', '45 слов в минуту', '60 слов в минуту', '75 слов в минуту', '90 слов в минуту']),
  skill('sk-wake', 'Подъём в одно время', 'DIS', 3, ['7 дней подряд', '14 дней подряд', '30 дней подряд', '60 дней подряд', '90 дней подряд']),
  skill('sk-speech', 'Публичное выступление', 'CHA', 3, ['Перед 3 людьми', 'Перед 10 людьми', 'Перед 30 людьми', 'Перед 50 людьми', 'Перед 100 людьми']),
];

export function defaultSettings(): Settings {
  return {
    timezone: 'Europe/Moscow',
    dayEndHour: 0,
    restrictions: DEFAULT_RESTRICTIONS.map((r) => ({ ...r })),
    sickDaysPerMonth: 2,
    sound: false,
    calendar: { connected: false, imports: [] },
  };
}

export function newGameState(name: string, now: number): GameState {
  const settings = defaultSettings();
  const stats = Object.fromEntries(STATS.map((s) => [s, 0])) as Record<StatCode, number>;
  return {
    profile: { name, createdAt: now, firstDay: dayKeyOf(now, settings.timezone, settings.dayEndHour), totals: { xp: 0, stats }, settings },
    tasks: {}, habits: {}, days: {}, recurring: {}, ideas: {},
    skills: Object.fromEntries(STARTER_SKILLS.map((k) => [k.id, { ...k, levels: k.levels.map((l) => ({ ...l })) }])),
    penalties: {}, ledger: {}, learned: {},
  };
}
