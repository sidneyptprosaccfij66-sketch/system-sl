// Stage-1 probe: verifies Google sign-in and a Firestore round trip on the owner's devices.
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FirebaseNotConfiguredError, loadFirebase, type FirebaseApi, type User } from './firebase/sdk';

type Phase = { kind: 'loading' } | { kind: 'offline'; detail: string } | { kind: 'unconfigured' }
  | { kind: 'signedOut' } | { kind: 'checking'; user: User } | { kind: 'online'; user: User; ms: number } | { kind: 'error'; message: string };

const box: React.CSSProperties = { maxWidth: 420, margin: '15vh auto', padding: 24, border: '1px solid rgba(120,190,255,.3)', background: 'rgba(12,22,44,.6)',
  color: '#e6f1ff', fontFamily: 'system-ui, sans-serif', textAlign: 'center' };
const title: React.CSSProperties = { letterSpacing: '.25em', fontWeight: 700, fontSize: 20, margin: '0 0 12px' };
const btn: React.CSSProperties = { marginTop: 16, padding: '12px 20px', background: 'transparent', color: '#4cc3ff', border: '1px solid #4cc3ff', fontSize: 16, cursor: 'pointer' };

function Probe() {
  const [api, setApi] = useState<FirebaseApi | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });

  useEffect(() => {
    loadFirebase().then((a) => {
      setApi(a);
      return a.onUser((u) => (u ? check(a, u) : setPhase({ kind: 'signedOut' })));
    }).catch((e) => setPhase(e instanceof FirebaseNotConfiguredError ? { kind: 'unconfigured' } : { kind: 'offline', detail: String(e) }));
  }, []);

  async function check(a: FirebaseApi, user: User) {
    setPhase({ kind: 'checking', user });
    try {
      const t0 = performance.now();
      const ref = a.fs.doc(a.db, 'users', user.uid, 'meta', 'probe');
      await a.fs.setDoc(ref, { at: a.fs.serverTimestamp(), ua: navigator.userAgent });
      const snap = await a.fs.getDoc(ref);
      if (!snap.exists()) throw new Error('документ не прочитан');
      setPhase({ kind: 'online', user, ms: Math.round(performance.now() - t0) });
    } catch (e) {
      setPhase({ kind: 'error', message: String(e) });
    }
  }

  const signIn = () => api?.signIn().catch((e) => setPhase({ kind: 'error', message: String(e) }));
  return (
    <div style={box}>
      {phase.kind === 'loading' && <p style={title}>CONNECTING…</p>}
      {phase.kind === 'offline' && <><p style={{ ...title, color: '#ff3b4e' }}>SYSTEM OFFLINE</p><p>Нет связи с сервером. Проверь интернет и обнови страницу.</p></>}
      {phase.kind === 'unconfigured' && <><p style={title}>SYSTEM NOT CONFIGURED</p><p>Нужно вставить firebaseConfig.</p></>}
      {phase.kind === 'signedOut' && <><p style={title}>THE SYSTEM</p><p>Проверка входа</p><button style={btn} onClick={signIn}>Войти через Google</button></>}
      {phase.kind === 'checking' && <p style={title}>CHECKING…</p>}
      {phase.kind === 'online' && <><p style={{ ...title, color: '#4cc3ff' }}>SYSTEM ONLINE</p><p>{phase.user.displayName ?? phase.user.email}</p>
        <p style={{ opacity: .6 }}>Запись и чтение из базы: {phase.ms} мс</p><button style={btn} onClick={() => api?.signOut()}>Выйти</button></>}
      {phase.kind === 'error' && <><p style={{ ...title, color: '#ff3b4e' }}>ERROR</p><p style={{ wordBreak: 'break-word' }}>{phase.message}</p>
        <button style={btn} onClick={() => location.reload()}>Повторить</button></>}
    </div>
  );
}

document.body.style.background = '#05070d';
createRoot(document.getElementById('root')!).render(<Probe />);
