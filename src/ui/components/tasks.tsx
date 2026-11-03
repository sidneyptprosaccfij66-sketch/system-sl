// Task row, quick add form and the task/quest editor.
import { useMemo, useRef, useState } from 'react';
import type { ChecklistItem, DayKey, Rank, StatCode, Task } from '../../game/types';
import { completeTask, createTask, deleteTask, rememberStat, rescheduleTask, uncompleteTask, updateTask, canReschedule } from '../../game/actions';
import { suggestStat } from '../../game/classifier';
import { RANK_POINTS } from '../../game/ranks';
import { todayKey } from '../../game/state';
import { addDays } from '../../game/time';
import { useEngine, useGame } from '../../app/store';
import { GateBadge } from '../fx/gateBadge';
import { flyToStat } from '../fx/flyToStat';
import { Field, RankPicker, Sheet, StatPicker } from './controls';
import { relDay } from './format';

/** Completes or un-completes a task with the fly-to-stat effect. */
export function useToggleTask() {
  const engine = useEngine();
  return (t: Task, el: Element | null) => {
    if (t.status === 'done') { void engine.run((s, c) => uncompleteTask(s, c, t.id)); return; }
    const mult = Object.values(engine.getState()!.penalties).some((p) => p.status === 'active') ? 0.5 : 1;
    void flyToStat(el, t.stat, `+${mult === 1 ? t.points : Math.max(1, Math.floor(t.points / 2))} ${t.stat}`);
    void engine.run((s, c) => completeTask(s, c, t.id));
  };
}

export function TaskRow({ task, onOpen, sub }: { task: Task; onOpen: (t: Task) => void; sub?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const toggle = useToggleTask();
  const done = task.status === 'done';
  return (
    <div ref={ref} className={`row${done ? ' is-done' : ''}`}>
      <button className="check" role="checkbox" aria-checked={done} aria-label={task.title} onClick={() => toggle(task, ref.current)} />
      <button className="row-open" aria-label={`Открыть: ${task.title}`} onClick={() => onOpen(task)}>
        {task.title}
        {sub && <span className="row-sub">{sub}</span>}
      </button>
      <span className="reward">+{task.points} {task.stat}</span>
      <GateBadge rank={task.rank} />
    </div>
  );
}

type DateChoice = 'today' | 'tomorrow' | 'none';

export function QuickAdd({ defaultDate = 'today' }: { defaultDate?: DateChoice }) {
  const engine = useEngine();
  const s = useGame();
  const [title, setTitle] = useState('');
  const [manualStat, setManualStat] = useState<StatCode | null>(null);
  const [rank, setRank] = useState<Rank>('D');
  const [date, setDate] = useState<DateChoice>(defaultDate);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const lastStat = useMemo(() => Object.values(s.tasks).sort((a, b) => b.createdAt - a.createdAt)[0]?.stat ?? 'DIS', [s.tasks]);
  const suggested = suggestStat(title, s.learned, lastStat);
  const stat = manualStat ?? suggested;

  const submit = async () => {
    if (!title.trim()) return;
    const today = todayKey(s, engine.now());
    const dueDay = date === 'today' ? today : date === 'tomorrow' ? addDays(today, 1) : undefined;
    const ok = await engine.run((st, c) => createTask(st, c, {
      kind: 'task', title, stat, rank, dueDay,
      dueTime: dueDay && from ? from : undefined, endTime: dueDay && from && to ? to : undefined,
    }));
    if (!ok) return;
    if (manualStat && manualStat !== suggested) void engine.run((st, c) => rememberStat(st, c, title, manualStat));
    setTitle(''); setManualStat(null); setFrom(''); setTo('');
  };

  return (
    <form className="panel" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div className="panel-body qa">
        <input className="input" aria-label="Новое задание" placeholder="Новое задание" value={title} onChange={(e) => setTitle(e.target.value)} />
        {title.trim() && <>
        <div className="qa-row is-between">
          <StatPicker value={stat} onChange={setManualStat} />
          <span className="reward">+{RANK_POINTS[rank]} {stat}</span>
        </div>
        <RankPicker value={rank} onChange={setRank} />
        <div className="qa-row">
          <div className="seg" role="radiogroup" aria-label="Когда">
            {([['today', 'Сегодня'], ['tomorrow', 'Завтра'], ['none', 'Без даты']] as [DateChoice, string][]).map(([v, l]) => (
              <button key={v} type="button" className="seg-btn" role="radio" aria-checked={date === v} onClick={() => setDate(v)}>{l}</button>
            ))}
          </div>
        </div>
        {date !== 'none' && (
          <div className="time-row">
            <input className="input" type="time" aria-label="С" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="muted">—</span>
            <input className="input" type="time" aria-label="До" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        )}
        <button className="btn" type="submit">Добавить</button>
        </>}
      </div>
    </form>
  );
}

export interface EditorTarget { task?: Task; kind: 'task' | 'quest' }

export function TaskEditor({ target, onClose }: { target: EditorTarget; onClose: () => void }) {
  const engine = useEngine();
  const s = useGame();
  const t = target.task;
  const isQuest = (t?.kind ?? target.kind) === 'quest';
  const [title, setTitle] = useState(t?.title ?? '');
  const [stat, setStat] = useState<StatCode>(t?.stat ?? 'DIS');
  const [statTouched, setStatTouched] = useState(Boolean(t));
  const [rank, setRank] = useState<Rank>(t?.rank ?? 'C');
  const [questType, setQuestType] = useState<'main' | 'side'>(t?.questType ?? 'side');
  const [dueDay, setDueDay] = useState<DayKey | ''>(t?.dueDay ?? '');
  const [from, setFrom] = useState(t?.dueTime ?? '');
  const [to, setTo] = useState(t?.endTime ?? '');
  const [victory, setVictory] = useState(t?.victory ?? '');
  const [note, setNote] = useState(t?.note ?? '');
  const [steps, setSteps] = useState<ChecklistItem[]>(t?.checklist ?? []);
  const [newStep, setNewStep] = useState('');
  const shownStat = statTouched ? stat : suggestStat(title, s.learned, stat);
  const today = todayKey(s, engine.now());
  const lockedReschedule = t && t.dueDay && t.status === 'open' && !canReschedule(s, engine.now(), t);

  const addStep = () => {
    if (!newStep.trim()) return;
    setSteps([...steps, { id: `st${Date.now().toString(36)}${steps.length}`, text: newStep.trim(), done: false }]);
    setNewStep('');
  };

  const save = async () => {
    const fields = {
      title, stat: shownStat, rank, dueDay: dueDay || undefined, dueTime: dueDay && from ? from : undefined, endTime: dueDay && from && to ? to : undefined,
      note: note.trim() || undefined, ...(isQuest ? { questType, victory: victory.trim() || undefined, checklist: steps } : {}),
    };
    const ok = t
      ? await engine.run((st, c) => updateTask(st, c, t.id, { ...fields, points: rank !== t.rank ? RANK_POINTS[rank] : t.points }))
      : await engine.run((st, c) => createTask(st, c, { kind: isQuest ? 'quest' : 'task', ...fields }));
    if (ok) onClose();
  };

  return (
    <Sheet title={isQuest ? 'Квест' : 'Задание'} onClose={onClose}>
      <Field label="Название"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      {isQuest && (
        <div className="seg" role="radiogroup" aria-label="Тип квеста">
          {([['main', 'Сюжетный'], ['side', 'Побочный']] as const).map(([v, l]) => (
            <button key={v} type="button" className="seg-btn" role="radio" aria-checked={questType === v} onClick={() => setQuestType(v)}>{l}</button>
          ))}
        </div>
      )}
      <div className="qa-row is-between">
        <StatPicker value={shownStat} onChange={(v) => { setStat(v); setStatTouched(true); }} />
        <span className="reward">+{RANK_POINTS[rank]} {shownStat}</span>
      </div>
      <RankPicker value={rank} onChange={setRank} />
      <Field label="Дата"><input className="input" type="date" value={dueDay} min={t ? undefined : today} onChange={(e) => setDueDay(e.target.value)} /></Field>
      {dueDay && (
        <div className="time-row">
          <input className="input" type="time" aria-label="С" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="muted">—</span>
          <input className="input" type="time" aria-label="До" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      )}
      {isQuest && (
        <>
          <Field label="Условие победы"><input className="input" value={victory} onChange={(e) => setVictory(e.target.value)} /></Field>
          <div className="field">
            <span className="field-label">Шаги</span>
            {steps.map((st) => (
              <div key={st.id} className="step">
                <span style={{ flex: 1 }}>{st.text}</span>
                <button type="button" className="icon-btn" aria-label={`Удалить шаг: ${st.text}`} onClick={() => setSteps(steps.filter((x) => x.id !== st.id))}>✕</button>
              </div>
            ))}
            <div className="qa-row">
              <input className="input" style={{ flex: 1 }} aria-label="Новый шаг" placeholder="Новый шаг" value={newStep}
                onChange={(e) => setNewStep(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStep(); } }} />
              <button type="button" className="btn is-quiet" onClick={addStep}>Добавить шаг</button>
            </div>
          </div>
        </>
      )}
      <Field label="Заметка"><textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      {t?.dueDay && t.status === 'open' && (
        <div className="field">
          <button type="button" className="btn is-quiet" disabled={Boolean(lockedReschedule)}
            onClick={async () => { if (await engine.run((st, c) => rescheduleTask(st, c, t.id, addDays(t.dueDay! < today ? today : t.dueDay!, 1)))) onClose(); }}>
            Перенести на завтра
          </button>
          {lockedReschedule
            ? <p className="hint is-warn">Перенос закрыт после 12:00 в день дедлайна</p>
            : <p className="hint">Срок: {relDay(t.dueDay, today)}. Перенести без штрафа можно до 12:00 этого дня.</p>}
        </div>
      )}
      <div className="sheet-actions">
        <button type="button" className="btn" onClick={() => void save()}>Сохранить</button>
        {t && <button type="button" className="btn is-danger" onClick={async () => { if (await engine.run((st, c) => deleteTask(st, c, t.id))) onClose(); }}>Удалить</button>}
        <button type="button" className="btn is-quiet" onClick={onClose}>Отмена</button>
      </div>
    </Sheet>
  );
}
