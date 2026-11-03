import { useRef, useState } from 'react';
import { useEngine, useGame } from '../../app/store';
import { todayKey } from '../../game/state';
import { activeHabits, toggleHabit } from '../../game/daily';
import { markSick, sickDaysUsed } from '../../game/evaluate';
import { monthOf } from '../../game/time';
import type { Task } from '../../game/types';
import { flyToStat } from '../fx/flyToStat';
import { DayTimeline } from '../components/DayTimeline';
import { PenaltyBanner } from '../components/PenaltyBanner';
import { QuickAdd, TaskEditor, TaskRow, useToggleTask, type EditorTarget } from '../components/tasks';
import { longDate, plusMinutes, relDay } from '../components/format';

export function TodayScreen() {
  const s = useGame();
  const engine = useEngine();
  const today = todayKey(s, engine.now());
  const [editing, setEditing] = useState<EditorTarget | null>(null);
  const rows = useRef<Record<string, HTMLElement | null>>({});
  const toggle = useToggleTask();
  const habits = activeHabits(s);
  const rec = s.days[today];
  const doneHabits = rec?.habitsDone ?? [];
  const todays = Object.values(s.tasks).filter((t) => t.dueDay === today && (t.status === 'open' || t.status === 'done'));
  const untimed = todays.filter((t) => !t.dueTime).sort((a, b) => a.createdAt - b.createdAt);
  const timed = todays.filter((t) => t.dueTime);
  const overdue = Object.values(s.tasks).filter((t) => t.dueDay && t.dueDay < today && (t.status === 'failed' || t.status === 'open'));
  const sickLeft = s.profile.settings.sickDaysPerMonth - sickDaysUsed(s, monthOf(today));
  const open = (t: Task) => setEditing({ task: t, kind: t.kind });

  const tickHabit = (id: string) => {
    const h = s.habits[id];
    if (!doneHabits.includes(id)) void flyToStat(rows.current[id], h.stat, `+${h.points} ${h.stat}`);
    void engine.run((st, c) => toggleHabit(st, c, id, today));
  };

  return (
    <section className="screen is-today" data-section="today" id="today" aria-label="Сегодня">
      <header className="screen-head">
        <h1 className="holo-title screen-title">Сегодня</h1>
        <p className="screen-sub">{longDate(today)}{rec?.sick ? ' · больничный' : ''}</p>
      </header>
      <PenaltyBanner />
      <div className="area-add"><QuickAdd /></div>

      <section className="panel area-daily">
        <div className="panel-body">
          <h2 className="holo-title quest-title"><span className="syswin-mark" aria-hidden="true">!</span>Daily Quest</h2>
          {habits.length === 0
            ? <p className="empty">Добавь привычки в Настройках — они станут ежедневным квестом.</p>
            : <>
                <p className="quest-sub">Ежедневный квест · выполнено <span className="num">{habits.filter((h) => doneHabits.includes(h.id)).length}/{habits.length}</span></p>
                <div className="list">
                  {habits.map((h) => {
                    const on = doneHabits.includes(h.id);
                    return (
                      <div key={h.id} className={`row${on ? ' is-done' : ''}`} ref={(el) => { rows.current[h.id] = el; }}>
                        <button className="check" role="checkbox" aria-checked={on} aria-label={h.title} onClick={() => tickHabit(h.id)} />
                        <span className="row-title">{h.title}</span>
                        <span className="reward">+{h.points} {h.stat}</span>
                      </div>
                    );
                  })}
                </div>
              </>}
        </div>
      </section>

      <section className="panel area-tasks">
        <div className="panel-body">
          <h2 className="holo-title list-title">Задания</h2>
          {todays.length === 0 && <p className="empty">На сегодня заданий нет. Добавь первое в форме выше.</p>}
          {untimed.length > 0 && <>
            <p className="tl-section">В течение дня</p>
            <div className="list">{untimed.map((t) => <TaskRow key={t.id} task={t} onOpen={open} />)}</div>
          </>}
          {timed.length > 0 && <>
            <p className="tl-section">По времени</p>
            <DayTimeline
              items={timed.map((t) => ({ id: t.id, title: t.title, start: t.dueTime!, end: t.endTime ?? plusMinutes(t.dueTime!, 60), stat: t.stat, rank: t.rank, points: t.points, done: t.status === 'done', fromCalendar: t.source === 'calendar' }))}
              onToggle={(id, el) => toggle(s.tasks[id], el)}
              onOpen={(id) => open(s.tasks[id])}
              clock={engine.now}
            />
          </>}
        </div>
      </section>

      {overdue.length > 0 && (
        <section className="panel area-overdue">
          <div className="panel-body">
            <h2 className="holo-title list-title">Просрочено</h2>
            <p className="quest-sub">Штраф уже засчитан, но очки за выполнение всё равно начислятся</p>
            <div className="list">{overdue.map((t) => <TaskRow key={t.id} task={t} onOpen={open} sub={relDay(t.dueDay!, today)} />)}</div>
          </div>
        </section>
      )}

      {!rec?.sick && (
        <div className="area-sick" style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
          <button className="btn is-quiet" disabled={sickLeft <= 0} onClick={() => void engine.run((st, c) => markSick(st, c, today))}>Больничный сегодня</button>
          <span className="hint">Осталось в этом месяце: {Math.max(0, sickLeft)}. В больничный день штрафов нет.</span>
        </div>
      )}
      {editing && <TaskEditor target={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}
