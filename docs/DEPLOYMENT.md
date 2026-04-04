# 🚀 Инструкция деплоя VapeShop

Пошаговое руководство по разворачиванию приложения на production.

## 1️⃣ Подготовка к деплою

### 1.1 Проверка код-базы

```bash
# Убедись, что всё собирается
npm run build

# Линтинг
npm run lint

# Type checking
npm run type-check

# Тесты (если есть)
npm run test
```

### 1.2 Проверь .env переменные

```bash
# Скопируй шаблон
cp .env.local.example .env.local

# Заполни все обязательные переменные:
# - TELEGRAM_BOT_TOKEN
# - NEON_DATABASE_URL (для production)
# - ADMIN_TELEGRAM_IDS
# - Остальные по необходимости
```

## 2️⃣ Настройка Database (PostgreSQL)

### Вариант 1: Neon (рекомендуется для Vercel)

1. Перейди на https://neon.tech
2. Создай новый проект
3. Копируй Connection String и добавь в NEON_DATABASE_URL
4. Запусти миграции:
   ```bash
   npm run migrate:prod
   ```

### Вариант 2: Самостоятельный PostgreSQL

1. Установи PostgreSQL локально или на сервере
2. Создай базу данных:
   ```sql
   CREATE DATABASE vapeshop;
   ```
3. Заполни DATABASE_URL в .env.local
4. Запусти миграции:
   ```bash
   psql -U postgres -d vapeshop < db/migrations/001_init.sql
   psql -U postgres -d vapeshop < db/migrations/002_orders.sql
   # ... и так для всех миграций
   ```

## 3️⃣ Настройка Telegram Bot

### 3.1 Создание бота в @BotFather

1. Открой Telegram и найди @BotFather
2. Команда: `/newbot`
3. Назови бота: `VapeShop Mini App`
4. Username: `vapexays_bot` (должен быть уникален)
5. Получишь токен: `TELEGRAM_BOT_TOKEN`

### 3.2 Настройка webhook

```bash
# На production сервере (Vercel):
# POST https://api.telegram.org/botXXXXX/setWebhook
# Передай:
# {
#   "url": "https://your-app.vercel.app/api/bot",
#   "allowed_updates": ["message", "callback_query", "pre_checkout_query", "successful_payment"]
# }

# Или используй curl:
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-app.vercel.app/api/bot"}'
```

### 3.3 Проверка webhook

```bash
# Проверь статус webhook:
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

## 4️⃣ Деплой на Vercel

### 4.1 Подготовка Git репозитория

```bash
# Инициализируй Git (если не инициализирован)
git init

# Добавь файлы
git add .

# Коммитный первый коммит
git commit -m "Initial commit: VapeShop Mini App"

# Создай репозиторий на GitHub/GitLab/Bitbucket
# И пушь:
git remote add origin https://github.com/yourusername/vape-shop.git
git branch -M main
git push -u origin main
```

### 4.2 Верцель deployment

**Способ 1: через Vercel Dashboard (легче)**

1. Перейди на https://vercel.com/dashboard
2. Нажми "Add New..." → "Project"
3. Импортируй репозиторий (GitHub/GitLab/Bitbucket)
4. Vercel автоматически определит Next.js
5. Добавь Environment Variables:
   - TELEGRAM_BOT_TOKEN
   - NEON_DATABASE_URL
   - ADMIN_TELEGRAM_IDS
   - И остальные
6. Нажми "Deploy"

**Способ 2: через Vercel CLI**

```bash
# Установи Vercel CLI
npm i -g vercel

# Логинись
vercel login

# Деплой
vercel

# Production deployment
vercel --prod
```

### 4.3 Переменные окружения на Vercel

1. Перейди в Project Settings → Environment Variables
2. Добавь каждую переменную:
   - Выбери окружения: Development, Preview, Production
   - Для Database URL: только Production
   - Для Bot Token: все окружения (но разные боты для dev/prod если нужно)

## 5️⃣ Post-Deploy Configuration

### 5.1 Настройка webhook после деплоя

После первого deployment на Vercel:

```bash
# Получи hostname Vercel проекта (например: vape-shop.vercel.app)

# Отправь webhook на Telegram:
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url":"https://vape-shop.vercel.app/api/bot"}'

# Проверь, что webhook установлен:
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

### 5.2 Первоначальная синхронизация БД

```bash
# Если используешь Neon, выполни миграции:
NEON_DATABASE_URL="..." npm run migrate:prod

# Или вручную через Neon console (SQL editor):
# Выполни все файлы из db/migrations/
```

### 5.3 Тестирование на production

1. Открой бота в Telegram: @vapexays_bot
2. Нажми /start → должна открыться твоя app на Vercel
3. Проверь:
   - Загрузка товаров
   - Добавление в корзину
   - Оформление заказа
   - Отзывы и рейтинги

## 6️⃣ Мониторинг и логирование

### Sentry (отслеживание ошибок)

```bash
# 1. Создай проект на https://sentry.io
# 2. Получи DSN
# 3. Добавь в Environment Variables:
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# 4. Всё! Ошибки будут автоматически логироваться
```

### Vercel Analytics

- Vercel автоматически собирает Core Web Vitals
- Смотри в Project → Analytics
- Следи за Performance, Error rate

## 7️⃣ CI/CD Pipeline (опционально)

Создай `.github/workflows/deploy.yml` для автоматического деплоя:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run lint
      - run: npm run type-check
      - run: npm run build
      - uses: vercel/action@master
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          production: true
```

## 🆘 Troubleshooting

### Webhook не работает

```bash
# Проверь, что webhook установлен правильно:
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo

# Если показывает ошибку, переустанови:
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-app.vercel.app/api/bot","allowed_updates":["message","callback_query","pre_checkout_query","successful_payment"]}'
```

### БД не подключается

```bash
# Проверь NEON_DATABASE_URL в Vercel:
# 1. Project Settings → Environment Variables
# 2. Убедись, что значение скопировано корректно
# 3. Переdeployй проект: Vercel → Deployments → Redeploy

# Проверь, что миграции выполнены (в Neon console):
# SELECT * FROM products; -- если вернёт результаты, всё ОК
```

### Bot не отвечает

```bash
# Проверь логи:
# Vercel Dashboard → Project → Functions → api/bot
# Посмотри последние логи на ошибки

# Проверь, что TELEGRAM_BOT_TOKEN установлен в Environment Variables
```

## 📋 Чеклист перед production

- ✅ `npm run build` - без ошибок
- ✅ `npm run lint` - без предупреждений
- ✅ `npm run type-check` - без ошибок типов
- ✅ Database миграции выполнены (проверь в Neon)
- ✅ Webhook установлен (`getWebhookInfo` показывает URL)
- ✅ Bot тестирован в Telegram
- ✅ Environment переменные заполнены на Vercel
- ✅ SSL сертификат активен (Vercel даёт автоматически)
- ✅ Логирование настроено (Sentry опционально)

---

**Дата**: 2026-04-04  
**Версия**: 1.0.0
