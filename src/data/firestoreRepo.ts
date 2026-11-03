// Firestore repository. Layout: users/{uid}/profile/main, users/{uid}/learned/main,
// users/{uid}/meta/evalLock, and one collection per game collection (days keyed by day).
import type { FirebaseApi, DocRef } from '../firebase/sdk';
import { COLLECTIONS, type Changes, type Collection, type GameState } from '../game/state';
import { addDays } from '../game/time';
import { canClaim, type EvalLock, type Repo } from './repo';

/** Ledger and day records older than this are not loaded (streaks and the journal only need recent history). */
export const HISTORY_DAYS = 120;
const MAX_BATCH = 450;

const strip = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const idOf = (c: Collection, item: any): string => (c === 'days' ? item.day : item.id);

export function createFirestoreRepo(api: FirebaseApi, uid: string, today: () => string): Repo {
  const { fs, db } = api;
  const base = ['users', uid] as const;
  const profileRef = () => fs.doc(db, ...base, 'profile', 'main');
  const learnedRef = () => fs.doc(db, ...base, 'learned', 'main');
  const lockRef = () => fs.doc(db, ...base, 'meta', 'evalLock');
  const docRef = (c: Collection, id: string): DocRef => fs.doc(db, ...base, c, id);
  const colQuery = (c: Collection) => {
    const col = fs.collection(db, ...base, c);
    return c === 'ledger' || c === 'days' ? fs.query(col, fs.where('day', '>=', addDays(today(), -HISTORY_DAYS))) : col;
  };

  let mirror: GameState | null = null;

  async function load(): Promise<GameState | null> {
    const p = await fs.getDoc(profileRef());
    if (!p.exists()) return null;
    const learned = await fs.getDoc(learnedRef());
    const out: any = { profile: p.data(), learned: learned.exists() ? learned.data() : {} };
    await Promise.all(COLLECTIONS.map(async (c) => {
      const snap = await fs.getDocs(colQuery(c));
      out[c] = Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
    }));
    mirror = out as GameState;
    return structuredClone(mirror);
  }

  async function commit(c: Changes): Promise<void> {
    const ops: ((b: ReturnType<typeof fs.writeBatch>) => void)[] = [];
    if (c.profile) { const v = strip(c.profile); ops.push((b) => b.set(profileRef(), v)); }
    if (c.learned) { const v = strip(c.learned); ops.push((b) => b.set(learnedRef(), v)); }
    for (const col of COLLECTIONS) {
      for (const id of c.remove[col] ?? []) ops.push((b) => b.delete(docRef(col, id)));
      for (const item of (c.put[col] as any[]) ?? []) { const v = strip(item); ops.push((b) => b.set(docRef(col, idOf(col, item)), v)); }
    }
    for (let i = 0; i < ops.length; i += MAX_BATCH) {
      const batch = fs.writeBatch(db);
      ops.slice(i, i + MAX_BATCH).forEach((op) => op(batch));
      await batch.commit();
    }
  }

  return {
    load,
    async init(state) {
      const c: Changes = { profile: state.profile, learned: state.learned, put: {}, remove: {} };
      for (const col of COLLECTIONS) (c.put as any)[col] = Object.values(state[col]);
      await commit(c);
      mirror = structuredClone(state);
    },
    commit,
    subscribe(cb) {
      const unsubs: (() => void)[] = [];
      const emit = () => { if (mirror) cb(structuredClone(mirror)); };
      let ready = false;
      unsubs.push(fs.onSnapshot(profileRef(), (snap: any) => { if (mirror && snap.exists()) { mirror.profile = snap.data(); if (ready) emit(); } }));
      unsubs.push(fs.onSnapshot(learnedRef(), (snap: any) => { if (mirror && snap.exists()) { mirror.learned = snap.data(); if (ready) emit(); } }));
      for (const col of COLLECTIONS) {
        unsubs.push(fs.onSnapshot(colQuery(col), (snap: any) => {
          if (!mirror) return;
          (mirror as any)[col] = Object.fromEntries(snap.docs.map((d: any) => [d.id, d.data()]));
          if (ready) emit();
        }));
      }
      queueMicrotask(() => { ready = true; });
      return () => unsubs.forEach((u) => u());
    },
    async claimEvaluation(day, token, now) {
      return fs.runTransaction(db, async (t) => {
        const snap = await t.get(lockRef());
        const lock = snap.exists() ? (snap.data() as EvalLock) : null;
        if (!canClaim(lock, day, token, now)) return false;
        t.set(lockRef(), { day, token, at: now });
        return true;
      });
    },
  };
}
