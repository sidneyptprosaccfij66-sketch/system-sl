import { useGame, useEngine } from '../../app/store';
import { STATS, STAT_NAMES } from '../../game/types';
import { hunterRank, playerProgress, statProgress } from '../../game/levels';
import { activeHabits } from '../../game/daily';
import { isUnlocked } from '../../game/skills';
import { todayKey } from '../../game/state';
import { Counter } from '../fx/counter';
import { ProgressBar } from '../fx/progressBar';
import { RankBadge } from '../fx/rankBadge';
import { StatIcon } from '../fx/statIcons';
import { PenaltyBanner } from '../components/PenaltyBanner';

export function StatusScreen() {
  const s = useGame();
  const engine = useEngine();
  const xp = playerProgress(s.profile.totals.xp);
  const rank = hunterRank(xp.level);
  const habits = activeHabits(s);
  const done = s.days[todayKey(s, engine.now())]?.habitsDone.filter((id) => habits.some((h) => h.id === id)).length ?? 0;
  const penalties = Object.values(s.penalties).filter((p) => p.status === 'active').length;
  const nextSkills = Object.values(s.skills).filter((k) => isUnlocked(s, k) && k.currentLevel < k.levels.length).slice(0, 2);

  return (
    <section className="screen" data-section="status" id="status" aria-label="Статус">
      <PenaltyBanner />
      <section className="frame status-frame">
        <span className="frame-side is-left" />
        <span className="frame-side is-right" />
        <div className="panel status">
          <div className="panel-body">
            <h1 className="holo-title status-title">Status</h1>
            <p className="status-player">{s.profile.name}</p>
            <div className="status-top">
              <div className="hero">
                <span className="hero-num"><Counter value={xp.level} from={0} duration={1400} /></span>
                <span className="sys hero-label">Level</span>
              </div>
              <span className="hero-divider" aria-hidden="true" />
              <div className="hero">
                <RankBadge rank={rank} size="hero" label={`Ранг охотника ${rank}`} />
                <span className="sys hero-label">Rank</span>
              </div>
            </div>
            <div className="holo-box vitals">
              <div className="vital is-wide">
                <span className="sys vital-label">XP</span>
                <div className="vital-bar">
                  <ProgressBar value={xp.ratio} level={xp.level} label="Опыт до следующего уровня" />
                  <span className="vital-num num"><Counter value={xp.into} from={0} duration={1600} />/{xp.needed}</span>
                </div>
              </div>
              <div className="vital">
                <span className="sys vital-label">Daily</span>
                <div className="vital-bar">
                  <ProgressBar value={habits.length ? done / habits.length : 0} label="Ежедневный квест" />
                  <span className="vital-num num">{done}/{habits.length}</span>
                </div>
              </div>
              <div className={`vital-penalty sys${penalties ? ' is-on' : ''}`}>Penalty: <span className="num">{penalties}</span></div>
            </div>
            <div className="holo-box stats">
              {STATS.map((st, i) => {
                const p = statProgress(s.profile.totals.stats[st]);
                return (
                  <div key={st} className="stat" style={{ '--i': i } as React.CSSProperties} title={STAT_NAMES[st]} data-stat={st} data-points={s.profile.totals.stats[st]}>
                    <span className="stat-icon"><StatIcon stat={st} /></span>
                    <span className="sys stat-code">{st}:</span>
                    <span className="stat-lv glow-text" data-stat-anchor={st}><Counter value={p.level} from={0} duration={1100} /></span>
                    <span className="stat-prog"><ProgressBar value={p.ratio} level={p.level} thin label={`${STAT_NAMES[st]}: ${p.into} из ${p.needed} до следующего уровня`} /></span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      {nextSkills.length > 0 && (
        <section className="panel">
          <div className="panel-body">
            <h2 className="holo-title list-title">Навыки</h2>
            {nextSkills.map((k) => (
              <a key={k.id} href="#/skills" className="row" style={{ color: 'inherit', textDecoration: 'none' }}>
                <StatIcon stat={k.stat} />
                <span className="row-title">{k.name}<span className="row-sub">Следующее испытание: {k.levels[k.currentLevel].title}</span></span>
                <span className="sys skill-lv">Lv {k.currentLevel}</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
