import { useMemo, useState } from 'react';
import { useEngine, useGame } from '../../app/store';
import { createIdea, deleteIdea, filterIdeas, takeIdea } from '../../game/ideas';
import { createRecurring, deleteRecurring } from '../../game/recurring';
import { suggestStat } from '../../game/classifier';
import type { Rank, RecurringTemplate } from '../../game/types';
import { GateBadge } from '../fx/gateBadge';
import { Field, RankPicker } from '../components/controls';

const EVERY: Record<RecurringTemplate['every'], string> = { week: 'Каждую неделю', '2weeks': 'Раз в 2 недели', month: 'Раз в месяц' };
const WD = ['', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

export function BankScreen() {
  const s = useGame();
  const engine = useEngine();
  const [tags, setTags] = useState<string[]>([]);
  const [idea, setIdea] = useState('');
  const [ideaTags, setIdeaTags] = useState('');
  const [rTitle, setRTitle] = useState('');
  const [every, setEvery] = useState<RecurringTemplate['every']>('week');
  const [weekday, setWeekday] = useState(6);
  const [monthDay, setMonthDay] = useState(1);
  const [rRank, setRRank] = useState<Rank>('C');
  const allTags = useMemo(() => [...new Set(Object.values(s.ideas).filter((i) => i.status === 'bank').flatMap((i) => i.tags))].sort(), [s.ideas]);
  const ideas = filterIdeas(s, tags);
  const toggleTag = (t: string) => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);

  return (
    <main className="screen">
      <header className="screen-head"><h1 className="holo-title screen-title">Банк</h1></header>
      <section className="panel">
        <div className="panel-body">
          <h2 className="holo-title list-title">Повторяющиеся</h2>
          {Object.values(s.recurring).length === 0 && <p className="empty">Например, генеральная уборка каждую субботу.</p>}
          <div className="list">
            {Object.values(s.recurring).map((r) => (
              <div key={r.id} className="row">
                <span className="row-title">{r.title}<span className="row-sub">{EVERY[r.every]}{r.every === 'week' && r.weekday ? `, ${WD[r.weekday]}` : ''}{r.every === 'month' && r.monthDay ? `, ${r.monthDay} число` : ''}</span></span>
                <span className="reward">+{r.points} {r.stat}</span>
                <GateBadge rank={r.rank} />
                <button className="icon-btn" aria-label={`Удалить: ${r.title}`} onClick={() => void engine.run((st, c) => deleteRecurring(st, c, r.id))}>✕</button>
              </div>
            ))}
          </div>
          <form className="qa" style={{ marginTop: 16 }} onSubmit={async (e) => {
            e.preventDefault();
            const ok = await engine.run((st, c) => createRecurring(st, c, { title: rTitle, stat: suggestStat(rTitle, st.learned, 'DIS'), rank: rRank, every, weekday: every === 'week' ? weekday : undefined, monthDay: every === 'month' ? monthDay : undefined }));
            if (ok) setRTitle('');
          }}>
            <Field label="Новое повторяющееся дело"><input className="input" value={rTitle} onChange={(e) => setRTitle(e.target.value)} /></Field>
            <div className="qa-row">
              <select className="select" aria-label="Как часто" value={every} onChange={(e) => setEvery(e.target.value as RecurringTemplate['every'])} style={{ flex: 1 }}>
                {Object.entries(EVERY).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {every === 'week' && <select className="select" aria-label="День недели" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} style={{ width: 90 }}>
                {WD.slice(1).map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
              </select>}
              {every === 'month' && <input className="input" type="number" min={1} max={31} aria-label="Число месяца" value={monthDay} onChange={(e) => setMonthDay(Number(e.target.value))} style={{ width: 90 }} />}
            </div>
            <RankPicker value={rRank} onChange={setRRank} />
            <button className="btn" type="submit">Добавить дело</button>
          </form>
        </div>
      </section>

      <section className="panel">
        <div className="panel-body">
          <h2 className="holo-title list-title">Побочки</h2>
          {allTags.length > 0 && <div className="seg" aria-label="Теги" style={{ marginTop: 12 }}>
            {allTags.map((t) => <button key={t} type="button" className="seg-btn" aria-pressed={tags.includes(t)} onClick={() => toggleTag(t)}>{t}</button>)}
          </div>}
          {ideas.length === 0 && <p className="empty">{tags.length ? 'Нет идей со всеми выбранными тегами.' : 'Добавь идеи для необязательных приятных дел.'}</p>}
          <div className="list">
            {ideas.map((i) => (
              <div key={i.id} className="row" data-idea={i.id}>
                <span className="row-title">{i.title}<span className="row-sub">{i.tags.join(', ')}</span></span>
                <button className="btn is-quiet" style={{ minHeight: 36 }} onClick={() => void engine.run((st, c) => takeIdea(st, c, i.id, suggestStat(i.title, st.learned, 'CHA'), 'C'))}>Взять</button>
                <button className="icon-btn" aria-label={`Удалить: ${i.title}`} onClick={() => void engine.run((st, c) => deleteIdea(st, c, i.id))}>✕</button>
              </div>
            ))}
          </div>
          <form className="qa" style={{ marginTop: 16 }} onSubmit={async (e) => {
            e.preventDefault();
            const ok = await engine.run((st, c) => createIdea(st, c, { title: idea, tags: ideaTags.split(',') }));
            if (ok) { setIdea(''); setIdeaTags(''); }
          }}>
            <Field label="Новая идея"><input className="input" value={idea} onChange={(e) => setIdea(e.target.value)} /></Field>
            <Field label="Теги через запятую"><input className="input" value={ideaTags} onChange={(e) => setIdeaTags(e.target.value)} placeholder="дом, природа" /></Field>
            <button className="btn" type="submit">Добавить идею</button>
          </form>
        </div>
      </section>
    </main>
  );
}
