# 📦 Требуемые пакеты для установки

## Новые зависимости добавляемые в проект

### Security & Performance
- **@upstash/redis** - Redis для Vercel (CSRF, Rate Limiting)
- **sharp** - Image processing на Node.js (вместо Browser APIs)
- **isomorphic-dompurify** - XSS protection (работает и на сервере и на клиенте)

### Уже установлены
- **zod** - Validation (уже в package.json)
- **pg** - PostgreSQL driver (уже установлен)
- **grammy** - Telegram Bot API (уже установлен)

## Команды для установки

```bash
# Установка всех необходимых пакетов
npm install @upstash/redis sharp isomorphic-dompurify

# ИЛИ с yarn
yarn add @upstash/redis sharp isomorphic-dompurify

# ИЛИ с pnpm
pnpm add @upstash/redis sharp isomorphic-dompurify
```

## Environment Variables

Нужно добавить в .env.local:

```
# Redis / Upstash (для CSRF и Rate Limiting)
UPSTASH_REDIS_REST_URL=<your-upstash-redis-url>
UPSTASH_REDIS_REST_TOKEN=<your-upstash-redis-token>

# Telegram Bot
TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>

# Database
DATABASE_URL=<your-database-url>
NEON_DATABASE_URL=<your-neon-database-url>

# App
NODE_ENV=production
WEBAPP_URL=https://your-app-url.com
```

## Миграции БД

После установки пакетов, нужно запустить миграции:

```bash
# Миграция 036: Fix duplicate tables and add soft delete
# Миграция 037: Fix decimal precision for currency  
# Миграция 038: Standardize ID types and add UUID support

npm run migrate:prod
```

## Sharp Installation Notes

Sharp требует компиляции native модулей. Если возникнут проблемы при установке:

- На Linux: убедиться что установлены build tools (`apt-get install build-essential python3`)
- На macOS: убедиться что установлены Command Line Tools
- На Windows: убедиться что установлены Visual Build Tools

Если sharp установлен на другой платформе, может потребоваться переустановка:

```bash
npm rebuild sharp
```

---

