// Boot sequence: Firebase (or demo) → sign-in → onboarding → app.
import { useEffect, useRef, useState } from 'react';
import { createEngine, type Engine } from '../../app/engine';
import { EngineContext } from '../../app/store';
import { createDemoRepo, readDemoParams } from '../../app/demo';
import { loadFirebase, FirebaseNotConfiguredError, type FirebaseApi, type User } from '../../firebase/sdk';
import { createFirestoreRepo } from '../../data/firestoreRepo';
import { dayKeyOf } from '../../game/time';
import { Background } from '../fx/Background';
import { setSoundEnabled } from '../fx/sound';
import { App } from './App';

type Phase = { kind: 'loading' } | { kind: 'offline'; message: string } | { kind: 'signedOut' } | { kind: 'onboarding'; name: string } | { kind: 'ready' };

const makeId = () => (crypto.randomUUID ? crypto.randomUUID().replaceAll('-', '').slice(0, 20) : Math.random().toString(36).slice(2) + Date.now().toString(36));

function GateScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="gate-screen" data-app-ready="">
      <Background />
      <div className="gate-card panel"><div className="panel-body">{children}</div></div>
    </div>
  );
}

export function Root() {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [engine, setEngine] = useState<Engine | null>(null);
  const api = useRef<FirebaseApi | null>(null);
  const demo = readDemoParams(location.search);

  const startEngine = async (e: Engine, name: string) => {
    setEngine(e);
    const res = await e.start();
    setSoundEnabled(Boolean(e.getState()?.profile.settings.sound));
    e.subscribe(() => setSoundEnabled(Boolean(e.getState()?.profile.settings.sound)));
    setPhase(res === 'new' ? { kind: 'onboarding', name } : { kind: 'ready' });
  };

  useEffect(() => {
    if (demo.demo) {
      const t0 = Date.now();
      const clock = () => (demo.now ?? t0) + (Date.now() - t0);
      void startEngine(createEngine(createDemoRepo(demo, clock()), { clock, rng: Math.random, newId: makeId }), 'Никита');
      return;
    }
    let unsub: (() => void) | undefined;
    loadFirebase().then((a) => {
      api.current = a;
      unsub = a.onUser((u: User | null) => {
        if (!u) { setEngine(null); setPhase({ kind: 'signedOut' }); return; }
        setPhase({ kind: 'loading' });
        const today = () => dayKeyOf(Date.now(), 'Europe/Moscow', 0);
        const e = createEngine(createFirestoreRepo(a, u.uid, today), { clock: Date.now, rng: Math.random, newId: makeId });
        startEngine(e, u.displayName ?? 'Игрок').catch((err) => setPhase({ kind: 'offline', message: String(err) }));
      });
    }).catch((e) => setPhase({ kind: 'offline', message: e instanceof FirebaseNotConfiguredError ? 'Нет настроек Firebase' : 'Нет связи с сервером' }));
    return () => unsub?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase.kind === 'loading') return <GateScreen><p className="sys gate-msg">CONNECTING…</p></GateScreen>;
  if (phase.kind === 'offline') return (
    <GateScreen>
      <p className="sys gate-msg" style={{ color: 'var(--danger)' }}>SYSTEM OFFLINE</p>
      <p className="muted">{phase.message}. Проверь интернет и попробуй снова.</p>
      <button className="btn" onClick={() => location.reload()}>Повторить</button>
    </GateScreen>
  );
  if (phase.kind === 'signedOut') return (
    <GateScreen>
      <h1 className="holo-title">The System</h1>
      <p className="muted">Войди, чтобы прогресс сохранялся на всех устройствах.</p>
      <button className="btn" onClick={() => api.current?.signIn().catch(() => setPhase({ kind: 'signedOut' }))}>Войти через Google</button>
    </GateScreen>
  );
  if (phase.kind === 'onboarding') return (
    <GateScreen>
      <h1 className="holo-title quest-title"><span className="syswin-mark" aria-hidden="true">!</span>Notification</h1>
      <p className="gate-msg">You have acquired the qualifications to be a Player. Will you accept?</p>
      <button className="btn" onClick={async () => { await engine!.create(phase.name); setPhase({ kind: 'ready' }); }}>Принять</button>
    </GateScreen>
  );
  return (
    <EngineContext.Provider value={engine}>
      <App onSignOut={demo.demo ? undefined : () => void api.current?.signOut()} />
    </EngineContext.Provider>
  );
}
