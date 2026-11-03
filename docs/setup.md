# THE SYSTEM — настройка (делаешь один раз)

Всё бесплатно, карта не нужна. Займёт ~15 минут. Разделы A и B нужны сейчас, раздел C — позже, перед подключением календаря.

---

## A. Firebase (вход через Google и база данных)

1. Открой **https://console.firebase.google.com** и войди своим Google-аккаунтом.
2. **Создать проект** (Create a project) → название, например `the-system` → Google Analytics **выключи** → создать.
3. На главной странице проекта нажми значок **`</>`** (Web) — «Добавить приложение».
   - Никнейм: `the-system`. Галочку Firebase Hosting **не ставь**. → Register app.
   - Появится блок кода `const firebaseConfig = { apiKey: ..., authDomain: ..., projectId: ..., ... }`.
     **Скопируй его целиком и пришли мне.** Эти значения не секретные — они и так видны в любом веб-приложении на Firebase.
4. Слева **Build → Authentication** → Get started → вкладка **Sign-in method** → **Google** → включить (Enable) → выбери свою почту в «Project support email» → Save.
5. Слева **Build → Firestore Database** → Create database.
   - Location: **eur3 (Europe)**.
   - Режим: **Start in production mode** → Create.
6. В Firestore открой вкладку **Rules**, удали всё и вставь:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
   → **Publish**. Это значит: твои данные можешь читать и менять только ты.

## B. GitHub (здесь будет жить приложение)

1. Открой **https://github.com/new** (если аккаунта нет — зарегистрируйся).
   - Repository name: `the-system`
   - **Public** (бесплатный хостинг GitHub Pages работает с публичными репозиториями; код будет виден, твои данные — нет, они в Firebase).
   - README и остальное **не добавляй** → Create repository.
2. В новом репозитории: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. В **claude.ai → Settings** найди подключения (Connectors / Integrations) и **подключи GitHub**, дай доступ к репозиторию `the-system`. Так я смогу сам выкладывать новые версии.
4. Пришли мне свой **логин на GitHub** (например `nikita-m`).

После этого адрес приложения будет `https://<логин>.github.io/the-system/`.

5. Вернись в Firebase: **Authentication → Settings → Authorized domains → Add domain** → `<логин>.github.io` → Add. Без этого Google не пустит войти с этого адреса.

---

## C. Google Calendar (позже, я напомню)

1. Открой **https://console.cloud.google.com** и сверху выбери проект с тем же названием, что в Firebase.
2. **APIs & Services → Library** → найди **Google Calendar API** → Enable.
3. **APIs & Services → OAuth consent screen** (или Google Auth Platform):
   - User type: **External**, статус **Testing**.
   - В **Test users** / Audience добавь свою почту.
4. **APIs & Services → Credentials** → открой «Web client (auto created by Google Service)»:
   - **Authorized JavaScript origins** → добавь `https://<логин>.github.io` → Save.
   - Скопируй **Client ID** (заканчивается на `.apps.googleusercontent.com`) и пришли мне.

При подключении календаря Google покажет «Приложение не проверено» — это нормально для личного приложения: нажми «Дополнительно» → «Перейти».

---

## Что прислать мне

- [ ] блок `firebaseConfig` (A.3)
- [ ] логин GitHub и подтверждение, что GitHub подключён в claude.ai (B.3–B.4)
- [ ] позже: Client ID (C.4)
