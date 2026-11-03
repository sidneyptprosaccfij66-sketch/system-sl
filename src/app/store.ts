// React bindings for the engine.
import { createContext, useContext, useSyncExternalStore } from 'react';
import type { Engine } from './engine';
import type { GameState } from '../game/state';

export const EngineContext = createContext<Engine | null>(null);

export function useEngine(): Engine {
  const e = useContext(EngineContext);
  if (!e) throw new Error('EngineContext is missing');
  return e;
}

export function useGame(): GameState {
  const e = useEngine();
  const s = useSyncExternalStore(e.subscribe, e.getState, e.getState);
  if (!s) throw new Error('Game state is not loaded');
  return s;
}
