// Settings block: connect Google Calendar, choose calendars to import, sync now.
import { useState } from 'react';
import { useEngine, useGame } from '../../app/store';
import { updateProfile } from '../../game/actions';
import { GOOGLE_CLIENT_ID } from '../../firebase/config';
import { getCalendarToken } from '../../calendar/gis';
import { createCalendarApi, type CalendarListItem } from '../../calendar/api';
import { ensureQuestsCalendar, runSync } from '../../calendar/runSync';
import { Switch } from './controls';
import { dateTime } from './format';

export function CalendarSection({ demo }: { demo: boolean }) {
  const s = useGame();
  const engine = useEngine();
  const cal = s.profile.settings.calendar;
  const [calendars, setCalendars] = useState<CalendarListItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (demo) return <p className="hint">Google Calendar работает только после входа через Google.</p>;
  if (!GOOGLE_CLIENT_ID) return <p className="hint">Подключение заработает, когда в приложение будет добавлен Client ID (инструкция, раздел C).</p>;

  const withApi = async (fn: (api: ReturnType<typeof createCalendarApi>) => Promise<void>) => {
    setBusy(true); setError('');
    try { await fn(createCalendarApi(await getCalendarToken(GOOGLE_CLIENT_ID, true))); }
    catch (e) { setError(`Не получилось: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setBusy(false); }
  };
  const setImports = (imports: typeof cal.imports) => engine.run((g, c) => updateProfile(g, c, { settings: { calendar: { ...g.profile.settings.calendar, imports } } }));

  return (
    <div className="qa">
      {!cal.connected
        ? <button className="btn" disabled={busy} onClick={() => void withApi(async (api) => { await ensureQuestsCalendar(engine, api); setCalendars(await api.listCalendars()); })}>Подключить Google Calendar</button>
        : <>
            <p className="hint">Задания с датой попадают в календарь «Quests». Синхронизация — при открытии приложения и по кнопке.{cal.lastSyncAt ? ` Последняя: ${dateTime(cal.lastSyncAt)}.` : ''}</p>
            <button className="btn" disabled={busy} onClick={() => void withApi(async (api) => { const f = await runSync(engine, api); if (f.length) setError(`Не синхронизировалось (${f.length}): ${f.slice(0, 3).join('; ')}`); })}>{busy ? 'Синхронизирую…' : 'Синхронизировать'}</button>
            {calendars === null
              ? <button className="btn is-quiet" disabled={busy} onClick={() => void withApi(async (api) => setCalendars(await api.listCalendars()))}>Выбрать календари для импорта</button>
              : calendars.filter((c) => c.id !== cal.questsCalendarId).map((c) => {
                  const imp = cal.imports.find((i) => i.calendarId === c.id);
                  return (
                    <div key={c.id} className="switch-row">
                      <span>{c.summary}{imp && <span className="row-sub">штрафовать за пропуск: {imp.penalize ? 'да' : 'нет'}</span>}</span>
                      {imp && <Switch checked={imp.penalize} label={`Штрафовать: ${c.summary}`} onChange={(v) => void setImports(cal.imports.map((i) => (i.calendarId === c.id ? { ...i, penalize: v } : i)))} />}
                      <Switch checked={Boolean(imp)} label={`Импортировать: ${c.summary}`}
                        onChange={(v) => void setImports(v ? [...cal.imports, { calendarId: c.id, name: c.summary, penalize: false }] : cal.imports.filter((i) => i.calendarId !== c.id))} />
                    </div>
                  );
                })}
          </>}
      {error && <p className="hint is-warn">{error}</p>}
    </div>
  );
}
