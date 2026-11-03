// Design prototype (plan Task 3): status window, daily quest, tasks and every key animation on demo data.
import { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/ui/theme/tokens.css';
import '../src/ui/theme/base.css';
import './proto.css';
import { STATS, STAT_NAMES, type GameEvent, type Rank, type StatCode } from '../src/game/types';
import { createEventQueue } from '../src/ui/fx/eventQueue';
import { FxHost, type FxDescribe } from '../src/ui/fx/FxHost';
import { Background } from '../src/ui/fx/Background';
import { ProgressBar } from '../src/ui/fx/progressBar';
import { Counter } from '../src/ui/fx/counter';
import { flyToStat } from '../src/ui/fx/flyToStat';
import { isSoundEnabled, setSoundEnabled } from '../src/ui/fx/sound';

// Local copies of the spec formulas — the prototype only needs to look right.
const totalXp = (L: number) => 100 * (L - 1) + 25 * (L - 1) * (L - 2);
const levelOf = (xp: number) => { let L = 1; while (totalXp(L + 1) <= xp) L++; return L; };
const ptsFor = (L: number) => (L * (L + 1)) / 2 - 1;
const statLv = (p: number) => { let L = 1; while (ptsFor(L + 1) <= p) L++; return L; };
const hunter = (L: number): Rank => (L >= 75 ? 'S' : L >= 50 ? 'A' : L >= 35 ? 'B' : L >= 20 ? 'C' : L >= 10 ? 'D' : 'E');

interface DemoTask { id: string; title: string; stat: StatCode; rank: Rank; points: number; done: boolean }
const TASKS: DemoTask[] = [
  { id: 't1', title: 'Лаба по ИСиТ: отчёт и защита', stat: 'INT', rank: 'C', points: 3, done: false },
  { id: 't2', title: 'Тренировка: ноги и спина', stat: 'STR', rank: 'B', points: 5, done: false },
  { id: 't3', title: 'Разобрать стол и вынести мусор', stat: 'DIS', rank: 'D', points: 2, done: false },
  { id: 't4', title: 'Позвонить родителям', stat: 'CHA', rank: 'E', points: 1, done: false },
];
const HABITS = [
  { id: 'h1', title: '50 отжиманий', stat: 'STR' as StatCode },
  { id: 'h2', title: 'Лечь до 00:30', stat: 'VIT' as StatCode },
  { id: 'h3', title: '20 страниц книги', stat: 'INT' as StatCode },
  { id: 'h4', title: 'Без сладкого после 18:00', stat: 'DIS' as StatCode },
];

const queue = createEventQueue();
const describe: FxDescribe = {
  skillName: () => 'Стойка на руках',
  penalty: () => ({
    severityLabel: 'Средний штраф',
    reasons: ['Ежедневный квест не закрыт · 5', 'Лаба по ИСиТ (C) · 2'],
    restrictions: ['Сутки без YouTube'],
    until: 'завтра, 00:00',
  }),
};

function App() {
  const [fonts, setFonts] = useState<'A' | 'B' | 'C'>('A');
  const [sound, setSound] = useState(isSoundEnabled());
  const [xp, setXp] = useState(totalXp(12) + 320);
  const [stats, setStats] = useState<Record<StatCode, number>>({ STR: 26, VIT: 12, INT: 41, MST: 6, DIS: 20, CHA: 4 });
  const [tasks, setTasks] = useState(TASKS);
  const [habits, setHabits] = useState<string[]>(['h1', 'h2']);
  const [penalty, setPenalty] = useState(false);
  const rows = useRef<Record<string, HTMLElement | null>>({});

  const level = levelOf(xp);
  const into = xp - totalXp(level), need = totalXp(level + 1) - totalXp(level);
  const rank = hunter(level);

  const gain = (stat: StatCode, points: number, extra: GameEvent[] = [], title?: string) => {
    const m = penalty ? 0.5 : 1;
    const p = Math.max(1, Math.floor(points * m)), x = Math.max(10, Math.floor(points * 10 * m));
    const events: GameEvent[] = [];
    if (title) events.push({ type: 'QUEST_COMPLETED', title, stat, points: p, xp: x });
    events.push(...extra);
    const fromS = statLv(stats[stat]), toS = statLv(stats[stat] + p);
    if (toS > fromS) events.push({ type: 'STAT_LEVEL_UP', stat, from: fromS, to: toS });
    const fromL = levelOf(xp), toL = levelOf(xp + x);
    if (toL > fromL) events.push({ type: 'LEVEL_UP', from: fromL, to: toL });
    if (hunter(toL) !== hunter(fromL)) events.push({ type: 'RANK_UP', from: hunter(fromL), to: hunter(toL) });
    setStats((s) => ({ ...s, [stat]: s[stat] + p }));
    setXp((v) => v + x);
    queue.push(events);
    return p;
  };

  const complete = async (t: DemoTask) => {
    if (t.done) { setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, done: false } : x))); return; }
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, done: true } : x)));
    void flyToStat(rows.current[t.id], t.stat, `+${penalty ? Math.max(1, Math.floor(t.points / 2)) : t.points} ${t.stat}`);
    gain(t.stat, t.points, [], t.title);
  };
  const completeNext = () => {
    const t = tasks.find((x) => !x.done);
    if (t) void complete(t);
    else { setTasks(TASKS); queue.push([{ type: 'QUEST_COMPLETED', title: 'Новый список заданий', stat: 'DIS', points: 0, xp: 0 }]); }
  };
  const toggleHabit = (id: string, stat: StatCode, el: HTMLElement | null) => {
    if (habits.includes(id)) { setHabits(habits.filter((h) => h !== id)); return; }
    const next = [...habits, id];
    setHabits(next);
    void flyToStat(el, stat, `+2 ${stat}`);
    gain(stat, 2, next.length === HABITS.length ? [{ type: 'DAILY_QUEST_COMPLETED' }] : []);
  };

  const pickFonts = (f: 'A' | 'B' | 'C') => { setFonts(f); document.documentElement.dataset.fonts = f; };
  const fontNames = useMemo(() => ({ A: 'Oxanium · Tektur · Onest', B: 'Chakra Petch · Unbounded · Manrope', C: 'Oxanium · Unbounded · Onest' }), []);

  return (
    <>
      <Background />
      <main className="proto">
        <header className="proto-top">
          <span className="sys brand">THE SYSTEM</span>
          <button className="btn is-quiet sound" aria-pressed={sound} onClick={() => { setSoundEnabled(!sound); setSound(!sound); }}>
            {sound ? 'Звук вкл' : 'Звук выкл'}
          </button>
        </header>

        <section className="fontpick" aria-label="Шрифты">
          {(['A', 'B', 'C'] as const).map((f) => (
            <button key={f} className={`fontpick-opt${fonts === f ? ' is-on' : ''}`} aria-pressed={fonts === f} onClick={() => pickFonts(f)}>
              <span className="sys">{f}</span><span className="fontpick-name">{fontNames[f]}</span>
            </button>
          ))}
        </section>

        {penalty && (
          <div className="panel is-danger penalty-banner">
            <div className="panel-body">
              <span className="sys" style={{ color: 'var(--danger)' }}>PENALTY ZONE</span>
              <span className="muted">Сутки без YouTube · всё ×0.5</span>
            </div>
          </div>
        )}

        <section className="panel is-accent glow status">
          <div className="panel-body">
            <div className="status-head">
              <div>
                <p className="sys status-label">STATUS</p>
                <h1 className="h-screen">Никита</h1>
                <p className="muted status-sub">Охотник ранга {rank}</p>
              </div>
              <div className="hunter-badge" data-rank={rank} aria-label={`Ранг ${rank}`}>{rank}</div>
            </div>
            <div className="lv">
              <span className="sys lv-label">LV</span>
              <span className="lv-num num"><Counter value={level} duration={600} /></span>
            </div>
            <ProgressBar value={into / need} level={level} label="Опыт до следующего уровня" />
            <p className="xp-row muted"><Counter value={into} /> / <span className="num">{need.toLocaleString('ru-RU')}</span> XP</p>
            <div className="stats">
              {STATS.map((s) => {
                const L = statLv(stats[s]);
                const prog = (stats[s] - ptsFor(L)) / (ptsFor(L + 1) - ptsFor(L));
                return (
                  <div key={s} className="stat">
                    <div className="stat-top">
                      <span className="stat-code">{s}</span>
                      <span className="stat-lv num" data-stat-anchor={s}><Counter value={L} duration={500} /></span>
                    </div>
                    <span className="stat-name">{STAT_NAMES[s]}</span>
                    <ProgressBar value={prog} level={L} thin label={`${STAT_NAMES[s]}: прогресс`} />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-body">
            <div className="section-head">
              <h2 className="h-section">Ежедневный квест</h2>
              <span className="num muted">{habits.length}/{HABITS.length}</span>
            </div>
            <ProgressBar value={habits.length / HABITS.length} thin label="Ежедневный квест" />
            <div className="list">
              {HABITS.map((h) => {
                const on = habits.includes(h.id);
                return (
                  <div key={h.id} className={`row${on ? ' is-done' : ''}`} ref={(el) => { rows.current[h.id] = el; }}>
                    <button className="check" role="checkbox" aria-checked={on} aria-label={h.title} onClick={() => toggleHabit(h.id, h.stat, rows.current[h.id])} />
                    <span className="row-title">{h.title}</span>
                    <span className="stat-code small">{h.stat}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-body">
            <div className="section-head"><h2 className="h-section">Сегодня</h2></div>
            <div className="list">
              {tasks.map((t) => (
                <div key={t.id} className={`row${t.done ? ' is-done' : ''}`} ref={(el) => { rows.current[t.id] = el; }}>
                  <button className="check" role="checkbox" aria-checked={t.done} aria-label={t.title} onClick={() => complete(t)} />
                  <span className="row-title">{t.title}</span>
                  <span className="stat-code small">{t.stat}</span>
                  <span className="rank-chip" data-rank={t.rank}>{t.rank}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="demo" aria-label="Демо анимаций">
          <h2 className="h-section">Посмотреть анимации</h2>
          <div className="demo-grid">
            <button className="btn" onClick={completeNext}>Выполнить задание</button>
            <button className="btn" onClick={() => queue.push([{ type: 'LEVEL_UP', from: level, to: level + 1 }])}>Level up</button>
            <button className="btn" onClick={() => queue.push([{ type: 'RANK_UP', from: rank, to: rank === 'S' ? 'S' : (['E', 'D', 'C', 'B', 'A', 'S'] as Rank[])[['E', 'D', 'C', 'B', 'A', 'S'].indexOf(rank) + 1] }])}>Rank up</button>
            <button className="btn is-danger" onClick={() => { setPenalty(true); queue.push([{ type: 'PENALTY', penaltyId: 'p1' }]); }}>Штраф</button>
            <button className="btn" onClick={() => queue.push([{ type: 'NEW_SKILL_AVAILABLE', skillId: 's1' }])}>Навык открыт</button>
            <button className="btn" onClick={() => queue.push([{ type: 'STREAK', habitTitle: '50 отжиманий', days: 7, stat: 'STR', points: 5 }])}>Серия 7 дней</button>
            {penalty && <button className="btn is-quiet" onClick={() => setPenalty(false)}>Штраф отбыт</button>}
          </div>
        </section>
      </main>
      <FxHost queue={queue} describe={describe} />
    </>
  );
}

document.documentElement.dataset.fonts = 'A';
createRoot(document.getElementById('root')!).render(<App />);
