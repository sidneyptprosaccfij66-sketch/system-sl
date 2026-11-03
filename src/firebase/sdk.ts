// Thin typed wrapper over the Firebase JS SDK loaded from gstatic at runtime.
import { firebaseConfig, isConfigured } from './config';

export const FIREBASE_VERSION = '12.16.0';
const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;

export class FirebaseLoadError extends Error {}
export class FirebaseNotConfiguredError extends Error {}

export interface User { uid: string; displayName: string | null; email: string | null }
/* Opaque SDK handles. */
export type DocRef = { readonly __doc: unique symbol; id: string; path: string };
export type ColRef = { readonly __col: unique symbol; id: string; path: string };
export type Query = { readonly __query: unique symbol };
export type Constraint = { readonly __constraint: unique symbol };
export interface DocSnap { id: string; exists(): boolean; data(): any }
export interface QuerySnap { docs: DocSnap[]; empty: boolean }
export interface Batch { set(ref: DocRef, data: object): Batch; delete(ref: DocRef): Batch; commit(): Promise<void> }
export interface Txn { get(ref: DocRef): Promise<DocSnap>; set(ref: DocRef, data: object): Txn }

export interface FirestoreFns {
  doc(db: unknown, path: string, ...segments: string[]): DocRef;
  collection(db: unknown, path: string, ...segments: string[]): ColRef;
  getDoc(ref: DocRef): Promise<DocSnap>;
  getDocs(q: ColRef | Query): Promise<QuerySnap>;
  setDoc(ref: DocRef, data: object): Promise<void>;
  onSnapshot(ref: DocRef | ColRef | Query, next: (snap: any) => void, error?: (e: Error) => void): () => void;
  writeBatch(db: unknown): Batch;
  runTransaction<T>(db: unknown, fn: (t: Txn) => Promise<T>): Promise<T>;
  query(ref: ColRef, ...c: Constraint[]): Query;
  where(field: string, op: '==' | '>=' | '<=' | '>' | '<', value: unknown): Constraint;
  orderBy(field: string, dir?: 'asc' | 'desc'): Constraint;
  limit(n: number): Constraint;
  serverTimestamp(): unknown;
}

export interface FirebaseApi {
  db: unknown;
  fs: FirestoreFns;
  signIn(): Promise<User>;
  signOut(): Promise<void>;
  onUser(cb: (u: User | null) => void): () => void;
}

const load = (name: string): Promise<any> => import(/* external */ `${base}/${name}.js` as string);

let cached: Promise<FirebaseApi> | null = null;

export function loadFirebase(): Promise<FirebaseApi> {
  cached ??= (async () => {
    let appMod: any, authMod: any, fsMod: any;
    try {
      [appMod, authMod, fsMod] = await Promise.all([load('firebase-app'), load('firebase-auth'), load('firebase-firestore')]);
    } catch (e) {
      throw new FirebaseLoadError(String(e));
    }
    if (!isConfigured()) throw new FirebaseNotConfiguredError('firebaseConfig is empty');
    const app = appMod.initializeApp(firebaseConfig);
    const auth = authMod.getAuth(app);
    await authMod.setPersistence(auth, authMod.browserLocalPersistence);
    const db = fsMod.initializeFirestore(app, { ignoreUndefinedProperties: true });
    const toUser = (u: any): User | null => (u ? { uid: u.uid, displayName: u.displayName, email: u.email } : null);
    return {
      db,
      fs: fsMod as FirestoreFns,
      async signIn() {
        const provider = new authMod.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const cred = await authMod.signInWithPopup(auth, provider);
        return toUser(cred.user)!;
      },
      signOut: () => authMod.signOut(auth),
      onUser: (cb) => authMod.onAuthStateChanged(auth, (u: any) => cb(toUser(u))),
    };
  })();
  cached.catch(() => { cached = null; });
  return cached;
}
