# THE SYSTEM — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** личное PWA в стиле Solo Leveling: дела → очки в характеристики → уровни, штрафы, навыки, Google Calendar; вход через Google, данные в Firestore.

**Architecture:** вся игровая логика — чистые функции в `src/game/`, которые принимают `GameState` и возвращают `Outcome { changes, events }`. `src/app/engine.ts` применяет `changes` к локальному состоянию и к репозиторию (Firestore batch или память), а `events` отдаёт UI для анимаций. UI на React читает состояние через `useSyncExternalStore`.

**Tech Stack:** React 19 (`/opt/npm-tools/node_modules`), TypeScript 6, esbuild 0.28 (через `/opt/npm-tools/node_modules/esbuild`), `node:test` + tsx, Playwright (уже установлен), Firebase JS SDK 12.16.0 с `https://www.gstatic.com/firebasejs/12.16.0/…`, Google Identity Services, Google Calendar API v3, GitHub Pages.

**Spec:** `docs/specs/2026-11-03-system-app-design.md`

## Global Constraints

- npm-реестр недоступен: никаких `npm install`. Пакеты — только из `/opt/npm-tools/node_modules` (через `NODE_PATH` / `nodePaths` esbuild), типы React — вендорить в `vendor/types/` из GitHub (DefinitelyTyped `types/react`, `types/react-dom`; `csstype` из github.com/frenic/csstype).
- Firebase подключается только динамическим `import()` URL с gstatic; в demo-режиме (`?demo=1`) и тестах Firebase не загружается вовсе.
- Характеристики: `STR VIT INT MST DIS CHA`, порядок фиксирован. Английские — только коды/названия характеристик и системные окна (`QUEST COMPLETED`, `LEVEL UP`, `RANK UP`, `STR LEVEL UP: 4 → 5`, `DAILY QUEST COMPLETED`, `PENALTY`, `PENALTY FAILED`, `NEW SKILL AVAILABLE`, `SKILL LEVEL UP`); всё остальное по-русски.
- Ранг → очки: `E1 D2 C3 B5 A8 S13`; ручные очки — целое 1–50.
- XP за очки: ×10. Под штрафом: очки `max(1, floor(p·0.5))`, XP `max(10, floor(p·10·0.5))`.
- Уровень игрока: переход n→n+1 = `100 + 50·(n−1)` XP; всего до L = `100(L−1) + 25(L−1)(L−2)`.
- Ранг охотника: E 1–9, D 10–19, C 20–34, B 35–49, A 50–74, S 75+.
- Уровень характеристики: старт 1; всего очков до L = `L(L+1)/2 − 1`.
- Часовой пояс `Europe/Moscow`, граница дня `dayEndHour` (по умолчанию 0, настройка 0–23).
- Штрафные очки: E/D 1, C/B 2, A/S 4, неполный ежедневный квест 5. Тяжесть: 1–3 light (1 ограничение, до 15:00), 4–8 medium (1, весь день), 9+ heavy (2, весь день).
- Penalty Zone: множитель 0.5 от выдачи до served/failed; failed через 48 ч после `activeUntil` → −20% прогресса внутри уровня каждой характеристики.
- Перенос задания без штрафа — до 12:00 по местному времени в день дедлайна. Больничный — 2 дня на календарный месяц.
- Бонусы: весь ежедневный квест закрыт → +3 DIS; серия привычки кратна 7 → +5 в её характеристику; испытание навыка → `5 × новый уровень`.
- Дизайн: только тёмная тема; анимируются только `transform`/`opacity`; при `prefers-reduced-motion: reduce` — упрощённые версии. Звук по умолчанию выключен.

## Review Focus

1. **Несколько пропущенных дней подряд** (не открывал приложение 3 дня): каждый день подводится отдельно ровно один раз, штрафы назначаются по правилу «не раньше сегодня», ничего не дублируется при повторном открытии / двух вкладках. Тест — Task 8.
2. **Снятие и повторная отметка** задания, привычки, последней привычки дня (с бонусом) и привычки на 7-й день серии: тоталы возвращаются точно к исходным, бонус и серия откатываются вместе с отметкой. Тесты — Task 6, Task 7.
3. **Смена `dayEndHour` с 0 на 22** при уже подведённых днях: ни один день не подводится дважды и не пропускается. Тест — Task 5 / Task 8.
4. **Пустые наборы:** нет привычек, нет включённых ограничений, нет навыков, пустой банк — без падений и без штрафа за пустой квест. Тесты — Task 7, Task 8, e2e Task 14.
5. **Конфликт записи с другого устройства** (телефон и ПК открыты одновременно): локальное состояние обновляется из `onSnapshot`, подведение дня защищено от двойного выполнения. Тест — Task 12 (memoryRepo с двумя engine на одном хранилище).

---

## Файловая структура

```
package.json  tsconfig.json  .gitignore
scripts/build.mjs        # esbuild: src/main.tsx → dist/, копирует public/, прототип → dist-proto/
scripts/serve.mjs        # статический сервер dist/ для e2e
scripts/fonts.py         # скачанные TTF → woff (подмножество latin+cyrillic)
vendor/types/{react,react-dom,csstype}/
public/index.html  public/manifest.webmanifest  public/sw.js  public/icons/  public/fonts/
.github/workflows/pages.yml
docs/setup.md            # инструкция владельцу
src/
  main.tsx               # выбирает demo/реальный режим, монтирует App
  probe.tsx              # страница проверки входа (Task 2)
  game/   types.ts ranks.ts levels.ts time.ts awards.ts daily.ts evaluate.ts recurring.ts skills.ts classifier.ts state.ts actions.ts defaults.ts
  data/   repo.ts memoryRepo.ts firestoreRepo.ts
  firebase/ sdk.ts config.ts
  calendar/ gis.ts api.ts sync.ts
  app/    engine.ts store.ts demo.ts
  ui/
    theme/ tokens.css base.css
    fx/    systemWindow.tsx eventQueue.ts flyToStat.ts counter.tsx progressBar.tsx levelUpScene.tsx penaltyScene.tsx particles.ts sound.ts haptics.ts motion.ts
    shell/ App.tsx Nav.tsx router.ts LoginScreen.tsx
    components/ TaskRow.tsx QuickAdd.tsx StatChip.tsx RankPicker.tsx TaskEditor.tsx Sheet.tsx PenaltyBanner.tsx
    screens/ Status.tsx Today.tsx Tasks.tsx Skills.tsx More.tsx Bank.tsx Journal.tsx Settings.tsx
prototype/ main.tsx      # дизайн-прототип на модулях ui/fx
tests/ game/*.test.ts  app/*.test.ts  calendar/*.test.ts  e2e/*.test.mjs
```

---

### Task 0: Подготовка у владельца (делает Никита, параллельно с Task 1)

**Files:** Create: `docs/setup.md`

- [ ] **Step 1:** Написать `docs/setup.md` — пошагово со ссылками:
  - A. Firebase: console.firebase.google.com → Создать проект (Analytics выкл.) → Добавить Web-приложение → скопировать `firebaseConfig` (apiKey, authDomain, projectId, appId) и прислать мне → Authentication → Sign-in method → Google вкл. → Firestore Database → Создать (production, регион `eur3`) → вкладка Rules → вставить правила (ниже) → Опубликовать.
  - B. GitHub: создать пустой публичный репозиторий `the-system`; в claude.ai → Settings → Connectors подключить GitHub; прислать `логин/the-system`.
  - C. (позже, перед Task 20) Google Cloud Console того же проекта: включить Google Calendar API; OAuth consent screen → External, Testing → добавить свой email в Test users; Credentials → Web client (auto created by Google Service) → Authorized JavaScript origins + `https://<логин>.github.io`; прислать Client ID.
  - Правила Firestore:
    ```
    rules_version = '2';
    service cloud.firestore { match /databases/{db}/documents {
      match /users/{uid}/{document=**} { allow read, write: if request.auth != null && request.auth.uid == uid; }
    } }
    ```
- [ ] **Step 2:** Отправить файл владельцу, коммит `docs: owner setup guide`.

---

### Task 1: Тулчейн, каркас, PWA, публикация

**Files:** Create: `package.json`, `tsconfig.json`, `.gitignore`, `scripts/build.mjs`, `scripts/serve.mjs`, `vendor/types/**`, `public/index.html`, `public/manifest.webmanifest`, `public/sw.js`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `.github/workflows/pages.yml`, `src/main.tsx`, `tests/game/smoke.test.ts`

**Interfaces:**
- Produces: `npm run build` → `dist/` (index.html, app.js, app.css, manifest, sw.js, icons, fonts); `npm test` → `node --import tsx --test tests/**/*.test.ts`; `npm run e2e` → `node --test tests/e2e/`; `npm run typecheck` → `tsc --noEmit`; `npm run proto` → `dist-proto/index.html` (один файл, всё инлайн).
- Produces: `scripts/serve.mjs` экспортирует `startServer(dir: string): Promise<{url: string; close(): Promise<void>}>`.

- [ ] **Step 1:** Завендорить типы: sparse-clone DefinitelyTyped (`types/react`, `types/react-dom`) и `frenic/csstype` (`index.d.ts`) в `vendor/types/`; `tsconfig`: `strict`, `jsx: react-jsx`, `typeRoots: ["vendor/types", "/opt/npm-tools/node_modules/@types"]`, `paths` для `react`, `react-dom`.
- [ ] **Step 2:** Тест `tests/game/smoke.test.ts`: `assert.equal(1+1, 2)`; запустить `npm test` → PASS (проверка раннера).
- [ ] **Step 3:** `scripts/build.mjs`: esbuild `bundle`, `format: 'esm'`, `nodePaths: ['/opt/npm-tools/node_modules']`, `external: ['https://*']`, `minify` в prod, `define process.env.NODE_ENV`; копирует `public/` в `dist/`; добавляет в `sw.js` версию сборки (кэш app-shell, network-first для html).
- [ ] **Step 4:** `public/index.html` (lang=ru, `theme-color #05070d`, `viewport-fit=cover`, ссылки на manifest, регистрация sw), manifest (`name "THE SYSTEM"`, `display standalone`, `background_color #05070d`, иконки). Иконки — сгенерировать через sharp (глиф «S» в рамке со срезанными углами, акцентный синий на тёмном).
- [ ] **Step 5:** `pages.yml`: на push в `main` — `actions/upload-pages-artifact` с `dist/` (dist коммитится; сборка делается здесь) → `actions/deploy-pages`.
- [ ] **Step 6:** `npm run build && npm run typecheck` → без ошибок, `dist/index.html` есть.
- [ ] **Step 7:** Коммит `chore: toolchain, PWA shell, pages workflow`.

---

### Task 2: Проверка входа через Google (ГЕЙТ владельца)

**Files:** Create: `src/firebase/sdk.ts`, `src/firebase/config.ts`, `src/probe.tsx`, `tests/e2e/probe.test.mjs`; Modify: `scripts/build.mjs` (вторая точка входа `probe.html`)

**Interfaces:**
- Produces: `loadFirebase(): Promise<FirebaseApi>` где `FirebaseApi = { auth, db, signIn(): Promise<User>, signOut(): Promise<void>, onUser(cb: (u: User|null) => void): () => void, fs: { doc, collection, getDoc, setDoc, onSnapshot, writeBatch, query, where, orderBy, limit, serverTimestamp } }` — тонкая типизированная обёртка над `firebase-app.js`, `firebase-auth.js`, `firebase-firestore.js` 12.16.0. Ошибка загрузки → `FirebaseLoadError`.
- Produces: `firebaseConfig` из `config.ts` (значения от владельца; файл в git — это публичные ключи веб-клиента).

- [ ] **Step 1:** e2e-тест: Playwright открывает `probe.html` при заблокированном `www.gstatic.com` → видна надпись `SYSTEM OFFLINE` и текст «Нет связи с сервером», нет необработанных ошибок в консоли.
- [ ] **Step 2:** Запустить → FAIL.
- [ ] **Step 3:** `sdk.ts` + `probe.tsx`: кнопка «Войти через Google» (`signInWithPopup`, `browserLocalPersistence`), после входа — `setDoc(users/{uid}/meta/probe, {at: serverTimestamp(), ua})`, затем `getDoc` → `SYSTEM ONLINE · <имя>`; кнопка «Выйти».
- [ ] **Step 4:** e2e → PASS; build.
- [ ] **Step 5:** Коммит, push в репозиторий владельца (через подключение GitHub) → GitHub Pages.
- [ ] **Step 6 (ГЕЙТ):** владелец добавляет `<логин>.github.io` в Firebase → Authentication → Settings → Authorized domains и проверяет вход: браузер ПК, браузер телефона, установленное на экран PWA. Если вход не работает в каком-то из трёх вариантов — фиксируем симптом и решаем до Task 4 (кандидаты: `signInWithRedirect` вместо popup; вход в обычном браузере с последующей установкой PWA). Без зелёного результата дальше не идём.

---

### Task 3: Дизайн-система, эффекты и прототип (ГЕЙТ владельца)

**Files:** Create: `scripts/fonts.py`, `public/fonts/*`, `src/ui/theme/tokens.css`, `src/ui/theme/base.css`, `src/ui/fx/*`, `prototype/main.tsx`; Test: `tests/e2e/fx.test.mjs`

**Interfaces:**
- Produces (`src/ui/fx/`):
  - `motion.ts`: `prefersReducedMotion(): boolean`, `animate(el, keyframes, opts): Promise<void>` (обёртка WAAPI, при reduced — длительность ×0.3, без тряски/частиц).
  - `eventQueue.ts`: `type UiEvent = GameEvent` (из Task 4 `types.ts`); `createEventQueue(): { push(e: UiEvent[]): void; subscribe(cb): () => void }` — события показываются по одному, LEVEL_UP/RANK_UP/PENALTY — полноэкранные сцены, остальные — системные окна.
  - `<SystemWindow title="QUEST COMPLETED" lines={["+30 XP", "+3 STR"]} tone="accent"|"danger" onDone />` — линия → раскрытие → печать текста (~18 мс/символ) → 2.2 с → сворачивание.
  - `flyToStat(fromEl: Element, stat: StatCode, label: string): Promise<void>` — летит к элементу `[data-stat-anchor="STR"]`.
  - `<Counter value={n} />` — прокрутка цифр (моно-шрифт), `<ProgressBar value={0..1} />` — заполнение с бликом, переполнение → вспышка.
  - `<LevelUpScene from to rank? />`, `<PenaltyScene penalty />`, `particles.ts`: `startBackground(canvas): () => void` (≤ 60 частиц, пауза при `document.hidden`).
  - `sound.ts`: `playSfx('complete'|'levelup'|'penalty')` — синтез Web Audio, глушится настройкой; `haptics.ts`: `buzz(pattern)` → `navigator.vibrate` если есть.
- Produces (`tokens.css`): `--bg #05070d`, `--panel rgba(12,22,44,.55)`, `--line rgba(120,190,255,.22)`, `--accent #4cc3ff`, `--accent-glow rgba(76,195,255,.45)`, `--text #e6f1ff`, `--muted #7a8ba6`, `--danger #ff3b4e`, ранги `--rank-E #8b93a1 --rank-D #3fd48a --rank-C #4cc3ff --rank-B #a77bff --rank-A #ff9b3d --rank-S #ffd34d`; `--font-sys`, `--font-head`, `--font-body`, `--font-num`; панель — `clip-path` со срезанными углами 10px.

- [ ] **Step 1:** `scripts/fonts.py`: sparse-clone `google/fonts` (`ofl/oxanium`, `ofl/chakrapetch`, `ofl/tektur`, `ofl/unbounded`, `ofl/onest`, `ofl/manrope`, `ofl/jetbrainsmono`) → fontTools subset (Basic Latin, Latin-1, Cyrillic U+0400–04FF, `№ – — « » … →`) → `woff` в `public/fonts/`; `@font-face` с `font-display: swap`.
- [ ] **Step 2:** e2e-тест `fx.test.mjs` на прототипе: клик «Выполнить задание» → появляется `[role=status]` с текстом `QUEST COMPLETED`, затем исчезает ≤ 4 с; «Level up» → элемент `.scene-levelup` содержит `LEVEL UP`; с `reducedMotion: 'reduce'` — те же тексты появляются; консоль без ошибок.
- [ ] **Step 3:** Запустить → FAIL.
- [ ] **Step 4:** Реализовать `tokens.css`, `base.css`, все модули `fx/`, `prototype/main.tsx`: переключатель 3 вариантов шрифтов (A: Oxanium + Tektur + Onest; B: Chakra Petch + Unbounded + Manrope; C: Oxanium + Unbounded + Onest; цифры везде JetBrains Mono), демо-карточка статуса, строка задания, кнопки: выполнить, level up, rank up, penalty, навык открыт, звук вкл/выкл.
- [ ] **Step 5:** e2e → PASS. Скриншоты 390×844 и 1440×900 (deviceScaleFactor 1) — самопроверка: контраст текста, ничего не вылезает за экран.
- [ ] **Step 6:** `npm run proto` → один HTML (шрифты base64) → опубликовать как Artifact, чтобы владелец открыл с телефона.
- [ ] **Step 7 (ГЕЙТ):** владелец выбирает вариант шрифтов и правки. Внести, зафиксировать выбор в `tokens.css`, удалить неиспользуемые шрифты. Коммит `feat(ui): design tokens, fx, prototype`.

---

### Task 4: Типы и формулы

**Files:** Create: `src/game/types.ts`, `src/game/ranks.ts`, `src/game/levels.ts`; Test: `tests/game/levels.test.ts`

**Interfaces — Produces (`types.ts`, используются во всех следующих задачах):**
```ts
export type StatCode = 'STR'|'VIT'|'INT'|'MST'|'DIS'|'CHA';
export const STATS: readonly StatCode[];
export type Rank = 'E'|'D'|'C'|'B'|'A'|'S';
export type DayKey = string;                       // 'YYYY-MM-DD'
export interface ChecklistItem { id: string; text: string; done: boolean }
export interface Task { id: string; kind: 'task'|'quest'; questType?: 'main'|'side'; title: string; stat: StatCode; rank: Rank; points: number;
  dueDay?: DayKey; dueTime?: string; status: 'open'|'done'|'failed'|'archived'; checklist?: ChecklistItem[]; victory?: string; note?: string;
  skillId?: string; recurringId?: string; ideaId?: string; source: 'manual'|'calendar'; calendarId?: string; calendarEventId?: string;
  penalize: boolean; createdAt: number; completedAt?: number; ledgerId?: string }
export interface Habit { id: string; title: string; stat: StatCode; points: number; active: boolean; order: number }
export interface DayRecord { day: DayKey; habitsDone: string[]; sick: boolean; evaluated: boolean; habitLedger: Record<string,string>; bonusLedgerId?: string; streakLedger: Record<string,string> }
export type LedgerKind = 'task'|'habit'|'daily_bonus'|'streak'|'skill'|'penalty_loss'|'revert';
export interface LedgerEntry { id: string; at: number; day: DayKey; kind: LedgerKind; stat: StatCode; points: number; xp: number; multiplier: 1|0.5; refId?: string; revertsId?: string }
export interface Totals { xp: number; stats: Record<StatCode, number> }
export interface Restriction { id: string; text: string; enabled: boolean }
export type Severity = 'light'|'medium'|'heavy';
export interface Penalty { id: string; forDay: DayKey; targetDay: DayKey; issuedAt: number; severity: Severity; score: number;
  reasons: { refId: string; title: string; points: number }[]; restrictions: string[]; activeUntil: number; status: 'active'|'served'|'failed'; resolvedAt?: number }
export interface SkillLevel { title: string }
export interface Skill { id: string; name: string; stat: StatCode; unlockLevel: number; levels: SkillLevel[]; currentLevel: number; unlockedNotified: boolean }
export interface RecurringTemplate { id: string; title: string; stat: StatCode; rank: Rank; points: number; every: 'week'|'2weeks'|'month'; weekday?: number; monthDay?: number; anchorDay: DayKey; activeTaskId?: string; lastDueDay?: DayKey }
export interface Idea { id: string; tags: string[]; title: string; hours?: number; note?: string; status: 'bank'|'taken'|'done'|'archived' }
export interface CalendarSettings { connected: boolean; questsCalendarId?: string; imports: { calendarId: string; name: string; penalize: boolean }[]; lastSyncAt?: number }
export interface Settings { timezone: string; dayEndHour: number; restrictions: Restriction[]; sickDaysPerMonth: number; sound: boolean; calendar: CalendarSettings }
export interface Profile { name: string; createdAt: number; firstDay: DayKey; lastEvaluatedDay?: DayKey; totals: Totals; settings: Settings }
export type Learned = Record<string, Partial<Record<StatCode, number>>>;
export type GameEvent =
  | { type: 'QUEST_COMPLETED'; title: string; stat: StatCode; points: number; xp: number; anchorId?: string }
  | { type: 'LEVEL_UP'; from: number; to: number } | { type: 'RANK_UP'; from: Rank; to: Rank }
  | { type: 'STAT_LEVEL_UP'; stat: StatCode; from: number; to: number } | { type: 'DAILY_QUEST_COMPLETED' }
  | { type: 'STREAK'; habitTitle: string; days: number; stat: StatCode; points: number }
  | { type: 'PENALTY'; penaltyId: string } | { type: 'PENALTY_FAILED'; penaltyId: string }
  | { type: 'NEW_SKILL_AVAILABLE'; skillId: string } | { type: 'SKILL_LEVEL_UP'; skillId: string; level: number };
```
**Produces (`ranks.ts`, `levels.ts`):** `RANK_POINTS`, `penaltyWeight(rank: Rank): 1|2|4`, `xpToNext(level): number`, `totalXpForLevel(L): number`, `levelFromXp(xp): number`, `hunterRank(level): Rank`, `pointsForStatLevel(L): number`, `statLevel(points): number`, `statProgress(points): { level: number; into: number; needed: number; ratio: number }`, `playerProgress(xp)` — тот же формат.

- [ ] **Step 1:** Тесты (точные значения): `levelFromXp`: 0→1, 99→1, 100→2, 249→2, 250→3, 2700→10, 10450→20, 31450→35, 63700→50, 142450→75; `hunterRank`: 9→E, 10→D, 19→D, 20→C, 34→C, 35→B, 50→A, 74→A, 75→S; `statLevel`: 0→1, 1→1, 2→2, 4→2, 5→3, 9→4, 53→9, 54→10; `statProgress(7)` → `{level 3, into 2, needed 4}`; `penaltyWeight`: E,D→1; C,B→2; A,S→4.
- [ ] **Step 2:** Запустить → FAIL. **Step 3:** Реализовать. **Step 4:** PASS. **Step 5:** Коммит `feat(game): types and formulas`.

---

### Task 5: Время и игровые дни

**Files:** Create: `src/game/time.ts`; Test: `tests/game/time.test.ts`

**Interfaces — Produces:** `dayKeyOf(at: number, tz: string, dayEndHour: number): DayKey`; `dayStart(day, tz, h): number`; `dayEnd(day, tz, h): number`; `localTime(day: DayKey, hhmm: string, tz): number` (календарная дата `day` в часовом поясе); `addDays(day, n): DayKey`; `daysBetween(a, b): DayKey[]` (включая a, не включая b); `monthOf(day): string`; `weekdayOf(day): 1..7` (Пн=1).
Правило: `h = 0` → день D = [D 00:00, D+1 00:00); `h > 0` → день D = [D−1 h:00, D h:00). Часовой пояс через `Intl.DateTimeFormat(...).formatToParts`.

- [ ] **Step 1:** Тесты: `dayKeyOf(Date.UTC(2026,10,3,20,59), 'Europe/Moscow', 0)` = `2026-11-03`; `...21,0` → `2026-11-04`; с `h=22`: `Date.UTC(2026,10,3,18,59)` → `2026-11-03`, `...19,0` → `2026-11-04`; `dayEnd('2026-11-03','Europe/Moscow',0)` = `Date.UTC(2026,10,3,21)`; `localTime('2026-11-04','12:00','Europe/Moscow')` = `Date.UTC(2026,10,4,9)`; `daysBetween('2026-10-30','2026-11-02')` = `['2026-10-30','2026-10-31','2026-11-01']`; `weekdayOf('2026-11-02')` = 1.
- [ ] **Step 2–4:** FAIL → реализовать → PASS. **Step 5:** Коммит.

---

### Task 6: Состояние, изменения и начисления

**Files:** Create: `src/game/state.ts`, `src/game/awards.ts`; Test: `tests/game/awards.test.ts`

**Interfaces — Produces:**
- `state.ts`: `interface GameState { profile: Profile; tasks: Record<string,Task>; habits: Record<string,Habit>; days: Record<DayKey,DayRecord>; recurring: Record<string,RecurringTemplate>; ideas: Record<string,Idea>; skills: Record<string,Skill>; penalties: Record<string,Penalty>; ledger: Record<string,LedgerEntry>; learned: Learned }`;
  `type Collection = Exclude<keyof GameState,'profile'|'learned'>`; `interface Changes { profile?: Profile; learned?: Learned; put: Partial<{[C in Collection]: GameState[C][string][]}>; remove: Partial<Record<Collection,string[]>> }` (`profile`/`learned` заменяются целиком);
  `interface Ctx { now: number; newId(): string; rng(): number }`; `interface Outcome { changes: Changes; events: GameEvent[] }`;
  `applyChanges(s: GameState, c: Changes): GameState` (иммутабельно); `emptyChanges(): Changes`; `mergeOutcomes(...o: Outcome[]): Outcome`; `isPenaltyZone(s, now): boolean`; `todayKey(s, now): DayKey`.
- `awards.ts`: `award(s, ctx, a: { kind: LedgerKind; stat: StatCode; basePoints: number; refId: string }): { entry: LedgerEntry; totals: Totals; events: GameEvent[] }` (множитель из `isPenaltyZone`; события LEVEL_UP / RANK_UP / STAT_LEVEL_UP по разнице до/после);
  `revert(s, ctx, entryId): { entry: LedgerEntry; totals: Totals }` — запись `kind 'revert'` с противоположными знаками, `revertsId`; без событий;
  `rawEntry(s, ctx, stat, points, xp, kind, refId)` — для `penalty_loss` (множитель 1).

- [ ] **Step 1:** Тесты: C-задание без штрафа → `points 3, xp 30`, `totals.stats.STR` +3; под активным штрафом → `points 1, xp 15`; S под штрафом → `points 6, xp 65`; переход 95→125 XP даёт `LEVEL_UP 1→2`; 2690→2720 даёт и `LEVEL_UP 9→10`, и `RANK_UP E→D`; STR 4→5 очков даёт `STAT_LEVEL_UP STR 2→3`; `revert` возвращает totals ровно к исходным и не создаёт событий; `applyChanges` не мутирует вход.
- [ ] **Step 2–4:** FAIL → реализовать → PASS. **Step 5:** Коммит.

---

### Task 7: Действия с заданиями и ежедневный квест

**Files:** Create: `src/game/actions.ts`, `src/game/daily.ts`, `src/game/defaults.ts`; Test: `tests/game/actions.test.ts`, `tests/game/daily.test.ts`

**Interfaces — Consumes:** Task 4–6. **Produces (`actions.ts`, каждая → `Outcome`):**
`createTask(s, ctx, input: Omit<Task,'id'|'status'|'createdAt'|'source'|'penalize'> & Partial<Pick<Task,'source'|'penalize'|'calendarId'|'calendarEventId'>>)` (по умолчанию `penalize: true`, `source 'manual'`; `points` по умолчанию `RANK_POINTS[rank]`, clamp 1–50);
`updateTask(s, ctx, id, patch)` — если задание `done` и меняются `points`/`stat`: revert старой записи + новая запись без событий уровня-вниз;
`completeTask(s, ctx, id)` → `QUEST_COMPLETED` (+ уровни), статус `done`, `ledgerId`; работает и для `failed`;
`uncompleteTask(s, ctx, id)` → revert, статус `open` (или `failed`, если дедлайн уже подведён);
`deleteTask`, `rescheduleTask(s, ctx, id, newDay)` — бросает `RescheduleLockedError`, если `ctx.now >= localTime(dueDay,'12:00')`;
`canReschedule(s, now, task): boolean`; `toggleChecklistItem`; `createHabit/updateHabit/deleteHabit`.
**Produces (`daily.ts`):** `toggleHabit(s, ctx, habitId, day: DayKey)` — начисление/откат привычки; если после отметки отмечены все активные привычки → `daily_bonus` +3 DIS + `DAILY_QUEST_COMPLETED`; снятие любой отметки откатывает бонус; `streakLength(s, habitId, day): number` (больничные дни пропускаются, не считаются); длина кратна 7 → `streak` +5 в стат привычки + `STREAK`; снятие откатывает и серию. Отмечать можно только `today` (прошлые дни — только если ещё не подведены).
**Produces (`defaults.ts`):** `DEFAULT_RESTRICTIONS` (9 из спеки, последний `enabled: false`), `STARTER_SKILLS` (8 из спеки с порогами и уровнями), `defaultSettings()`, `newGameState(name, now): GameState` (`firstDay = todayKey`, привычек нет).

- [ ] **Step 1:** Тесты `actions`: create C → points 3; create с points 99 → 50; complete → done + QUEST_COMPLETED + ledger; complete→uncomplete→complete → totals = один раз начислено; updateTask(done, points 3→5) → totals +2 к стату; reschedule в 11:59 МСК дня дедлайна → ок, в 12:00 → `RescheduleLockedError`.
- [ ] **Step 2:** Тесты `daily`: 3 привычки, отметить все → +3 DIS и `DAILY_QUEST_COMPLETED`; снять одну → бонус откатан, totals = сумма двух привычек; 7 дней подряд → на 7-й `STREAK` +5; 6 дней + больничный + 1 день → длина 7, бонус; снять отметку 7-го дня → серия откатана; 0 привычек → `toggleHabit` недоступен, бонуса нет.
- [ ] **Step 3–5:** FAIL → реализовать → PASS. **Step 6:** Коммит.

---

### Task 8: Подведение дня и штрафы

**Files:** Create: `src/game/evaluate.ts`; Test: `tests/game/evaluate.test.ts`

**Interfaces — Consumes:** Task 4–7. **Produces:**
`severityFor(score): Severity|null` (0→null, 1–3 light, 4–8 medium, 9+ heavy);
`scoreDay(s, day): { score: number; reasons: Penalty['reasons']; failedTaskIds: string[] }` — неполный квест (если есть активные привычки) +5; задачи с `dueDay === day`, `status open`: в `failedTaskIds`, вес — только если `penalize`; больничный → score 0 (задачи всё равно `failed`);
`issuePenalty(s, ctx, day, scored): Outcome` — `targetDay = max(day+1, today)`; light: `activeUntil = localTime(targetDay,'15:00')`, если `now >= activeUntil` → `targetDay + 1`; medium/heavy: `activeUntil = dayEnd(targetDay)`; ограничения — 1/1/2 различных из включённых через `ctx.rng` (меньше включённых → сколько есть, 0 → `[]`); событие `PENALTY`;
`evaluatePending(s, ctx): Outcome` — для каждого дня из `daysBetween(lastEvaluatedDay+1 ?? firstDay, today)` по порядку: пропуск, если `days[d].evaluated`; scoreDay → задачи `failed` → штраф → `days[d].evaluated = true`, `lastEvaluatedDay = d`; затем `checkPenalties`;
`checkPenalties(s, ctx): Outcome` — `active` и `now >= activeUntil + 48h` → `failed`, по каждому стату с `into > 0` запись `penalty_loss` = `−floor(into·0.2)` (уровень не меняется), событие `PENALTY_FAILED`;
`servePenalty(s, ctx, id)` — только если `now >= activeUntil`, иначе `PenaltyNotFinishedError`;
`markSick(s, ctx, day)` — только если день не подведён и в месяце < `sickDaysPerMonth`, иначе `SickLimitError`.

- [ ] **Step 1:** Тесты: пустой день (нет привычек, нет задач) → нет штрафа; квест не закрыт → medium (5); две B + одна E → 5 → medium; одна E → light, `activeUntil` = 15:00 следующего дня; S + S + E → 9 → heavy, 2 разных ограничения; больничный → нет штрафа, задача `failed`; задача из календаря с `penalize false` → `failed`, score 0; 3 пропущенных дня → 3 подведения по порядку, повторный `evaluatePending` → пустой Outcome; открыл в 16:00 через 2 дня после light-штрафа → `targetDay = завтра`; все ограничения выключены → штраф с `restrictions []`, Penalty Zone активна; через 48 ч после `activeUntil` → `failed`, STR при 7 очках (into 2) теряет 0 (`floor(0.4)`), при 25 очках (lvl 6, into 5) теряет 1, уровень не падает; `servePenalty` до `activeUntil` → ошибка; третий больничный в месяце → `SickLimitError`; смена `dayEndHour` 0→22 после подведения `2026-11-03` → следующим подводится `2026-11-04`, дубликатов нет.
- [ ] **Step 2–4:** FAIL → реализовать → PASS. **Step 5:** Коммит.

---

### Task 9: Повторяющиеся дела

**Files:** Create: `src/game/recurring.ts`; Test: `tests/game/recurring.test.ts`

**Interfaces — Produces:** `nextOccurrence(t: RecurringTemplate, from: DayKey): DayKey` (первая дата ≥ from; week — по `weekday`; 2weeks — `anchorDay + 14k`; month — `monthDay`, clamp к длине месяца); `generateRecurring(s, ctx): Outcome` — для шаблонов без открытого `activeTaskId` создаёт задание на `nextOccurrence(t, max(today, lastDueDay+1))`; CRUD `createRecurring/updateRecurring/deleteRecurring`.

- [ ] **Step 1:** Тесты: week, weekday 3, from `2026-11-03` (вт) → `2026-11-04`; 2weeks, anchor `2026-11-02`, from `2026-11-10` → `2026-11-16`; month, monthDay 31, from `2026-11-03` → `2026-11-30`; открытое задание есть → новое не создаётся; после выполнения задания на `2026-11-04` следующее — `2026-11-11`.
- [ ] **Step 2–4:** FAIL → реализовать → PASS. **Step 5:** Коммит.

---

### Task 10: Навыки, банк побочек, квесты

**Files:** Create: `src/game/skills.ts`; Modify: `src/game/actions.ts` (идеи); Test: `tests/game/skills.test.ts`

**Interfaces — Produces:** `isUnlocked(s, skill): boolean` (`statLevel(totals.stats[skill.stat]) >= unlockLevel`); `checkSkillUnlocks(s): Outcome` — новые открытые и `!unlockedNotified` → `NEW_SKILL_AVAILABLE`, флаг true; `passTrial(s, ctx, skillId): Outcome` — только если открыт и `currentLevel < levels.length`; `currentLevel+1`, `skill` запись `5 × newLevel`, `SKILL_LEVEL_UP`; `createSkill/updateSkill/deleteSkill`; в `actions.ts`: `createIdea/updateIdea/deleteIdea`, `takeIdea(s, ctx, ideaId, stat, rank): Outcome` → побочный квест `ideaId`, идея `taken`; выполнение квеста с `ideaId` → идея `done`; `createTask` с `questType 'main'` при 3 активных сюжетных → `MainQuestLimitError`; `completeTask` для квеста не требует закрытых шагов.

- [ ] **Step 1:** Тесты: STR 13 очков (lvl 4) → стойка (порог 5) закрыта; +1 очко = 14 (lvl 5) → `checkSkillUnlocks` даёт `NEW_SKILL_AVAILABLE` один раз; `passTrial` на Lv1→ +5 STR, Lv2 → +10; на MAX — ошибка; `takeIdea` → квест side + идея taken; выполнение → идея done; 4-й main → `MainQuestLimitError`.
- [ ] **Step 2–4:** FAIL → реализовать → PASS. **Step 5:** Коммит.

---

### Task 11: Автоопределение характеристики

**Files:** Create: `src/game/classifier.ts`; Test: `tests/game/classifier.test.ts`

**Interfaces — Produces:** `tokenize(title): string[]` (нижний регистр, `ё→е`, только буквы, длина ≥ 3); `DICTIONARY: Record<StatCode, string[]>` — основы из спеки §5, плюс: STR `растяж шаг спорт качал`, VIT `спат душ еда завтрак витамин`, INT `учеб универ пара семинар конспект читат`, MST `код дизайн фриланс`, DIS `магаз оплат готов мусор`, CHA `свидан гост родител`; `suggestStat(title, learned, fallback: StatCode): StatCode` — счёт: выученное `3 × count`, словарь `1` за токен с совпадающим префиксом; ничья → порядок `STATS`; ноль → `fallback`; `learn(learned, title, stat): Learned`.

- [ ] **Step 1:** Тесты: «Лаба по БД» → INT; «Сходить в зал» → STR; «Уборка на кухне» → DIS; «Позвонить маме» → CHA; «Готовка» → DIS; после `learn('Готовка','VIT')` → VIT; «абракадабра» с fallback MST → MST; «Ёлка» не падает.
- [ ] **Step 2–4:** FAIL → реализовать → PASS. **Step 5:** Коммит.

---

### Task 12: Хранилище и движок

**Files:** Create: `src/data/repo.ts`, `src/data/memoryRepo.ts`, `src/data/firestoreRepo.ts`, `src/app/engine.ts`, `src/app/store.ts`, `src/app/demo.ts`; Test: `tests/app/engine.test.ts`

**Interfaces:**
- `repo.ts`: `interface Repo { load(): Promise<GameState|null>; init(state: GameState): Promise<void>; commit(c: Changes): Promise<void>; subscribe(cb: (s: GameState) => void): () => void; claimEvaluation(day: DayKey, token: string): Promise<boolean> }` — `claimEvaluation` атомарно (Firestore `runTransaction` на `meta/evalLock`) защищает подведение от двух вкладок/устройств.
- `firestoreRepo.ts`: `createFirestoreRepo(api: FirebaseApi, uid: string): Repo` — пути `users/{uid}/profile/main`, `users/{uid}/learned/main`, остальное — коллекции по именам `Collection`; `commit` — `writeBatch` (≤ 450 операций, иначе разбивка); `load` — все коллекции, `ledger` и `days` — за последние 120 дней (`where('day','>=', …)`).
- `memoryRepo.ts`: `createMemoryStore(): Store`, `createMemoryRepo(store): Repo` — два repo на одном store видят изменения друг друга (для теста конфликтов).
- `engine.ts`: `createEngine(repo: Repo, opts: { clock(): number; rng(): number; newId(): string }): Engine`; `Engine = { getState(): GameState; subscribe(cb): () => void; events: EventQueue; run(fn: (s, ctx) => Outcome): Promise<void>; boot(name: string): Promise<void> }` — `boot`: load или `newGameState` + init → `claimEvaluation` → `evaluatePending` + `generateRecurring` + `checkSkillUnlocks` → commit; `run` — применяет локально оптимистично, коммитит, при ошибке откатывает и пушит системное окно-ошибку; после каждого `run` — `checkSkillUnlocks`.
- `store.ts`: `useGame(): GameState`, `useEngine(): Engine` (React context + `useSyncExternalStore`).
- `demo.ts`: параметры URL `?demo=1`, `&fresh=1` (пустое состояние), `&penalty=1`, `&now=<ISO>` (фиксированные часы для e2e); `createDemoState(now): GameState` — правдоподобные данные (уровень 12, 4 привычки, 6 заданий, 1 сюжетный квест с чек-листом, 2 навыка открыты, активный medium-штраф опционально через `?penalty=1`).

- [ ] **Step 1:** Тесты: `boot` на пустом repo создаёт профиль, `firstDay` = сегодня; `run(completeTask)` → repo содержит ledger и totals; два engine на одном store, оба `boot` после пропущенного дня → штраф выдан ровно один раз; ошибка `commit` → состояние откатано, в очереди событие ошибки.
- [ ] **Step 2–4:** FAIL → реализовать → PASS (Firestore-реализация тестируется у владельца в Task 13 через demo=0). **Step 5:** Коммит.

---

### Task 13: Оболочка приложения и вход

**Files:** Create: `src/ui/shell/*`, `src/ui/components/Sheet.tsx`, `src/ui/components/PenaltyBanner.tsx`; Modify: `src/main.tsx`; Test: `tests/e2e/shell.test.mjs`

**Interfaces — Consumes:** Task 2 (`loadFirebase`), Task 3 (fx, tokens), Task 12 (engine, store). **Produces:** `router.ts`: `useRoute(): Route`, `navigate(r)`; маршруты по hash: `#/status #/today #/tasks #/skills #/more #/more/bank #/more/journal #/more/settings`; `<App />` рендерит фон-частицы, `Nav` (низ < 900px, слева ≥ 900px; пункты Статус · Сегодня · Задания · Навыки · Ещё), очередь системных окон и сцен из `engine.events`, `PenaltyBanner` при `isPenaltyZone`.
`LoginScreen`: при первом входе (нет профиля) — системное окно `You have acquired the qualifications to be a Player. Will you accept?` + кнопка «Принять» → `engine.boot(displayName)`; иначе — «Войти через Google».

- [ ] **Step 1:** e2e (`?demo=1`, 390×844 и 1440×900): переход по всем 5 пунктам меняет hash и заголовок; `?demo=1&fresh=1` показывает текст `Will you accept?`, «Принять» → экран Статус; горизонтального скролла нет (`scrollWidth <= innerWidth`); консоль без ошибок.
- [ ] **Step 2–4:** FAIL → реализовать → PASS. **Step 5:** Коммит.

---

### Task 14: Экраны «Статус» и «Сегодня»

**Files:** Create: `src/ui/screens/Status.tsx`, `src/ui/screens/Today.tsx`, `src/ui/components/{TaskRow,QuickAdd,StatChip,RankPicker}.tsx`; Test: `tests/e2e/today.test.mjs`

**Interfaces — Consumes:** Task 6–11 actions, Task 3 fx. **Produces:** `<TaskRow task onComplete onOpen />` (чекбокс → `flyToStat` + `completeTask`; повторный тап по выполненному — `uncompleteTask`); `<QuickAdd defaultDay? />` — поле названия, чип `suggestStat` (тап → выбор из 6, выбор ≠ подсказке → `learn`), `RankPicker` E–S (по умолчанию D), дата: Сегодня / Завтра / Без даты / выбрать; Enter — создать.
Статус: имя, `Level`, бейдж ранга охотника, `ProgressBar` XP с `Counter`, 6 строк характеристик (код, название, уровень, прогресс, `data-stat-anchor`), блок ближайших навыков (2 шт.), баннер штрафа.
Сегодня: QuickAdd; Daily Quest (привычки с прогрессом `2/4`, пустое состояние — «Добавь привычки в Настройках»); «Сегодня»; «Просрочено и провалено»; кнопка «Больничный сегодня».

- [ ] **Step 1:** e2e (demo): ввести «Лаба по ИСиТ» → чип показывает `INT`, ранг C, Enter → строка в «Сегодня»; отметить → появляется `QUEST COMPLETED`, на Статусе у INT выросли очки; снять отметку → очки вернулись; отметить все привычки → `DAILY QUEST COMPLETED`; demo без привычек → текст пустого состояния; `?penalty=1` → баннер `PENALTY` виден на обоих экранах.
- [ ] **Step 2–4:** FAIL → реализовать → PASS. **Step 5:** Скриншоты 390 и 1440 — самопроверка вида. **Step 6:** Коммит.

---

### Task 15: Экраны «Задания» и редактор

**Files:** Create: `src/ui/screens/Tasks.tsx`, `src/ui/components/TaskEditor.tsx`; Test: `tests/e2e/tasks.test.mjs`

**Interfaces — Produces:** вкладки Предстоящие (группы по датам) · Без даты · Квесты (сюжетные сверху, ≤3, затем побочные; чек-лист с прогрессом, условие победы) · Выполненные (последние 50). `TaskEditor` в `Sheet`: все поля задания/квеста, перенос (кнопка неактивна с подписью «Перенос закрыт после 12:00», если `!canReschedule`), удаление, навык-привязка, чек-лист (добавить/отметить/удалить шаг).

- [ ] **Step 1:** e2e (demo): создать сюжетный квест с 2 шагами и условием победы → виден во вкладке Квесты с `0/2`; отметить шаг → `1/2`; закрыть квест → `QUEST COMPLETED`; 4-й сюжетный → сообщение «Не больше 3 сюжетных квестов»; демо-часы на 12:30 дня дедлайна → кнопка переноса неактивна.
- [ ] **Step 2–4:** FAIL → реализовать → PASS. **Step 5:** Коммит.

---

### Task 16: Экран «Навыки»

**Files:** Create: `src/ui/screens/Skills.tsx`; Test: `tests/e2e/skills.test.mjs`

**Produces:** список по характеристикам; закрытые — затемнены, «Откроется при STR 5»; открытые — уровни-ступени (пройденные подсвечены, текущее испытание крупно), кнопка «Испытание пройдено» (подтверждение), добавление/редактирование своего навыка (название, стат, порог, список испытаний).

- [ ] **Step 1:** e2e (demo): закрытый навык показывает порог; «Испытание пройдено» → `SKILL LEVEL UP` и следующая ступень активна; создать свой навык с 3 испытаниями → он в списке.
- [ ] **Step 2–4:** FAIL → реализовать → PASS. **Step 5:** Коммит.

---

### Task 17: «Ещё»: Банк, Журнал, Настройки

**Files:** Create: `src/ui/screens/{More,Bank,Journal,Settings}.tsx`; Test: `tests/e2e/more.test.mjs`

**Produces:**
- Банк: повторяющиеся (список, создание: название, стат, ранг, частота, день) и побочки (фильтр-чипы тегов с множественным выбором — показываются идеи со всеми выбранными тегами; «Взять» → `takeIdea`; архив).
- Журнал: итоги недели (Пн–Вс текущей недели) — очки по 6 характеристикам и XP; серии привычек; история записей ledger (дата, тип по-русски, стат, ±очки), штрафы со статусами и кнопкой «Штраф отбыт» (неактивна до `activeUntil`).
- Настройки: имя; привычки ежедневного квеста (добавить/править/порядок/выкл.); ограничения (вкл/выкл, добавить своё; подсказка «Без еды, сна и боли»); конец дня (0–23, подпись «по Москве»); больничный (осталось N в этом месяце); звук вкл/выкл; Google Calendar (Task 20); «Выйти».

- [ ] **Step 1:** e2e (demo): фильтр тегов `дом`+`вкусное` → только подходящие идеи; «Взять» → квест в Заданиях; добавить привычку в Настройках → она в Daily Quest; выключить все ограничения → состояние сохраняется после перезагрузки (memory store переживает reload через `sessionStorage` в demo); журнал показывает записи после выполнения задания.
- [ ] **Step 2–4:** FAIL → реализовать → PASS. **Step 5:** Коммит.

---

### Task 18: Реальный режим и публикация v1 (ГЕЙТ владельца)

**Files:** Modify: `src/main.tsx`, `public/sw.js`

- [ ] **Step 1:** Без `?demo` → `loadFirebase` → `onUser` → `createFirestoreRepo` → engine; ошибка загрузки → экран `SYSTEM OFFLINE` с кнопкой «Повторить».
- [ ] **Step 2:** `npm test && npm run typecheck && npm run e2e && npm run build` → всё зелёное.
- [ ] **Step 3:** Push → Pages. Владелец проверяет на телефоне и ПК: вход, создание задания на одном устройстве появляется на другом, выполнение, LEVEL UP, привычки. Правки — отдельными коммитами.

---

### Task 19: Подведение дня в реальном времени

**Files:** Modify: `src/app/engine.ts`; Test: `tests/app/engine.test.ts`

- [ ] **Step 1:** Тест: engine с часами, переведёнными через границу дня при открытом приложении → `evaluatePending` срабатывает (таймер на `dayEnd(today)` + при `visibilitychange` → visible), штраф выдаётся один раз.
- [ ] **Step 2–4:** FAIL → реализовать → PASS. **Step 5:** Коммит.

---

### Task 20: Google Calendar

**Files:** Create: `src/calendar/gis.ts`, `src/calendar/api.ts`, `src/calendar/sync.ts`; Modify: `src/ui/screens/Settings.tsx`, `src/app/engine.ts`; Test: `tests/calendar/sync.test.ts`

**Interfaces:**
- `gis.ts`: `getCalendarToken(clientId: string, interactive: boolean): Promise<string>` — Google Identity Services token client (`https://accounts.google.com/gsi/client`), scopes `https://www.googleapis.com/auth/calendar.app.created https://www.googleapis.com/auth/calendar.calendarlist.readonly https://www.googleapis.com/auth/calendar.events.readonly`; без interactive — `prompt: ''`, при отказе бросает `NeedsConsentError`.
- `api.ts`: `createCalendarApi(token)` → `listCalendars()`, `createQuestsCalendar(): Promise<string>` (summary `Quests`, timeZone `Europe/Moscow`), `listEvents(calendarId, timeMin, timeMax)`, `insertEvent`, `patchEvent`, `deleteEvent` — `fetch` к `https://www.googleapis.com/calendar/v3/...`.
- `sync.ts` (чистые функции): `planExport(s): ExportOp[]` — `{op:'insert'|'patch'|'delete', taskId, event}`; задание с `dueDay`, без `calendarEventId`, `source 'manual'` → insert (all-day если нет `dueTime`, иначе 60 мин); выполнено → summary с префиксом `✅ `; удалено/перенесено → delete/patch (храним `calendarEventId` в задании, удалённые — в `profile.settings.calendar` как список на удаление); `planImport(s, calendarId, events, penalize, now): Outcome` — события на 14 дней вперёд → `createTask` с `source 'calendar'`, `rank 'D'`, `stat` из `suggestStat`, `penalize`; уже есть по `calendarEventId` → обновить название/дату, если `open`; отменённые события → удалить открытое задание; `runSync(engine, api)` — экспорт, затем импорт по каждому календарю, `lastSyncAt`.
- Engine: `runSync` после `boot` (неинтерактивно; при `NeedsConsentError` — ничего) и по кнопке «Синхронизировать» (интерактивно).
- Настройки: «Подключить Google Calendar» → токен → создать/найти `Quests` → список календарей с чекбоксами «импортировать» и «штрафовать за пропуск».

- [ ] **Step 0:** Владелец выполняет `docs/setup.md` раздел C, присылает Client ID → в `src/firebase/config.ts` `GOOGLE_CLIENT_ID`.
- [ ] **Step 1:** Тесты `sync`: задание на `2026-11-05` без времени → insert all-day `2026-11-05`/`2026-11-06`; с `18:30` → `dateTime` 18:30–19:30 `+03:00`; выполненное с eventId → patch summary `✅ …`; импорт события «Пара: Базы данных» → задание INT, D, `penalize false`; повторный импорт того же события → без дубликата; событие `status 'cancelled'` → открытое задание удалено, выполненное не тронуто.
- [ ] **Step 2–4:** FAIL → реализовать → PASS. **Step 5:** Push; владелец подключает календарь и проверяет оба направления. **Step 6:** Коммит.

---

### Task 21: Финальная проверка

- [ ] **Step 1:** Пройти спецификацию раздел за разделом, отметить каждое требование → задача/тест; недостающее — доделать.
- [ ] **Step 2:** Полный прогон `npm test && npm run typecheck && npm run e2e && npm run build`; Lighthouse-подобная самопроверка: PWA устанавливается, ни одного запроса к недоступным хостам, кроме gstatic/googleapis/accounts.google.com.
- [ ] **Step 3:** Независимое ревью всей ветки свежим агентом (по спеке + плану).
- [ ] **Step 4:** Push, итоговое сообщение владельцу.
