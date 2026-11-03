// Renders the head of the event queue as a system window or a full-screen scene.
import { useEffect, useSyncExternalStore } from 'react';
import type { GameEvent } from '../../game/types';
import type { EventQueue } from './eventQueue';
import { SystemWindow, type SystemWindowProps } from './systemWindow';
import { LevelUpScene } from './levelUpScene';
import { PenaltyScene, type PenaltyView } from './penaltyScene';
import { playSfx } from './sound';
import { buzz } from './haptics';

export interface FxDescribe {
  skillName(id: string): string;
  penalty(id: string): PenaltyView | null;
}

export function describeWindow(e: GameEvent, d: FxDescribe): Omit<SystemWindowProps, 'onDone'> | null {
  switch (e.type) {
    case 'QUEST_COMPLETED': return { title: 'QUEST COMPLETED', lines: [e.title], reward: `+${e.xp} XP   +${e.points} ${e.stat}` };
    case 'STAT_LEVEL_UP': return { title: `${e.stat} LEVEL UP: ${e.from} → ${e.to}`, lines: ['Характеристика выросла'] };
    case 'DAILY_QUEST_COMPLETED': return { title: 'DAILY QUEST COMPLETED', lines: ['Все привычки на сегодня закрыты'], reward: '+3 DIS' };
    case 'STREAK': return { title: 'STREAK', lines: [`${e.habitTitle}: ${e.days} дней подряд`], reward: `+${e.points} ${e.stat}` };
    case 'NEW_SKILL_AVAILABLE': return { title: 'NEW SKILL AVAILABLE', lines: [d.skillName(e.skillId), 'Навык открыт — посмотри испытание'] };
    case 'SKILL_LEVEL_UP': return { title: 'SKILL LEVEL UP', lines: [`${d.skillName(e.skillId)}: Lv ${e.level}`] };
    case 'PENALTY_FAILED': return { title: 'PENALTY FAILED', lines: ['Штраф не отбыт за 48 часов', 'Прогресс характеристик −20%'], tone: 'danger' };
    case 'ERROR': return { title: 'ERROR', lines: [e.message], tone: 'danger', holdMs: 3500 };
    default: return null;
  }
}

export function FxHost({ queue, describe }: { queue: EventQueue; describe: FxDescribe }) {
  const head = useSyncExternalStore(queue.subscribe, queue.current, queue.current);
  const ev = head?.event ?? null;
  useEffect(() => {
    if (!ev) return;
    if (ev.type === 'LEVEL_UP' || ev.type === 'RANK_UP') { playSfx('levelup'); buzz([30, 40, 60]); }
    else if (ev.type === 'PENALTY' || ev.type === 'PENALTY_FAILED' || ev.type === 'ERROR') { playSfx('penalty'); buzz([80, 60, 80]); }
    else if (ev.type === 'QUEST_COMPLETED') { playSfx('complete'); buzz(18); }
    else playSfx('window');
  }, [head?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!head || !ev) return null;
  const next = () => queue.next();
  if (ev.type === 'LEVEL_UP') return <LevelUpScene key={head.id} variant="level" from={ev.from} to={ev.to} onDone={next} />;
  if (ev.type === 'RANK_UP') return <LevelUpScene key={head.id} variant="rank" from={ev.from} to={ev.to} onDone={next} />;
  if (ev.type === 'PENALTY') {
    const view = describe.penalty(ev.penaltyId);
    if (!view) { queueMicrotask(next); return null; }
    return <PenaltyScene key={head.id} view={view} onDone={next} />;
  }
  const w = describeWindow(ev, describe);
  if (!w) { queueMicrotask(next); return null; }
  return <div className="fx-windows"><SystemWindow key={head.id} {...w} onDone={next} /></div>;
}
