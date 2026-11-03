// Signed-in app: background, navigation, current screen, effects.
import { useMemo } from 'react';
import { useEngine, useGame } from '../../app/store';
import { Background } from '../fx/Background';
import { FxHost, type FxDescribe } from '../fx/FxHost';
import { dateTime } from '../components/format';
import { Nav } from './Nav';
import { useRoute } from './router';
import { StatusScreen } from '../screens/Status';
import { TodayScreen } from '../screens/Today';
import { TasksScreen } from '../screens/Tasks';
import { SkillsScreen } from '../screens/Skills';
import { MoreScreen } from '../screens/More';
import { BankScreen } from '../screens/Bank';
import { JournalScreen } from '../screens/Journal';
import { SettingsScreen } from '../screens/Settings';

const SEVERITY = { light: 'Лёгкий штраф', medium: 'Средний штраф', heavy: 'Тяжёлый штраф' } as const;

export function App({ onSignOut }: { onSignOut?: () => void }) {
  const engine = useEngine();
  const s = useGame();
  const route = useRoute();
  const describe = useMemo<FxDescribe>(() => ({
    skillName: (id) => engine.getState()?.skills[id]?.name ?? 'Навык',
    penalty: (id) => {
      const p = engine.getState()?.penalties[id];
      if (!p) return null;
      return { severityLabel: SEVERITY[p.severity], reasons: p.reasons.map((r) => `${r.title} · ${r.points}`), restrictions: p.restrictions, until: dateTime(p.activeUntil) };
    },
  }), [engine]);
  void s;
  return (
    <div className="app" data-app-ready="">
      <Background />
      {route === 'status' && <StatusScreen />}
      {route === 'today' && <TodayScreen />}
      {route === 'tasks' && <TasksScreen />}
      {route === 'skills' && <SkillsScreen />}
      {route === 'more' && <MoreScreen />}
      {route === 'more/bank' && <BankScreen />}
      {route === 'more/journal' && <JournalScreen />}
      {route === 'more/settings' && <SettingsScreen onSignOut={onSignOut} />}
      <Nav route={route} />
      <FxHost queue={engine.events} describe={describe} />
    </div>
  );
}
