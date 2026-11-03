// Small form controls shared by screens.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RANKS, STATS, STAT_NAMES, type Rank, type StatCode } from '../../game/types';
import { GateBadge } from '../fx/gateBadge';
import { StatIcon } from '../fx/statIcons';

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" className="switch" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />;
}

export function RankPicker({ value, onChange }: { value: Rank; onChange: (r: Rank) => void }) {
  return (
    <div className="rank-pick" role="radiogroup" aria-label="Сложность">
      {RANKS.map((r) => (
        <button key={r} type="button" role="radio" aria-checked={value === r} aria-label={`Сложность ${r}`} onClick={() => onChange(r)}>
          <GateBadge rank={r} />
        </button>
      ))}
    </div>
  );
}

/** Shows the chosen stat; tapping opens the six options inline. */
export function StatPicker({ value, onChange }: { value: StatCode; onChange: (s: StatCode) => void }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className="stat-chip" aria-label={`Характеристика: ${value}`} title={STAT_NAMES[value]} onClick={() => setOpen(true)}>
        <StatIcon stat={value} size={16} />{value}
      </button>
    );
  }
  return (
    <div className="seg" role="radiogroup" aria-label="Характеристика">
      {STATS.map((s) => (
        <button key={s} type="button" className="seg-btn" role="radio" aria-checked={value === s} aria-label={`${s} — ${STAT_NAMES[s]}`}
          onClick={() => { onChange(s); setOpen(false); }}>
          {s}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children, id }: { label: string; children: ReactNode; id?: string }) {
  return <label className="field" htmlFor={id}><span className="field-label">{label}</span>{children}</label>;
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('input, textarea, select, button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="sheet panel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="panel-body">
          <h2 className="holo-title list-title">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

/** 24-hour time in Moscow: two selects, value 'HH:mm' or '' (not set). */
export function TimeField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [h, m] = value ? value.split(':') : ['', ''];
  const mins = m && !MINUTES.includes(m) ? [...MINUTES, m].sort() : MINUTES;
  return (
    <span className="time-field" role="group" aria-label={label}>
      <span className="field-label">{label}</span>
      <select className="select" aria-label={`${label}: часы`} value={h} disabled={disabled}
        onChange={(e) => onChange(e.target.value ? `${e.target.value}:${m || '00'}` : '')}>
        <option value="">--</option>
        {HOURS.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <span className="muted">:</span>
      <select className="select" aria-label={`${label}: минуты`} value={h ? m : ''} disabled={disabled || !h}
        onChange={(e) => onChange(`${h}:${e.target.value}`)}>
        {!h && <option value="">--</option>}
        {mins.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    </span>
  );
}

export function TimeRange({ from, to, setFrom, setTo, now, disabled }: { from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void; now: string; disabled?: boolean }) {
  return (
    <div className="time-range">
      <TimeField label="С" value={from} disabled={disabled} onChange={(v) => { setFrom(v); if (!v) setTo(''); }} />
      <TimeField label="До" value={to} disabled={disabled || !from} onChange={setTo} />
      <span className="hint">Сейчас {now} МСК</span>
    </div>
  );
}
