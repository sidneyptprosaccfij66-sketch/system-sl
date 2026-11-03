// Google Identity Services token client (runs in the browser, no server).
export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.app.created',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
].join(' ');

export class NeedsConsentError extends Error {}

declare global { interface Window { google?: any } }

let scriptLoad: Promise<void> | null = null;
function loadScript(): Promise<void> {
  scriptLoad ??= new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = 'https://accounts.google.com/gsi/client';
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => { scriptLoad = null; reject(new Error('Не удалось загрузить вход Google')); };
    document.head.appendChild(el);
  });
  return scriptLoad;
}

let cached: { token: string; until: number } | null = null;

export async function getCalendarToken(clientId: string, interactive: boolean, hint?: string): Promise<string> {
  if (cached && cached.until > Date.now() + 60_000) return cached.token;
  await loadScript();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: CALENDAR_SCOPES,
      hint,
      callback: (r: any) => {
        if (r.error || !r.access_token) { reject(new NeedsConsentError(r.error ?? 'no token')); return; }
        cached = { token: r.access_token, until: Date.now() + Number(r.expires_in ?? 3600) * 1000 };
        resolve(r.access_token);
      },
      error_callback: (e: any) => reject(new NeedsConsentError(e?.type ?? 'popup')),
    });
    client.requestAccessToken({ prompt: interactive ? 'consent' : '' });
  });
}
