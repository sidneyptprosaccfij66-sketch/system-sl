// Firestore repository. Layout: users/{uid}/profile/main, users/{uid}/learned/main,
// users/{uid}/meta/evalLock, and one collection per game collection (days keyed by day).
import type { FirebaseApi, DocRef } from '../firebase/sdk';
import { COLLECTIONS, type Changes, type Collection, type GameState } from '../game/state';
import { addDays } from '../game/time';
import { canClaim, type EvalLock, type Repo } from './repo';
import { dayPatch, profilePatch } from './merge';
import type { DayRecord } from '../game/types';

/** Ledger and day records older than this are not loaded (streaks and the journal only need recent history). */
export const HISTORY_DAYS = 120;
const MAX_BATCH = 450;

const strip = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const idOf = (c: Collection, item: any): string => (c === 'days' ? item.day : item.id);
/** Day docs written field by field may lack fields: fill defaults on read. */
const normalizeDay = (d: any): DayRecord => ({ habitsDone: [], sick: false, evaluated: false, habitLedger: {}, streakLedger: {}, streaks: {}, ...d });
const readDocs = (c: Collection, docs: { id: string; data(): any }[]) => Object.fromEntries(docs.map((d) => [d.id, c === 'days' ? normalizeDay(d.data()) : d.data()]));

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
      out[c] = readDocs(c, snap.docs);
    }));
    mirror = out as GameState;
    return structuredClone(mirror);
  }

  async function commit(c: Changes, before?: GameState): Promise<void> {
    const ops: ((b: ReturnType<typeof fs.writeBatch>) => void)[] = [];
    if (c.profile) {
      if (!before) { const v = strip(c.profile); ops.push((b) => b.set(profileRef(), v)); }
      else {
        const p = profilePatch(before.profile, c.profile);
        const upd: Record<string, unknown> = strip(p.fields) as Record<string, unknown>;
        if (p.delta.xp) upd['totals.xp'] = fs.increment(p.delta.xp);
        for (const [st, d] of Object.entries(p.delta.stats)) upd[`totals.stats.${st}`] = fs.increment(d as number);
        if (Object.keys(upd).length) ops.push((b) => b.update(profileRef(), upd));
      }
    }
    if (c.learned) { const v = strip(c.learned); ops.push((b) => b.set(learnedRef(), v)); }
    for (const col of COLLECTIONS) {
      for (const id of c.remove[col] ?? []) ops.push((b) => b.delete(docRef(col, id)));
      for (const item of (c.put[col] as any[]) ?? []) {
        if (col === 'days' && before) {
          const p = dayPatch(before.days[item.day], item);
          const ref = docRef('days', item.day);
          const upd: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(p.set)) upd[k] = v === null ? fs.deleteField() : v;
          for (const [m, entries] of Object.entries(p.maps)) for (const [k, v] of Object.entries(entries)) upd[`${m}.${k}`] = v === null ? fs.deleteField() : v;
          if (p.addDone.length) upd.habitsDone = fs.arrayUnion(...p.addDone);
          ops.push((b) => b.set(ref, { day: item.day }, { merge: true }));
          if (Object.keys(upd).length) ops.push((b) => b.update(ref, upd));
          if (p.removeDone.length) ops.push((b) => b.update(ref, { habitsDone: fs.arrayRemove(...p.removeDone) }));
          continue;
        }
        const v = strip(item);
        ops.push((b) => b.set(docRef(col, idOf(col, item)), v));
      }
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
      const warn = (e: Error) => console.warn('Firestore listener failed', e);
      unsubs.push(fs.onSnapshot(profileRef(), (snap: any) => { if (mirror && snap.exists()) { mirror.profile = snap.data(); if (ready) emit(); } }, warn));
      unsubs.push(fs.onSnapshot(learnedRef(), (snap: any) => { if (mirror && snap.exists()) { mirror.learned = snap.data(); if (ready) emit(); } }, warn));
      for (const col of COLLECTIONS) {
        unsubs.push(fs.onSnapshot(colQuery(col), (snap: any) => {
          if (!mirror) return;
          (mirror as any)[col] = readDocs(col, snap.docs);
          if (ready) emit();
        }, warn));
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
