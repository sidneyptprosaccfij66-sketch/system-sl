// Public web-client config of the owner's Firebase project (not secret).
export interface FirebaseConfig { apiKey: string; authDomain: string; projectId: string; appId: string; storageBucket?: string; messagingSenderId?: string }

export const firebaseConfig: FirebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  appId: '',
};

/** OAuth Web client ID for Google Calendar (setup.md, section C). */
export const GOOGLE_CLIENT_ID = '';

export const isConfigured = (): boolean => Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
