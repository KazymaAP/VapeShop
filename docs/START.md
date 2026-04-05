# 📱 Запуск проекта VapeShop (Telegram Mini App)

Это полное пошаговое руководство по запуску VapeShop на вашем локальном компьютере и деплою на production.

## 🖥️ Системные требования

Перед началом убедитесь, что у вас установлены:

- **Node.js**: версия 18.0 или выше ([скачать](https://nodejs.org/))
- **npm**: версия 9.0 или выше (обычно идёт с Node.js)
- **PostgreSQL**: версия 14 или выше ([скачать](https://www.postgresql.org/download/)) **ИЛИ** аккаунт на [Neon.tech](https://neon.tech) (облачная БД)
- **Git**: для клонирования репозитория ([скачать](https://git-scm.com/))
- **Аккаунт Telegram**: для создания бота ([BotFather](https://t.me/botfather))

Проверьте установку:
```bash
node --version    # должна быть v18.0.0 или выше
npm --version     # должна быть 9.0.0 или выше
git --version     # должна быть 2.0 или выше
```

---

## 📥 Шаг 1: Клонирование репозитория

Откройте терминал/командную строку и выполните:

```bash
# Клонируем репозиторий
git clone https://github.com/KazymaAP/VapeShop.git
cd VapeShop

# Проверяем, что всё скопировалось
ls -la
# Должны увидеть: package.json, tsconfig.json, next.config.js, и другие файлы
```

---

## 📦 Шаг 2: Установка зависимостей

```bash
npm install
# Это установит все зависимости (Next.js, React, TypeScript, Tailwind CSS и т.д.)
# Займёт 2-5 минут первый раз
```

Если получите ошибку с уязвимостями:
```bash
npm audit fix --force
```

---

## 🗄️ Шаг 3: Настройка базы данных

Выберите один из двух вариантов:

### Вариант A: Локальная PostgreSQL (для разработки)

#### На Windows:
1. Установите [PostgreSQL](https://www.postgresql.org/download/windows/)
2. Откройте PostgreSQL командную строку (pgAdmin или psql)
3. Создайте базу данных:
```sql
CREATE DATABASE vapeshop;
CREATE USER vapeshop_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE vapeshop TO vapeshop_user;
\c vapeshop
```

#### На macOS/Linux:
```bash
# Если PostgreSQL ещё не запущена
brew install postgresql
brew services start postgresql

# Создание БД
psql postgres
CREATE DATABASE vapeshop;
CREATE USER vapeshop_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE vapeshop TO vapeshop_user;
\c vapeshop
```

4. Примените миграции БД:
```bash
# Из папки VapeShop
psql -U vapeshop_user -d vapeshop -f db/migrations/001_initial_schema.sql
# Если есть другие миграции:
# psql -U vapeshop_user -d vapeshop -f db/migrations/002_*.sql
```

### Вариант B: Облачная Neon.tech (рекомендуется для production)

1. Перейдите на [Neon.tech](https://neon.tech) и создайте аккаунт
2. Создайте новый проект
3. Скопируйте Connection String (выглядит как: `postgresql://user:password@host/dbname`)
4. Сохраните его где-нибудь безопасно (понадобится для .env)

---

## 🔐 Шаг 4: Переменные окружения

1. Скопируйте файл примера:
```bash
cp .env.example .env.local
```

2. Откройте `.env.local` в текстовом редакторе и заполните значения:

```env
# ========== БД ==========
# Если используете локальную PostgreSQL:
DATABASE_URL=postgresql://vapeshop_user:your_secure_password_here@localhost:5432/vapeshop

# Если используете Neon.tech:
# DATABASE_URL=postgresql://user:password@your-neon-host.neon.tech/vapeshop

# ========== Telegram ==========
TELEGRAM_BOT_TOKEN=your_bot_token_here_from_botfather
TELEGRAM_WEBHOOK_URL=http://localhost:3000/api/bot

# ========== Admins ==========
# Список Telegram ID админов (через запятую)
ADMIN_TELEGRAM_IDS=123456789,987654321
MANAGER_TELEGRAM_IDS=111111111,222222222

# ========== Другое ==========
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000

# ========== Sentry (опционально, для отслеживания ошибок) ==========
# SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Как получить TELEGRAM_BOT_TOKEN:

1. Откройте Telegram и найдите [@BotFather](https://t.me/botfather)
2. Отправьте команду: `/newbot`
3. Следуйте инструкциям:
   - Введите имя для бота (например, "MyVapeShop")
   - Введите username для бота (например, "my_vapeshop_bot")
4. BotFather отправит вам токен — скопируйте его в `TELEGRAM_BOT_TOKEN`

---

## 🚀 Шаг 5: Запуск в режиме разработки

```bash
npm run dev
```

Откройте браузер: **http://localhost:3000**

Вы должны увидеть главную страницу VapeShop.

### Чтобы протестировать Telegram Mini App:

1. В Telegram найдите вашего бота (@your_bot_username)
2. Отправьте команду: `/start`
3. Нажмите кнопку "Открыть приложение"
4. Вы попадёте в Mini App

### Полезные команды для разработки:

```bash
npm run dev          # Запустить dev сервер
npm run lint         # Проверить код на ошибки
npm run build        # Собрать production версию
npm start            # Запустить production версию
```

---

## 🏗️ Шаг 6: Сборка для Production

```bash
# Собираем оптимизированный бандл
npm run build

# Если нет ошибок - запускаем production сервер
npm start
```

Вы должны увидеть:
```
> vape-shop-mini-app@1.0.0 start
> next start
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

---

## 🌐 Шаг 7: Деплой на Vercel (Production)

Vercel - это платформа для хостинга Next.js приложений. Она бесплатна и супер быстра.

### Способ 1: Через веб-интерфейс (проще)

1. Перейдите на [vercel.com](https://vercel.com)
2. Нажмите "Sign Up" и создайте аккаунт через GitHub
3. Нажмите "Import Project"
4. Введите URL вашего GitHub репозитория
5. Vercel автоматически обнаружит Next.js и настроит всё
6. Добавьте переменные окружения:
   - Перейдите в "Settings" → "Environment Variables"
   - Добавьте все переменные из `.env.local` (кроме `NEXT_PUBLIC_*` - они видны в браузере)
7. Нажмите "Deploy"

### Способ 2: Через Vercel CLI (продвинутый)

```bash
# Установляем Vercel CLI
npm install -g vercel

# Входим в аккаунт Vercel
vercel login

# Деплоим на production
vercel --prod
```

### После деплоя:

1. Vercel выдаст вам URL (например, `https://vapeshop.vercel.app`)
2. Обновите Telegram вебхук:

```bash
# Где YOUR_URL = https://vapeshop.vercel.app, YOUR_TOKEN = ваш токен от BotFather
curl -X POST "https://api.telegram.org/botYOUR_TOKEN/setWebhook?url=YOUR_URL/api/bot"

# Пример:
# curl -X POST "https://api.telegram.org/bot123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabc/setWebhook?url=https://vapeshop.vercel.app/api/bot"
```

3. Проверьте, что вебхук установлен:
```bash
curl -X GET "https://api.telegram.org/botYOUR_TOKEN/getWebhookInfo"
```

---

## ✅ Проверка работоспособности

После запуска (dev или production):

1. **Откройте приложение в браузере**: http://localhost:3000 (dev) или ваш Vercel URL (production)
2. **Проверьте главную страницу**: вы должны увидеть список товаров
3. **Откройте в Telegram**: найдите вашего бота и нажмите кнопку "Открыть приложение"
4. **Добавьте товар в корзину**: нажмите на товар, затем "Добавить в корзину"
5. **Оформите заказ**: перейдите в корзину и нажмите "Оформить"

Если всё работает - поздравляем! 🎉

---

## 🐛 Устранение типичных проблем

### "Ошибка: не могу подключиться к БД"

**Решение:**
```bash
# 1. Проверьте, что PostgreSQL запущена
# На Windows: откройте Services и найдите PostgreSQL
# На macOS/Linux: brew services list

# 2. Проверьте DATABASE_URL в .env.local
# Попробуйте подключиться напрямую:
psql -h localhost -U vapeshop_user -d vapeshop
# Если работает - введите: \q

# 3. Если БД на Neon:
# Убедитесь, что IP адрес разрешён в Neon настройках
```

### "Вебхук не работает"

**Решение:**
```bash
# 1. Проверьте, что /api/bot доступен:
curl -X GET http://localhost:3000/api/bot
# Должна быть ошибка 405 (Method Not Allowed) - это нормально

# 2. Проверьте вебхук в Telegram:
curl -X GET "https://api.telegram.org/botYOUR_TOKEN/getWebhookInfo"
# Должны увидеть ваш URL и статус "enabled": true

# 3. Если вебхук не устанавливается:
# Убедитесь, что TELEGRAM_BOT_TOKEN правильный
# Проверьте доступность вашего URL из интернета (не локальный IP)
```

### "Не приходят уведомления от бота"

**Решение:**
```bash
# 1. Проверьте, что бот инициализирован:
# В logs должно быть: "Bot instance set in notifications"

# 2. Проверьте TELEGRAM_BOT_TOKEN ещё раз

# 3. Убедитесь, что команда /start была выполнена в боте
```

### "Ошибка: port 3000 already in use"

**Решение:**
```bash
# На Windows (PowerShell):
Get-Process -Name node | Stop-Process -Force

# На macOS/Linux:
lsof -ti:3000 | xargs kill -9

# Или используйте другой порт:
PORT=3001 npm run dev
```

### "npm install не работает"

**Решение:**
```bash
# Очистите кеш npm
npm cache clean --force

# Удалите node_modules и package-lock.json
rm -rf node_modules package-lock.json

# Переустановите
npm install
```

---

## 📚 Полезные ссылки

- **Next.js документация**: https://nextjs.org/docs
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **Telegram Mini Apps**: https://core.telegram.org/bots/webapps
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Vercel**: https://vercel.com/docs

---

## 🆘 Если что-то не работает

1. **Прочитайте console.log**: иногда ошибка там
2. **Проверьте .env.local**: все ли значения введены?
3. **Перезагрузитесь**: `npm run dev` иногда помогает
4. **Очистите кеш**: `npm cache clean --force && rm -rf .next`
5. **Откройте Issue**: в репозитории на GitHub

---

## 🎓 Что дальше?

После успешного запуска:

1. Ознакомьтесь с архитектурой проекта в `docs/ARCHITECTURE.md`
2. Прочитайте API документацию в `docs/API_REFERENCE.md`
3. Изучите схему БД в `docs/SCHEMA.md`
4. Начните разработку своих фич!

---

**Удачи в разработке! 🚀**

Если у вас есть вопросы — открывайте Issues на GitHub или свяжитесь с мейнтейнерами.
