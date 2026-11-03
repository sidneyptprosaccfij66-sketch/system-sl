// Shared domain types (spec §2–§8). Pure declarations used by game, data, app and ui layers.

export type StatCode = 'STR' | 'VIT' | 'INT' | 'MST' | 'DIS' | 'CHA';
export const STATS: readonly StatCode[] = ['STR', 'VIT', 'INT', 'MST', 'DIS', 'CHA'];
export const STAT_NAMES: Record<StatCode, string> = {
  STR: 'Strength', VIT: 'Vitality', INT: 'Intelligence', MST: 'Mastery', DIS: 'Discipline', CHA: 'Charisma',
};
/** Russian hint shown under each stat (UI copy, spec §2). */
export const STAT_HINTS: Record<StatCode, string> = {
  STR: 'Нагрузка на тело', VIT: 'Восстановление', INT: 'Знания и учёба', MST: 'Умение делать результат', DIS: 'Воля и рутина', CHA: 'Отношения с людьми',
};

export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export const RANKS: readonly Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];

/** 'YYYY-MM-DD' game-day key. */
export type DayKey = string;

export interface ChecklistItem { id: string; text: string; done: boolean }

export interface Task {
  id: string;
  kind: 'task' | 'quest';
  questType?: 'main' | 'side';
  title: string;
  stat: StatCode;
  rank: Rank;
  points: number;
  dueDay?: DayKey;
  /** Start 'HH:mm' (dueTime) and optional end 'HH:mm' of the time range. */
  dueTime?: string;
  endTime?: string;
  status: 'open' | 'done' | 'failed' | 'archived';
  checklist?: ChecklistItem[];
  victory?: string;
  note?: string;
  skillId?: string;
  recurringId?: string;
  ideaId?: string;
  source: 'manual' | 'calendar';
  calendarId?: string;
  calendarEventId?: string;
  /** Signature of the last exported calendar event (to skip unchanged ones). */
  calendarSig?: string;
  penalize: boolean;
  createdAt: number;
  completedAt?: number;
  ledgerId?: string;
}

export interface Habit { id: string; title: string; stat: StatCode; points: number; active: boolean; order: number }

export interface DayRecord {
  day: DayKey;
  habitsDone: string[];
  sick: boolean;
  evaluated: boolean;
  habitLedger: Record<string, string>;
  bonusLedgerId?: string;
  streakLedger: Record<string, string>;
  /** Streak length per habit as of this day (so streaks survive the loaded-history window). */
  streaks?: Record<string, number>;
}

export type LedgerKind = 'task' | 'habit' | 'daily_bonus' | 'streak' | 'skill' | 'penalty_loss' | 'revert';

export interface LedgerEntry {
  id: string;
  at: number;
  day: DayKey;
  kind: LedgerKind;
  stat: StatCode;
  points: number;
  xp: number;
  multiplier: 1 | 0.5;
  refId?: string;
  revertsId?: string;
}

export interface Totals { xp: number; stats: Record<StatCode, number> }

export interface Restriction { id: string; text: string; enabled: boolean }

export type Severity = 'light' | 'medium' | 'heavy';

export interface Penalty {
  id: string;
  forDay: DayKey;
  targetDay: DayKey;
  issuedAt: number;
  severity: Severity;
  score: number;
  reasons: { refId: string; title: string; points: number }[];
  restrictions: string[];
  activeUntil: number;
  status: 'active' | 'served' | 'failed';
  resolvedAt?: number;
}

export interface SkillLevel { title: string }

export interface Skill {
  id: string;
  name: string;
  stat: StatCode;
  unlockLevel: number;
  levels: SkillLevel[];
  currentLevel: number;
  unlockedNotified: boolean;
}

export interface RecurringTemplate {
  id: string;
  title: string;
  stat: StatCode;
  rank: Rank;
  points: number;
  every: 'week' | '2weeks' | 'month';
  weekday?: number;
  monthDay?: number;
  anchorDay: DayKey;
  activeTaskId?: string;
  lastDueDay?: DayKey;
}

export interface Idea { id: string; tags: string[]; title: string; hours?: number; note?: string; status: 'bank' | 'taken' | 'done' | 'archived' }

export interface CalendarSettings {
  connected: boolean;
  questsCalendarId?: string;
  imports: { calendarId: string; name: string; penalize: boolean }[];
  lastSyncAt?: number;
  pendingDeletes?: string[];
  /** Imported events the owner deleted: never import them again. */
  dismissed?: string[];
}

export interface Settings {
  timezone: string;
  dayEndHour: number;
  restrictions: Restriction[];
  sickDaysPerMonth: number;
  sound: boolean;
  calendar: CalendarSettings;
}

export interface Profile {
  name: string;
  createdAt: number;
  firstDay: DayKey;
  lastEvaluatedDay?: DayKey;
  totals: Totals;
  settings: Settings;
}

export type Learned = Record<string, Partial<Record<StatCode, number>>>;

export type GameEvent =
  | { type: 'QUEST_COMPLETED'; title: string; stat: StatCode; points: number; xp: number; anchorId?: string }
  | { type: 'LEVEL_UP'; from: number; to: number }
  | { type: 'RANK_UP'; from: Rank; to: Rank }
  | { type: 'STAT_LEVEL_UP'; stat: StatCode; from: number; to: number }
  | { type: 'DAILY_QUEST_COMPLETED' }
  | { type: 'STREAK'; habitTitle: string; days: number; stat: StatCode; points: number }
  | { type: 'PENALTY'; penaltyId: string }
  | { type: 'PENALTY_FAILED'; penaltyId: string }
  | { type: 'NEW_SKILL_AVAILABLE'; skillId: string }
  | { type: 'SKILL_LEVEL_UP'; skillId: string; level: number }
  | { type: 'ERROR'; message: string };
