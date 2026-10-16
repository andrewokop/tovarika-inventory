# Настройка бесплатной синхронизации Firebase

Приложение поддерживает Firebase Spark (бесплатный тариф): Google-вход, Firestore и real-time подписки.

1. Откройте https://console.firebase.google.com/ и создайте проект без включения биллинга.
2. Включите Authentication → Sign-in method → Google.
3. Создайте Firestore Database в production mode.
4. В Firebase Console → Project settings → Your apps добавьте Web app и скопируйте значения `apiKey`, `authDomain`, `projectId`, `appId`.
5. В Firestore Rules вставьте содержимое `firestore.rules`.
6. В GitHub репозитории откройте Settings → Secrets and variables → Actions и создайте secrets:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
7. В Firebase Authentication → Settings → Authorized domains добавьте `andrewokop.github.io`.
8. Запустите workflow Deploy to GitHub Pages повторно.

Ключи Firebase Web SDK не являются паролями. Защита данных выполняется правилами Firestore: каждый пользователь читает и изменяет только свою подколлекцию `users/{uid}`.

Если secrets ещё не добавлены, сайт намеренно запускается в локальном режиме без аккаунта и хранит данные только в браузере.
