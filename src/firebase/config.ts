// Public web-client config of the owner's Firebase project (not secret).
export interface FirebaseConfig { apiKey: string; authDomain: string; projectId: string; appId: string; storageBucket?: string; messagingSenderId?: string }

export const firebaseConfig: FirebaseConfig = {
  apiKey: 'AIzaSyDWGgHLyXJVAUpfWzsaCoYieVthy0qevv0',
  authDomain: 'system-sl-18a3d.firebaseapp.com',
  projectId: 'system-sl-18a3d',
  storageBucket: 'system-sl-18a3d.firebasestorage.app',
  messagingSenderId: '934594300791',
  appId: '1:934594300791:web:104284820397a79bfcef72',
};

/** OAuth Web client ID for Google Calendar (setup.md, section C). */
export const GOOGLE_CLIENT_ID = '934594300791-qec6j7pfipifv2u7e0ldekpn08thf6rc.apps.googleusercontent.com';

export const isConfigured = (): boolean => Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
