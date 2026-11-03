import { useState } from 'react';
import { useEngine, useGame } from '../../app/store';
import { STATS, type Skill, type StatCode } from '../../game/types';
import { createSkill, deleteSkill, isUnlocked, passTrial, updateSkill } from '../../game/skills';
import { StatIcon } from '../fx/statIcons';
import { Field, Sheet, StatPicker } from '../components/controls';

function SkillEditor({ skill, onClose }: { skill?: Skill; onClose: () => void }) {
  const engine = useEngine();
  const [name, setName] = useState(skill?.name ?? '');
  const [stat, setStat] = useState<StatCode>(skill?.stat ?? 'STR');
  const [unlock, setUnlock] = useState(String(skill?.unlockLevel ?? 1));
  const [levels, setLevels] = useState((skill?.levels ?? []).map((l) => l.title).join('\n'));
  const save = async () => {
    const input = { name, stat, unlockLevel: Number(unlock) || 1, levels: levels.split('\n') };
    const ok = skill ? await engine.run((s, c) => updateSkill(s, c, skill.id, input)) : await engine.run((s, c) => createSkill(s, c, input));
    if (ok) onClose();
  };
  return (
    <Sheet title={skill ? 'Навык' : 'Новый навык'} onClose={onClose}>
      <Field label="Название"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <StatPicker value={stat} onChange={setStat} />
      <Field label="Порог: уровень характеристики, чтобы открыть"><input className="input" type="number" min={1} value={unlock} onChange={(e) => setUnlock(e.target.value)} /></Field>
      <Field label="Испытания, по одному в строке"><textarea className="textarea" value={levels} onChange={(e) => setLevels(e.target.value)} placeholder={'30 секунд у стены\n5 секунд без опоры'} /></Field>
      <div className="sheet-actions">
        <button className="btn" onClick={() => void save()}>Сохранить</button>
        {skill && <button className="btn is-danger" onClick={async () => { if (await engine.run((s, c) => deleteSkill(s, c, skill.id))) onClose(); }}>Удалить</button>}
        <button className="btn is-quiet" onClick={onClose}>Отмена</button>
      </div>
    </Sheet>
  );
}

export function SkillsScreen() {
  const s = useGame();
  const engine = useEngine();
  const [editing, setEditing] = useState<Skill | 'new' | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const skills = Object.values(s.skills).sort((a, b) => STATS.indexOf(a.stat) - STATS.indexOf(b.stat) || a.unlockLevel - b.unlockLevel);
  return (
    <section className="screen" data-section="skills" id="skills" aria-label="Навыки">
      <header className="screen-head">
        <h1 className="holo-title screen-title">Навыки</h1>
        <p className="screen-sub">Реальные умения. Открываются уровнем характеристики, растут через испытания.</p>
      </header>
      <div className="qa-row" style={{ justifyContent: 'center' }}><button className="btn" onClick={() => setEditing('new')}>Новый навык</button></div>
      <section className="panel">
        <div className="panel-body">
          {skills.length === 0 && <p className="empty">Навыков нет. Создай первый — например, стойку на руках.</p>}
          {skills.map((k) => {
            const open = isUnlocked(s, k);
            const max = k.currentLevel >= k.levels.length;
            return (
              <div key={k.id} className={`skill${open ? '' : ' is-locked'}`} data-skill={k.id}>
                <div className="skill-head">
                  <StatIcon stat={k.stat} />
                  <span className="skill-name">{k.name}</span>
                  <span className="sys skill-lv">{max ? 'MAX' : `Lv ${k.currentLevel}/${k.levels.length}`}</span>
                  <button className="icon-btn" aria-label={`Изменить: ${k.name}`} onClick={() => setEditing(k)}>✎</button>
                </div>
                {!open && <p className="hint">Откроется при {k.stat} {k.unlockLevel}</p>}
                <ol className="trials">
                  {k.levels.map((l, i) => <li key={i} className={`trial${i < k.currentLevel ? ' is-passed' : i === k.currentLevel ? ' is-current' : ''}`}>{l.title}</li>)}
                </ol>
                {open && !max && (confirm === k.id
                  ? <div className="sheet-actions">
                      <button className="btn" onClick={() => { setConfirm(null); void engine.run((st, c) => passTrial(st, c, k.id)); }}>Да, прошёл</button>
                      <button className="btn is-quiet" onClick={() => setConfirm(null)}>Отмена</button>
                    </div>
                  : <button className="btn" onClick={() => setConfirm(k.id)}>Испытание пройдено</button>)}
              </div>
            );
          })}
        </div>
      </section>
      {editing && <SkillEditor skill={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </section>
  );
}
