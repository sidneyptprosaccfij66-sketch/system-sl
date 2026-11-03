import { useState } from 'react';
import { useEngine, useGame } from '../../app/store';
import { createHabit, deleteHabit, updateHabit, updateProfile } from '../../game/actions';
import { suggestStat } from '../../game/classifier';
import { todayKey } from '../../game/state';
import { monthOf } from '../../game/time';
import { sickDaysUsed } from '../../game/evaluate';
import type { StatCode } from '../../game/types';
import { Field, StatPicker, Switch } from '../components/controls';
import { CalendarSection } from '../components/CalendarSection';

export function SettingsScreen({ onSignOut }: { onSignOut?: () => void }) {
  const demo = !onSignOut;
  const s = useGame();
  const engine = useEngine();
  const st = s.profile.settings;
  const [habit, setHabit] = useState('');
  const [habitStat, setHabitStat] = useState<StatCode | null>(null);
  const [restriction, setRestriction] = useState('');
  const [name, setName] = useState(s.profile.name);
  const habits = Object.values(s.habits).sort((a, b) => a.order - b.order);
  const shownStat = habitStat ?? suggestStat(habit, s.learned, 'DIS');
  const sickLeft = st.sickDaysPerMonth - sickDaysUsed(s, monthOf(todayKey(s, engine.now())));
  const setSettings = (patch: Partial<typeof st>) => engine.run((g, c) => updateProfile(g, c, { settings: patch }));

  return (
    <main className="screen">
      <header className="screen-head"><a className="back-link" href="#/more" aria-label="Назад"><span aria-hidden="true">‹</span> Назад</a><h1 className="holo-title screen-title">Настройки</h1></header>

      <section className="panel">
        <div className="panel-body qa">
          <Field label="Имя"><input className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== s.profile.name && void engine.run((g, c) => updateProfile(g, c, { name }))} /></Field>
        </div>
      </section>

      <section className="panel">
        <div className="panel-body">
          <h2 className="holo-title quest-title"><span className="syswin-mark" aria-hidden="true">!</span>Daily Quest</h2>
          <p className="quest-sub">Привычки на каждый день. Закрыл все — +3 DIS, 7 дней подряд — +5.</p>
          {habits.map((h) => (
            <div key={h.id} className="switch-row">
              <span>{h.title}<span className="row-sub">+{h.points} {h.stat}</span></span>
              <Switch checked={h.active} label={`Привычка: ${h.title}`} onChange={(v) => void engine.run((g, c) => updateHabit(g, c, h.id, { active: v }))} />
              <button className="icon-btn" aria-label={`Удалить: ${h.title}`} onClick={() => void engine.run((g, c) => deleteHabit(g, c, h.id))}>✕</button>
            </div>
          ))}
          <form className="qa" style={{ marginTop: 14 }} onSubmit={async (e) => {
            e.preventDefault();
            if (await engine.run((g, c) => createHabit(g, c, { title: habit, stat: shownStat }))) { setHabit(''); setHabitStat(null); }
          }}>
            <input className="input" aria-label="Новая привычка" placeholder="Новая привычка" value={habit} onChange={(e) => setHabit(e.target.value)} />
            <div className="qa-row is-between">
              <StatPicker value={shownStat} onChange={setHabitStat} />
              <button className="btn" type="submit">Добавить привычку</button>
            </div>
          </form>
        </div>
      </section>

      <section className="panel">
        <div className="panel-body">
          <h2 className="holo-title list-title">Наказания</h2>
          <p className="quest-sub">Из включённых система выбирает случайно. Без еды, сна и боли — это принцип.</p>
          {st.restrictions.map((r) => (
            <div key={r.id} className="switch-row">
              <span>{r.text}</span>
              <Switch checked={r.enabled} label={r.text} onChange={(v) => void setSettings({ restrictions: st.restrictions.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)) })} />
            </div>
          ))}
          <form className="qa-row" style={{ marginTop: 14 }} onSubmit={async (e) => {
            e.preventDefault();
            if (!restriction.trim()) return;
            if (await setSettings({ restrictions: [...st.restrictions, { id: `r-${Date.now().toString(36)}`, text: restriction.trim(), enabled: true }] })) setRestriction('');
          }}>
            <input className="input" style={{ flex: 1 }} aria-label="Своё ограничение" placeholder="Своё ограничение" value={restriction} onChange={(e) => setRestriction(e.target.value)} />
            <button className="btn" type="submit">Добавить</button>
          </form>
        </div>
      </section>

      <section className="panel">
        <div className="panel-body qa">
          <Field label="Конец дня (по Москве): в это время подводятся итоги и выдаются штрафы">
            <select className="select" value={st.dayEndHour} onChange={(e) => void setSettings({ dayEndHour: Number(e.target.value) })}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
          </Field>
          <p className="hint">Больничных в этом месяце осталось: {Math.max(0, sickLeft)} из {st.sickDaysPerMonth}. Взять — на экране «Сегодня».</p>
          <div className="switch-row"><span>Звук</span><Switch checked={st.sound} label="Звук" onChange={(v) => void setSettings({ sound: v })} /></div>
          {onSignOut && <button className="btn is-quiet" onClick={onSignOut}>Выйти</button>}
        </div>
      </section>

      <section className="panel">
        <div className="panel-body">
          <h2 className="holo-title list-title">Google Calendar</h2>
          <CalendarSection demo={demo} />
        </div>
      </section>
    </main>
  );
}
