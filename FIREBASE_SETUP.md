# Полная настройка Firebase для Товарики

Ниже описана настройка актуального Firebase Web SDK для опубликованного сайта:

- сайт: https://andrewokop.github.io/tovarika-inventory/
- репозиторий: https://github.com/andrewokop/tovarika-inventory
- режим приложения: Firebase Authentication + Cloud Firestore + real-time listeners
- тариф: Firebase Spark (free tier; тариф и лимиты контролируются в консоли Firebase)

Официальные материалы Firebase:

- Web setup: https://firebase.google.com/docs/web/setup
- Google Sign-In: https://firebase.google.com/docs/auth/web/google-signin
- Firestore quickstart: https://firebase.google.com/docs/firestore/quickstart
- Firestore Security Rules: https://firebase.google.com/docs/firestore/security/get-started
- App Check for web: https://firebase.google.com/docs/app-check/web/recaptcha-provider
- Firebase pricing: https://firebase.google.com/pricing

## 1. Создайте проект Firebase

1. Откройте https://console.firebase.google.com/.
2. Войдите в нужный Google-аккаунт.
3. Нажмите **Create a Firebase project**.
4. Назовите проект, например `tovarika-inventory`.
5. Google Analytics для личного учета можно отключить. Это не влияет на Authentication и Firestore.
6. Нажмите **Create project**.
7. Важно: не включайте Blaze billing, если хотите оставаться на бесплатном тарифе. Firebase Spark не требует банковской карты, но имеет ограничения по квотам.

## 2. Зарегистрируйте Web-приложение

1. В Firebase Console откройте проект.
2. На странице Project Overview нажмите значок Web `</>` или **Add app → Web**.
3. App nickname: `tovarika-web`.
4. Firebase Hosting включать необязательно: сайт уже публикуется на GitHub Pages.
5. Нажмите **Register app**.
6. Firebase покажет объект конфигурации. Скопируйте только значения:

```text
apiKey
authDomain
projectId
appId
```

Не добавляйте в репозиторий service account JSON и private key. Web config и apiKey сами по себе не являются паролем; безопасность обеспечивается Authentication и Firestore Rules.

## 3. Включите Google Authentication

1. Откройте **Build → Authentication**.
2. Нажмите **Get started**.
3. Откройте вкладку **Sign-in providers**.
4. Выберите **Google**.
5. Включите переключатель **Enable**.
6. Укажите support email.
7. Сохраните.

Затем откройте **Authentication → Settings → Authorized domains** и добавьте:

```text
andrewokop.github.io
```

Для локальной разработки добавьте также:

```text
localhost
127.0.0.1
```

Если Google Sign-In возвращает `auth/unauthorized-domain`, почти всегда не добавлен домен GitHub Pages.

## 4. Создайте Cloud Firestore

1. Откройте **Build → Firestore Database**.
2. Нажмите **Create database**.
3. Выберите **Production mode**.
4. Выберите ближайший регион. Регион базы нельзя легко изменить после создания; для российского пользователя выбирайте доступный европейский регион с приемлемой задержкой.
5. Создайте базу.

## 5. Установите строгие правила Firestore

В репозитории уже есть файл `firestore.rules`. Его содержимое можно скопировать в Firebase Console:

1. Откройте **Firestore Database → Rules**.
2. Полностью замените текущие правила содержимым файла `firestore.rules`.
3. Нажмите **Publish**.

Правила:

- разрешают доступ только вошедшему пользователю к его `users/{uid}`;
- проверяют обязательные поля товара и операции;
- не разрешают удалять проведенные операции;
- не разрешают напрямую менять историю движений;
- запрещают произвольную запись в другие коллекции;
- ограничивают отрицательные остатки и некорректные количества.

Важно: правила не заменяют серверную бизнес-логику. Приложение использует Firestore transaction для атомарного проведения продажи и обновления остатка. Для крупного коммерческого проекта критичные операции стоит переносить в Cloud Functions/Cloud Run.

## 6. Получите Web-конфигурацию

Откройте **Project settings → General → Your apps → Web app → SDK setup and configuration → Config**.

В GitHub нужно сохранить следующие значения как Actions Secrets:

| Secret | Значение |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

## 7. Добавьте Secrets в GitHub

1. Откройте https://github.com/andrewokop/tovarika-inventory.
2. Перейдите в **Settings**.
3. В левом меню откройте **Secrets and variables → Actions**.
4. Откройте вкладку **Secrets**.
5. Нажмите **New repository secret**.
6. Создайте все четыре секрета из таблицы выше.
7. Не добавляйте кавычки вокруг значений.
8. Не добавляйте пробелы и переносы строк.
9. Не помещайте значения в публичный `.env` и не коммитьте их в Git.

Workflow `.github/workflows/deploy.yml` передает эти значения только на шаг production build. Они не выводятся в логи.

## 8. Перезапустите публикацию

После добавления всех Secrets:

1. Откройте GitHub → **Actions**.
2. Выберите **Deploy to GitHub Pages**.
3. Нажмите **Run workflow** или сделайте любой push в `main`.
4. Дождитесь зеленых jobs `build` и `deploy`.
5. Откройте https://andrewokop.github.io/tovarika-inventory/.
6. На стартовом экране нажмите **Продолжить с Google**.
7. Добавьте тестовый товар.
8. Откройте сайт в другом браузере/на телефоне и войдите под тем же Google-аккаунтом.
9. Новый товар должен появиться после real-time snapshot.

## 9. Проверка правил и данных

В Firestore Console после первого входа пользователя ожидается структура:

```text
users
└── <Firebase Auth UID>
    ├── products
    │   └── <productId>
    └── transactions
        └── <transactionId>
```

В документе товара присутствуют `name`, `sku`, `category`, `cost`, `price`, `stock`, `reorderPoint`, `sold`, `schemaVersion`, timestamps.

В документе операции присутствуют `type`, `productId`, `productName`, `date`, `qty`, `amount`, `unitCost`, `unitPrice`, `schemaVersion`, `createdAt`.

Для проверки:

- продажа уменьшает остаток и увеличивает `sold`;
- поступление увеличивает остаток;
- продажа сверх остатка отклоняется;
- операция появляется на всех открытых устройствах;
- прямое удаление движения из клиента запрещено правилами.

## 10. Firebase App Check

App Check снижает злоупотребление публичным Web SDK. Для GitHub Pages:

1. Откройте Firebase Console → **Build → App Check**.
2. Зарегистрируйте Web app.
3. Для production выберите reCAPTCHA Enterprise или reCAPTCHA v3 согласно доступности в вашем регионе.
4. Сначала включите **Monitor**, а не Enforcement.
5. Откройте сайт, выполните несколько операций и убедитесь, что legitimate traffic получает valid App Check tokens.
6. После проверки включите enforcement для Firestore.

Для локальной разработки используйте debug token согласно официальной документации App Check. Не публикуйте debug token.

## 11. Лимиты и защита от расходов

Firebase Spark бесплатен, но имеет квоты. Для контроля:

1. Откройте Firebase Console → **Usage and billing**.
2. Регулярно проверяйте Firestore reads/writes/storage.
3. Не подписывайте клиента на неограниченную историю в больших проектах.
4. Не создавайте операции в цикле при повторной отправке формы.
5. Используйте пагинацию и архивирование старых документов.
6. Если Firebase попросит подключить billing для конкретной функции, сначала проверьте, нужна ли она вам.

Текущая версия приложения подходит для личного/малого каталога. Для большого магазина нужны серверные агрегаты, Cloud Functions и отдельная модель ролей.

## 12. Локальная разработка

```powershell
npm install
npm run dev
```

Для локального режима создайте `.env.local` (не коммитьте):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

Затем перезапустите dev-сервер. При наличии всех четырех значений приложение перейдет в Firebase-режим. Если хотя бы одного значения нет, приложение намеренно использует локальный режим браузера.

## 13. Частые ошибки

### `auth/unauthorized-domain`
Добавьте `andrewokop.github.io` в Authentication → Settings → Authorized domains.

### `Missing or insufficient permissions`
Проверьте, что пользователь вошел, Firestore создан, опубликованы `firestore.rules`, а структура запроса соответствует правилам.

### Пустой каталог после входа
Проверьте, что вы вошли под тем же Google-аккаунтом, и что запросы Firestore не блокируются правилами.

### `failed-precondition` при snapshot
Обычно отсутствует индекс или поле `createdAt` в старых документах. Удалите старые тестовые документы или создайте предложенный Firebase индекс.

### GitHub Pages показывает старую версию
Откройте Actions, убедитесь, что последний workflow зеленый, затем обновите страницу с очисткой кэша (`Ctrl+F5`).

### Нет входа на телефоне
Проверьте домен `andrewokop.github.io`, разрешенные cookies и вход в правильный Google-аккаунт.

## 14. Что не следует делать

- Не публикуйте service account JSON.
- Не добавляйте private key в Vite env.
- Не оставляйте Firestore в режиме `allow read, write: if true`.
- Не публикуйте Firebase secrets в README, issue или скриншоте.
- Не меняйте правила на широкие только для исправления ошибки без последующей валидации.
- Не считайте наличие публичного Web API key защитой данных.
