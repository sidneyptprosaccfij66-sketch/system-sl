import { useEngine, useGame } from '../../app/store';
import { STATS, type LedgerKind, type Penalty } from '../../game/types';
import { todayKey } from '../../game/state';
import { addDays, weekdayOf } from '../../game/time';
import { activeHabits, streakLength } from '../../game/daily';
import { servePenalty } from '../../game/evaluate';
import { dateTime, longDate } from '../components/format';

const KIND: Record<LedgerKind, string> = { task: 'Задание', habit: 'Привычка', daily_bonus: 'Ежедневный квест', streak: 'Серия', skill: 'Испытание навыка', penalty_loss: 'Проваленный штраф', revert: 'Отмена' };
const STATUS: Record<Penalty['status'], string> = { active: 'действует', served: 'отбыт', failed: 'провален' };

export function JournalScreen() {
  const s = useGame();
  const engine = useEngine();
  const now = engine.now();
  const today = todayKey(s, now);
  const monday = addDays(today, 1 - weekdayOf(today));
  const week = Object.values(s.ledger).filter((e) => e.day >= monday && e.day <= today);
  const byStat = Object.fromEntries(STATS.map((st) => [st, week.filter((e) => e.stat === st).reduce((a, e) => a + e.points, 0)]));
  const weekXp = week.reduce((a, e) => a + e.xp, 0);
  const entries = Object.values(s.ledger).sort((a, b) => b.at - a.at).slice(0, 100);
  const penalties = Object.values(s.penalties).sort((a, b) => b.issuedAt - a.issuedAt);
  const title = (refId?: string) => (refId && s.tasks[refId]?.title) || (refId && s.habits[refId]?.title) || (refId && s.habits[refId.split(':')[0]]?.title) || '';

  return (
    <main className="screen">
      <header className="screen-head"><a className="back-link" href="#/more" aria-label="Назад"><span aria-hidden="true">‹</span> Назад</a><h1 className="holo-title screen-title">Журнал</h1></header>
      <section className="panel">
        <div className="panel-body">
          <h2 className="holo-title list-title">Эта неделя</h2>
          <p className="quest-sub">С {longDate(monday)} · <span className="num">{weekXp}</span> XP</p>
          <div className="week">
            {STATS.map((st) => <div key={st} className="week-cell"><span className="week-num">{byStat[st]}</span><span className="sys stat-code">{st}</span></div>)}
          </div>
        </div>
      </section>
      {activeHabits(s).length > 0 && (
        <section className="panel">
          <div className="panel-body">
            <h2 className="holo-title list-title">Серии</h2>
            <div className="list">
              {activeHabits(s).map((h) => {
                const done = s.days[today]?.habitsDone.includes(h.id);
                const n = streakLength(s, h.id, done ? today : addDays(today, -1));
                return <div key={h.id} className="row"><span className="row-title">{h.title}</span><span className="reward">{n} {n % 10 === 1 && n % 100 !== 11 ? 'день' : 'дн.'}</span></div>;
              })}
            </div>
          </div>
        </section>
      )}
      {penalties.length > 0 && (
        <section className="panel">
          <div className="panel-body">
            <h2 className="holo-title list-title">Штрафы</h2>
            {penalties.map((p) => (
              <div key={p.id} className="row">
                <span className="row-title">{p.restrictions.join(' · ') || 'Только Penalty Zone'}<span className="row-sub">за {longDate(p.forDay)} · до {dateTime(p.activeUntil)} · {STATUS[p.status]}</span></span>
                {p.status === 'active' && <button className="btn is-danger" style={{ minHeight: 36 }} disabled={now < p.activeUntil} onClick={() => void engine.run((st, c) => servePenalty(st, c, p.id))}>Штраф отбыт</button>}
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="panel">
        <div className="panel-body">
          <h2 className="holo-title list-title">Начисления</h2>
          {entries.length === 0 && <p className="empty">Здесь появится каждое начисление и списание.</p>}
          {entries.map((e) => (
            <div key={e.id} className="ledger-row" data-ledger={e.id}>
              <span className="muted num" style={{ fontSize: 'var(--t-xs)' }}>{e.day.slice(5).split('-').reverse().join('.')}</span>
              <span>{KIND[e.kind]}{title(e.refId) ? `: ${title(e.refId)}` : ''}{e.multiplier === 0.5 ? ' (×0.5)' : ''}</span>
              <span className={`ledger-gain${e.points < 0 ? ' is-neg' : ''}`}>{e.points >= 0 ? '+' : '−'}{Math.abs(e.points)} {e.stat}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
