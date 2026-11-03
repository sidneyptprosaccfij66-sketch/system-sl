// Queue of game events shown one at a time by <FxHost/>.
import type { GameEvent } from '../../game/types';

export interface QueuedEvent { id: number; event: GameEvent }

export interface EventQueue {
  push(events: GameEvent[]): void;
  current(): QueuedEvent | null;
  next(): void;
  subscribe(cb: () => void): () => void;
}

/** Events are shown in the order pushed (game logic already emits LEVEL_UP before RANK_UP). */
export function createEventQueue(): EventQueue {
  let items: QueuedEvent[] = [];
  let seq = 0;
  const subs = new Set<() => void>();
  const emit = () => subs.forEach((s) => s());
  return {
    push(events) {
      if (!events.length) return;
      items = [...items, ...events.map((event) => ({ id: ++seq, event }))];
      emit();
    },
    current: () => items[0] ?? null,
    next() { items = items.slice(1); emit(); },
    subscribe(cb) { subs.add(cb); return () => subs.delete(cb); },
  };
}
