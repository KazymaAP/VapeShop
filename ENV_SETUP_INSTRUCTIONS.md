# 📋 Полная инструкция по настройке переменных окружения (.env)

## 🎯 Краткое описание

Файл `.env.local` хранит все чувствительные данные вашего приложения:

- API ключи и токены
- Строки подключения к базе данных
- Секреты для аутентификации

**⚠️ ВАЖНО: Никогда не коммитьте `.env.local` в Git!**

---

## 🚀 Быстрый старт (для локальной разработки)

1. Создайте файл `.env.local` в корневой папке проекта (рядом с `package.json`)
2. Скопируйте содержимое из `.env.example`
3. Заполните значения из инструкций ниже

```bash
# В корневой папке проекта:
cp .env.example .env.local
```

---

## 📝 Подробное описание каждой переменной

### 1️⃣ TELEGRAM - Основные настройки бота

#### `TELEGRAM_BOT_TOKEN` (ОБЯЗАТЕЛЬНО)

**Что это:** Уникальный токен вашего Telegram бота для отправки сообщений и управления

**Как получить:**

1. Откройте Telegram и найдите бота `@BotFather`
2. Отправьте команду `/newbot`
3. Введите имя бота (например, "VapeShop Bot")
4. Введите username бота (должно заканчиваться на `_bot`, например `vapeshop_bot`)
5. BotFather выдаст токен в формате: `123456789:ABCDefGhIjKlmnOpqrstuvwxyz`

**Где вставить:**

```env
TELEGRAM_BOT_TOKEN=123456789:ABCDefGhIjKlmnOpqrstuvwxyz
```

**Пример:**

```env
TELEGRAM_BOT_TOKEN=6849755555:AAEG5rW4M7k8K9L0M1N2O3P4Q5R6S7T8U9
```

---

#### `NEXT_PUBLIC_BOT_USERNAME` (ОБЯЗАТЕЛЬНО)

**Что это:** Username бота для создания ссылок типа `t.me/вашего_бота`

**Как получить:**

- Берётся из шага 4 при создании бота в @BotFather
- **БЕЗ символа @**

**Где вставить:**

```env
NEXT_PUBLIC_BOT_USERNAME=vapeshop_bot
```

---

### 2️⃣ DATABASE - Подключение к базе данных

#### `DATABASE_URL` (ОБЯЗАТЕЛЬНО для production)

**Что это:** Строка подключения к PostgreSQL базе данных

#### Вариант А: Локальная разработка (PostgreSQL на компьютере)

**Как получить:**

1. Убедитесь, что PostgreSQL установлен и запущен
2. Создайте новую БД: `createdb vapeshop`
3. Узнайте ваше имя пользователя (обычно `postgres`)

**Где вставить:**

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/vapeshop
```

**Пример:**

```env
DATABASE_URL=postgresql://postgres:mypassword123@localhost:5432/vapeshop
```

#### Вариант Б: Neon (облачный хостинг - РЕКОМЕНДУЕТСЯ для production)

**Как получить:**

1. Перейдите на https://neon.tech
2. Создайте аккаунт (лучше через GitHub)
3. Создайте новый Project
4. Скопируйте Connection String вкладки "Connection string"
5. Выберите "Psycopg2" или "PostgreSQL"

**Где вставить:**

```env
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/vapeshop?sslmode=require
```

**Пример Neon:**

```env
DATABASE_URL=postgresql://neondb_owner:abcdefg123@ep-cool-morning-12345.us-east-1.aws.neon.tech/neondb?sslmode=require
```

---

### 3️⃣ TELEGRAM ROLES - Управление доступом

#### `ADMIN_TELEGRAM_IDS` (ОБЯЗАТЕЛЬНО)

**Что это:** ID пользователей Telegram, у которых полный доступ к админ-панели

**Как получить свой Telegram ID:**

1. Откройте бота `@userinfobot` в Telegram
2. Отправьте `/start` или любое сообщение
3. Бот вернёт ваш ID

**Как получить ID другого пользователя:**

- Добавьте его в группу с ботом `@userinfobot`
- ID появится когда он напишет сообщение

**Где вставить:**

```env
ADMIN_TELEGRAM_IDS=1656233031,1234567890,9876543210
```

**Пример (несколько админов):**

```env
ADMIN_TELEGRAM_IDS=1234567890,9876543210
```

**Пример (один админ):**

```env
ADMIN_TELEGRAM_IDS=1234567890
```

---

#### `MANAGER_TELEGRAM_IDS` (опционально)

**Что это:** ID менеджеров (управление заказами, статистика)

**Где вставить:**

```env
MANAGER_TELEGRAM_IDS=1111111111,2222222222
```

---

#### `SELLER_TELEGRAM_IDS` (опционально)

**Что это:** ID продавцов (добавление/редактирование товаров)

**Где вставить:**

```env
SELLER_TELEGRAM_IDS=3333333333,4444444444
```

---

#### `SUPPORT_TELEGRAM_IDS` (опционально)

**Что это:** ID сотрудников поддержки (ответы на вопросы, рефунды)

**Где вставить:**

```env
SUPPORT_TELEGRAM_IDS=5555555555,6666666666
```

---

#### `COURIER_TELEGRAM_IDS` (опционально)

**Что это:** ID курьеров (отслеживание доставок)

**Где вставить:**

```env
COURIER_TELEGRAM_IDS=7777777777,8888888888
```

---

### 4️⃣ DEPLOYMENT - Адреса для развёртывания

#### `NEXT_PUBLIC_WEBAPP_URL` (ОБЯЗАТЕЛЬНО)

**Что это:** URL вашего приложения, по которому на него можно обратиться

**Локальная разработка:**

```env
NEXT_PUBLIC_WEBAPP_URL=http://localhost:3000
```

**Production (Vercel):**

```env
NEXT_PUBLIC_WEBAPP_URL=https://vape-shop.vercel.app
```

**Production (собственный домен):**

```env
NEXT_PUBLIC_WEBAPP_URL=https://vapeshop.store
```

---

#### `VERCEL_URL` (автоматический на Vercel)

**Что это:** Автоматически устанавливается Vercel при деплое

**Для локальной разработки можно игнорировать (или установить на localhost:3000)**

---

### 5️⃣ SECURITY - Безопасность и защита

#### `CRON_SECRET` (ОБЯЗАТЕЛЬНО для production)

**Что это:** Секретный ключ для защиты автоматических задач (резервные копии, очистка и т.д.)

**Как генерировать (Windows PowerShell):**

```powershell
$bytes = New-Object byte[] 32
([System.Security.Cryptography.RNGCryptoServiceProvider]::new()).GetBytes($bytes)
[System.Convert]::ToHexString($bytes)
```

**Как генерировать (Linux/Mac):**

```bash
openssl rand -hex 32
```

**Где вставить:**

```env
CRON_SECRET=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1
```

---

#### `JWT_SECRET` (ОБЯЗАТЕЛЬНО для production)

**Что это:** Секрет для подписания JWT токенов сессии

**Как генерировать (Windows PowerShell):**

```powershell
$bytes = New-Object byte[] 32
([System.Security.Cryptography.RNGCryptoServiceProvider]::new()).GetBytes($bytes)
[System.Convert]::ToHexString($bytes)
```

**Где вставить:**

```env
JWT_SECRET=f9e8d7c6b5a4a3b2c1d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1
```

---

#### `TELEGRAM_SECRET_KEY` (опционально, для повышенной безопасности)

**Что это:** Дополнительный ключ для верификации Telegram initData

**Как генерировать:**
Используйте тот же способ, что для `CRON_SECRET` и `JWT_SECRET`

**Где вставить:**

```env
TELEGRAM_SECRET_KEY=b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

---

### 6️⃣ RATE LIMITING - Ограничение запросов

#### `RATE_LIMIT_REQUESTS_PER_MINUTE` (опционально)

**Что это:** Максимум API запросов в минуту на один IP адрес (защита от DDoS)

**Где вставить:**

```env
RATE_LIMIT_REQUESTS_PER_MINUTE=100
```

**Рекомендуемые значения:**

- Разработка: `1000` (без ограничений)
- Production: `100` (умеренная защита)
- High Load: `500` (для популярных приложений)

---

### 7️⃣ DEVELOPMENT - Отладка и разработка

#### `DEBUG` (опционально)

**Что это:** Включить расширенное логирование

```env
DEBUG=false
```

**Значения:**

- `true` - включить вывод всех логов
- `false` - только основные

---

#### `LOG_LEVEL` (опционально)

**Что это:** Уровень детальности логирования

```env
LOG_LEVEL=info
```

**Доступные уровни:**

- `error` - только ошибки
- `warn` - ошибки и предупреждения
- `info` - основная информация (по умолчанию)
- `debug` - всё подробно

---

### 8️⃣ OPTIONAL: EMAIL NOTIFICATIONS

#### `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `ADMIN_EMAIL`

**Если нужно отправлять email уведомления:**

**Gmail:**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
ADMIN_EMAIL=admin@vapeshop.local
```

**Маилру:**

```env
SMTP_HOST=smtp.mail.ru
SMTP_PORT=465
SMTP_USER=your-email@mail.ru
SMTP_PASSWORD=your-password
ADMIN_EMAIL=admin@vapeshop.local
```

**Яндекс.Почта:**

```env
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=your-email@yandex.ru
SMTP_PASSWORD=your-password
ADMIN_EMAIL=admin@vapeshop.local
```

---

### 9️⃣ OPTIONAL: STRIPE PAYMENTS

**Если использовать Stripe вместо Telegram Stars:**

**Как получить:**

1. Перейдите на https://stripe.com
2. Создайте аккаунт
3. Перейдите в Developers → API Keys
4. Скопируйте Publishable и Secret keys

```env
STRIPE_PUBLIC_KEY=pk_test_abcdefghij1234567890
STRIPE_SECRET_KEY=sk_test_abcdefghij1234567890
```

---

### 🔟 OPTIONAL: ANALYTICS & MONITORING

#### `AMPLITUDE_API_KEY` (опционально)

**Для аналитики использования приложения:**

**Как получить:**

1. Перейдите на https://app.amplitude.com
2. Создайте проект
3. Скопируйте API Key из Project Settings

```env
AMPLITUDE_API_KEY=abc123def456ghi789
```

---

#### `SENTRY_DSN` (опционально)

**Для отслеживания ошибок в production:**

**Как получить:**

1. Перейдите на https://sentry.io
2. Создайте проект для Next.js
3. Скопируйте DSN из настроек

```env
SENTRY_DSN=https://abc123@sentry.io/12345678
```

---

### 1️⃣1️⃣ OPTIONAL: DATABASE BACKUP

#### `DB_BACKUP_ENABLED`, `NEON_API_KEY`, `NEON_PROJECT_ID`

**Если используете Neon и хотите автоматические бэкапы:**

**Как получить Neon API Key:**

1. Перейдите в Neon Dashboard
2. Account → API keys
3. Создайте новый API key

```env
DB_BACKUP_ENABLED=true
NEON_API_KEY=qwerty123456
NEON_PROJECT_ID=proj_abc123def456
```

---

## 📝 Финальный пример .env.local

```env
# ========== TELEGRAM ==========
TELEGRAM_BOT_TOKEN=6849755555:AAEG5rW4M7k8K9L0M1N2O3P4Q5R6S7T8U9
NEXT_PUBLIC_BOT_USERNAME=vapeshop_bot

# ========== DATABASE ==========
DATABASE_URL=postgresql://neondb_owner:abcdefg123@ep-cool-morning-12345.us-east-1.aws.neon.tech/neondb?sslmode=require

# ========== ROLES ==========
ADMIN_TELEGRAM_IDS=1234567890
MANAGER_TELEGRAM_IDS=1111111111
SELLER_TELEGRAM_IDS=2222222222
SUPPORT_TELEGRAM_IDS=3333333333

# ========== DEPLOYMENT ==========
NEXT_PUBLIC_WEBAPP_URL=https://vape-shop.vercel.app

# ========== SECURITY ==========
CRON_SECRET=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1
JWT_SECRET=f9e8d7c6b5a4a3b2c1d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1

# ========== DEVELOPMENT ==========
DEBUG=false
LOG_LEVEL=info

# ========== RATE LIMITING ==========
RATE_LIMIT_REQUESTS_PER_MINUTE=100
```

---

## ✅ Чек-лист перед развёртыванием на Vercel

- [ ] Создан файл `.env.local` с НЕОБХОДИМЫМИ переменными
- [ ] `TELEGRAM_BOT_TOKEN` - токен получен от @BotFather
- [ ] `DATABASE_URL` - подключение к Neon подтверждено
- [ ] `ADMIN_TELEGRAM_IDS` - указаны ID администраторов
- [ ] `NEXT_PUBLIC_WEBAPP_URL` - установлен правильный URL
- [ ] `CRON_SECRET` - сгенерирован безопасный ключ (32+ символа)
- [ ] `JWT_SECRET` - сгенерирован безопасный ключ (32+ символа)
- [ ] `.env.local` **добавлен в `.gitignore`** (чтобы не загружать в Git)

---

## 🌐 Настройка на Vercel (для production)

После развёртывания на Vercel нужно добавить переменные окружения в Vercel Dashboard:

1. Перейдите на https://vercel.com/dashboard
2. Выберите ваш проект
3. Settings → Environment Variables
4. Добавьте все переменные из чек-листа выше

**⚠️ ВАЖНО:** На Vercel указывайте только переменные, которые НЕ начинаются с `NEXT_PUBLIC_` (они в Vercel добавляются автоматически)

---

## 🔒 Безопасность

### Правила:

1. ✅ `.env.local` никогда не коммитить в Git
2. ✅ Использовать разные секреты для разработки и production
3. ✅ Регулярно ротировать секреты в production
4. ✅ Никому не давать доступ к `.env.local` файлу
5. ✅ Использовать переменные окружения, а не hardcoded значения

### Проверка .gitignore:

```bash
# В корневой папке проекта проверьте что там написано:
cat .gitignore
```

Должно быть:

```
.env
.env.local
.env.local.backup
```

---

## 🆘 Troubleshooting

### "Error: Database connection failed"

- Проверьте `DATABASE_URL` - правильная ли строка подключения?
- Если Neon - включена ли БД в Neon Dashboard?
- Для локальной БД - запущен ли PostgreSQL сервис?

### "Error: Invalid TELEGRAM_BOT_TOKEN"

- Скопирован ли 100% весь токен без пробелов?
- Токен должен быть формата: `123456789:ABCDefGhIjKlmnOpqrstuvwxyz`

### "Error: CRON_SECRET is too short"

- Минимум 32 символа для безопасности
- Используйте генератор: `openssl rand -hex 32`

### "Bot doesn't respond to commands"

- Проверьте что `TELEGRAM_BOT_TOKEN` правильный
- Убедитесь что webhook URL правильный в BotFather
- Проверьте логи на Vercel

---

## 📚 Полезные ссылки

- **Telegram BotFather:** https://t.me/botfather
- **Neon Database:** https://neon.tech
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Next.jsenv docs:** https://nextjs.org/docs/basic-features/environment-variables
- **Sentry:** https://sentry.io
- **Amplitude:** https://amplitude.com

---

**Последнее обновление:** 8 апреля 2026
**Версия:** 1.0
