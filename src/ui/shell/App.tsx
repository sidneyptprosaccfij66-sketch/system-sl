// Signed-in app: background, navigation, current screen, effects.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useEngine, useGame } from '../../app/store';
import { Background } from '../fx/Background';
import { FxHost, type FxDescribe } from '../fx/FxHost';
import { dateTime } from '../components/format';
import { Nav } from './Nav';
import { FEED, isFeed, setHashQuietly, useRoute, type FeedRoute } from './router';
import { prefersReducedMotion } from '../fx/motion';
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
  const feed = isFeed(route);
  const [active, setActive] = useState<FeedRoute>(feed ? route : 'more');
  const programmatic = useRef(0);

  const scrollTo = (r: FeedRoute, smooth: boolean) => {
    const el = document.querySelector(`[data-section="${r}"]`);
    if (!el) return;
    programmatic.current = 1;
    setActive(r);
    setHashQuietly(r);
    el.scrollIntoView({ behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto', block: 'start' });
  };

  // Arriving at a feed route (initial load, back from a sub-page, typed hash): jump to that section.
  useLayoutEffect(() => { if (feed) scrollTo(route, false); }, [route]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll spy: the section crossing 30% of the screen height is the active one.
  // During a menu jump the spy waits until scrolling stops, then settles on the real position.
  useEffect(() => {
    if (!feed) return;
    let raf = 0;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const pick = (): FeedRoute | null => {
      const y = innerHeight * 0.3;
      for (const r of FEED) {
        const b = document.querySelector(`[data-section="${r}"]`)?.getBoundingClientRect();
        if (b && b.top <= y && b.bottom > y) return r;
      }
      return null;
    };
    const settle = () => { const k = pick(); if (k) { setActive(k); setHashQuietly(k); } };
    const onScroll = () => {
      clearTimeout(idle);
      idle = setTimeout(() => { programmatic.current = 0; settle(); }, 160);
      if (programmatic.current) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(settle);
    };
    addEventListener('scroll', onScroll, { passive: true });
    return () => { removeEventListener('scroll', onScroll); clearTimeout(idle); cancelAnimationFrame(raf); };
  }, [feed]);

  const go = (r: FeedRoute) => {
    if (!feed) { location.hash = `#/${r}`; return; }
    scrollTo(r, true);
  };

  return (
    <div className="app" data-app-ready="">
      <Background />
      {feed ? (
        <main className="feed">
          <StatusScreen />
          <TodayScreen />
          <TasksScreen />
          <SkillsScreen />
          <MoreScreen />
        </main>
      ) : (
        <>
          {route === 'more/bank' && <BankScreen />}
          {route === 'more/journal' && <JournalScreen />}
          {route === 'more/settings' && <SettingsScreen onSignOut={onSignOut} />}
        </>
      )}
      <Nav active={feed ? active : null} onGo={go} />
      <FxHost queue={engine.events} describe={describe} />
    </div>
  );
}
