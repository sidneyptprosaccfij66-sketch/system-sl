// Day view like a calendar: block height = duration, overlapping blocks share the width.
import { useEffect, useState } from 'react';
import type { Rank, StatCode } from '../../game/types';
import { GateBadge } from '../fx/gateBadge';
import { layoutColumns } from './timelineLayout';

export interface TimelineItem {
  id: string;
  title: string;
  start: string; // 'HH:mm'
  end: string;   // 'HH:mm'
  stat: StatCode;
  rank: Rank;
  points: number;
  done: boolean;
  fromCalendar?: boolean;
}

const PX_PER_MIN = 1.15;
const MIN_BLOCK = 46;
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmt = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

function nowMinutes(at: number): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(at));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get('hour') * 60 + get('minute');
}

export function DayTimeline({ items, onToggle, onOpen, rowRef, clock = Date.now }: { items: TimelineItem[]; onToggle: (id: string, el: HTMLElement | null) => void; onOpen?: (id: string) => void; rowRef?: (id: string, el: HTMLElement | null) => void; clock?: () => number }) {
  const [now, setNow] = useState(() => nowMinutes(clock()));
  useEffect(() => { const t = setInterval(() => setNow(nowMinutes(clock())), 60_000); return () => clearInterval(t); }, [clock]);
  if (!items.length) return null;

  const spans = items.map((i) => ({ id: i.id, s: toMin(i.start), e: Math.max(toMin(i.end), toMin(i.start) + 15) }));
  const from = Math.floor(Math.min(...spans.map((x) => x.s), now) / 60) * 60;
  const to = Math.ceil(Math.max(...spans.map((x) => x.e), now + 1) / 60) * 60;
  const cols = layoutColumns(spans);
  const y = (m: number) => (m - from) * PX_PER_MIN;
  const hours: number[] = [];
  for (let h = from; h <= to; h += 60) hours.push(h);

  return (
    <div className="tl" lang="ru" style={{ height: y(to) + 8 }}>
      {hours.map((h) => (
        <div key={h} className="tl-hour" style={{ top: y(h) }}>
          <span className="tl-hour-label num">{fmt(h)}</span>
        </div>
      ))}
      {now >= from && now <= to && (
        <div className="tl-now" style={{ top: y(now) }} aria-label={`Сейчас ${fmt(now)}`}><span className="tl-now-dot" /></div>
      )}
      <div className="tl-track">
        {items.map((it) => {
          const sp = spans.find((x) => x.id === it.id)!;
          const { col, cols: n } = cols[it.id];
          const height = Math.max(MIN_BLOCK, y(sp.e) - y(sp.s) - 3);
          const compact = height < 70;
          return (
            <div
              key={it.id}
              ref={(el) => rowRef?.(it.id, el)}
              className={`tl-block${it.done ? ' is-done' : ''}${compact ? ' is-compact' : ''}${n > 1 ? ' is-narrow' : ''}`}
              data-rank={it.rank}
              style={{ top: y(sp.s), height, left: `calc(${(col / n) * 100}% + ${col ? 3 : 0}px)`, width: `calc(${100 / n}% - ${n > 1 ? 3 : 0}px)` }}
            >
              <button className="check" role="checkbox" aria-checked={it.done} aria-label={it.title} onClick={(e) => onToggle(it.id, (e.currentTarget as HTMLElement).parentElement)} />
              <div className="tl-body">
                {onOpen
                  ? <button className="tl-title row-open" aria-label={`Открыть: ${it.title}`} onClick={() => onOpen(it.id)}>{it.title}</button>
                  : <span className="tl-title">{it.title}</span>}
                <span className="tl-meta">
                  <span className="tl-time num">{it.start}–{it.end}</span>
                  {it.fromCalendar && <span className="tl-cal" title="Из Google Calendar" aria-label="Из Google Calendar">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
                  </span>}
                  <span className="tl-gain">
                    {n === 1 && <span className="reward">+{it.points} {it.stat}</span>}
                    <GateBadge rank={it.rank} label={`Сложность ${it.rank}, +${it.points} ${it.stat}`} />
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
