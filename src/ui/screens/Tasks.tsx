import { useRef, useState } from 'react';
import { useEngine, useGame } from '../../app/store';
import { todayKey } from '../../game/state';
import { toggleChecklistItem } from '../../game/actions';
import type { Task } from '../../game/types';
import { GateBadge } from '../fx/gateBadge';
import { TaskEditor, TaskRow, useToggleTask, type EditorTarget } from '../components/tasks';
import { relDay } from '../components/format';

type Tab = 'upcoming' | 'nodate' | 'quests' | 'done';
const TABS: [Tab, string][] = [['upcoming', 'Предстоящие'], ['nodate', 'Без даты'], ['quests', 'Квесты'], ['done', 'Выполненные']];

function QuestCard({ q, onOpen }: { q: Task; onOpen: (t: Task) => void }) {
  const engine = useEngine();
  const toggle = useToggleTask();
  const ref = useRef<HTMLDivElement>(null);
  const steps = q.checklist ?? [];
  const done = steps.filter((x) => x.done).length;
  return (
    <div ref={ref} className="quest-card" data-quest={q.id}>
      <div className="quest-head">
        <button className="quest-name" aria-label={`Открыть: ${q.title}`} onClick={() => onOpen(q)}>{q.title}</button>
        <GateBadge rank={q.rank} />
      </div>
      <span className={`quest-kind${q.questType === 'main' ? ' is-main' : ''}`}>{q.questType === 'main' ? 'Сюжетный квест' : 'Побочный квест'} · награда +{q.points} {q.stat}</span>
      {q.victory && <p className="quest-victory">Победа: {q.victory}</p>}
      {steps.length > 0 && <>
        <span className="num muted" style={{ fontSize: 'var(--t-xs)' }}>{done}/{steps.length}</span>
        {steps.map((st) => (
          <div key={st.id} className={`step${st.done ? ' is-done' : ''}`}>
            <button className="check" role="checkbox" aria-checked={st.done} aria-label={st.text} onClick={() => void engine.run((s, c) => toggleChecklistItem(s, c, q.id, st.id))} />
            <span>{st.text}</span>
          </div>
        ))}
      </>}
      {q.status === 'open' && <button className="btn" onClick={() => toggle(q, ref.current)}>Завершить квест</button>}
    </div>
  );
}

export function TasksScreen() {
  const s = useGame();
  const engine = useEngine();
  const today = todayKey(s, engine.now());
  const [tab, setTab] = useState<Tab>('upcoming');
  const [editing, setEditing] = useState<EditorTarget | null>(null);
  const open = (t: Task) => setEditing({ task: t, kind: t.kind });
  const all = Object.values(s.tasks);
  const tasks = all.filter((t) => t.kind === 'task');

  const upcoming = tasks.filter((t) => t.status === 'open' && t.dueDay && t.dueDay >= today).sort((a, b) => (a.dueDay! + (a.dueTime ?? '')).localeCompare(b.dueDay! + (b.dueTime ?? '')));
  const groups = new Map<string, Task[]>();
  for (const t of upcoming) groups.set(t.dueDay!, [...(groups.get(t.dueDay!) ?? []), t]);
  const noDate = tasks.filter((t) => t.status === 'open' && !t.dueDay);
  const quests = all.filter((t) => t.kind === 'quest' && t.status !== 'done' && t.status !== 'archived').sort((a, b) => (a.questType === 'main' ? 0 : 1) - (b.questType === 'main' ? 0 : 1) || a.createdAt - b.createdAt);
  const done = all.filter((t) => t.status === 'done').sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)).slice(0, 50);

  return (
    <section className="screen" data-section="tasks" id="tasks" aria-label="Задания">
      <header className="screen-head">
        <h1 className="holo-title screen-title">Задания</h1>
      </header>
      <div className="qa-row" style={{ justifyContent: 'center' }}>
        <button className="btn" onClick={() => setEditing({ kind: 'task' })}>Новое задание</button>
        <button className="btn" onClick={() => setEditing({ kind: 'quest' })}>Новый квест</button>
      </div>
      <div className="tabs" role="tablist" aria-label="Списки">
        {TABS.map(([k, l]) => <button key={k} role="tab" className="seg-btn" aria-selected={tab === k} aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      <section className="panel" role="tabpanel">
        <div className="panel-body">
          {tab === 'upcoming' && (upcoming.length === 0 ? <p className="empty">Нет заданий с датой. Добавь задание и выбери день.</p> :
            [...groups].map(([day, list]) => (
              <div key={day}>
                <p className="date-group">{relDay(day, today)}</p>
                <div className="list">{list.map((t) => <TaskRow key={t.id} task={t} onOpen={open} sub={t.dueTime ? `${t.dueTime}${t.endTime ? `–${t.endTime}` : ''}` : undefined} />)}</div>
              </div>
            )))}
          {tab === 'nodate' && (noDate.length === 0 ? <p className="empty">Здесь будут дела без срока — за них не штрафуют.</p> :
            <div className="list">{noDate.map((t) => <TaskRow key={t.id} task={t} onOpen={open} />)}</div>)}
          {tab === 'quests' && (quests.length === 0 ? <p className="empty">Квестов пока нет. Сюжетный квест — большая цель из шагов.</p> :
            quests.map((q) => <QuestCard key={q.id} q={q} onOpen={open} />))}
          {tab === 'done' && (done.length === 0 ? <p className="empty">Выполненные задания появятся здесь.</p> :
            <div className="list">{done.map((t) => <TaskRow key={t.id} task={t} onOpen={open} />)}</div>)}
        </div>
      </section>
      {editing && <TaskEditor target={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}
