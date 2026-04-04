# 🍃 VapeShop Mini App

Telegram Mini App для e-commerce продажи товаров. Встроенное веб-приложение в Telegram с поддержкой платежей через Telegram Stars.

## 🚀 Быстрый старт

### Требования
- Node.js 16+
- PostgreSQL 12+
- npm или yarn

### Установка

```bash
# 1. Клонируй репозиторий
git clone <repo> vape-shop
cd vape-shop

# 2. Установи зависимости
npm install

# 3. Настрой переменные окружения
cp .env.local.example .env.local
# Отредактируй .env.local с твоими ключами

# 4. Запусти миграции БД
# (на production используй Vercel PostgreSQL или Neon)

# 5. Запусти dev сервер
npm run dev

# Открой http://localhost:3000
```

## 📦 Переменные окружения

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
NEXT_PUBLIC_BOT_USERNAME=@your_bot_username

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/vapeshop
NEON_DATABASE_URL=postgresql://user:pass@neon.tech/vapeshop

# Telegram IDs для администраторов
ADMIN_TELEGRAM_IDS=123456789,987654321
MANAGER_TELEGRAM_IDS=111111111
SELLER_TELEGRAM_IDS=222222222

# Vercel (production)
VERCEL_URL=https://your-app.vercel.app

# Supabase (опционально, для хранения изображений)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your_key
```

## 📁 Структура проекта

```
vape-shop/
├── pages/              # Next.js страницы и API routes
│   ├── index.tsx       # Главная страница
│   ├── product/[id].tsx  # Страница товара
│   ├── cart.tsx        # Корзина
│   ├── admin/          # Admin панель
│   └── api/            # Backend endpoints
├── components/         # React компоненты
├── lib/                # Утилиты и хуки
│   ├── auth.ts         # Telegram аутентификация
│   ├── db.ts           # Database queries
│   ├── validate.ts     # Валидация данных
│   └── telegram.ts     # Telegram WebApp API
├── db/migrations/      # SQL миграции
├── types/              # TypeScript типы
├── styles/             # Глобальные стили (Tailwind)
├── public/             # Статические файлы
└── docs/               # Документация
```

## 🏗️ Архитектура

### Frontend
- **Framework**: Next.js 14 + React 18 + TypeScript
- **Styling**: Tailwind CSS + Dark Mode
- **State**: SWR для кэширования, useState для локального состояния
- **Telegram Integration**: grammy bot + WebApp API

### Backend
- **Framework**: Next.js API Routes
- **Database**: PostgreSQL (через Neon или локально)
- **Payments**: Telegram Stars (встроенные платежи)
- **Bot**: grammy для обработки команд и callback'ов

### Deployment
- **Hosting**: Vercel (Next.js оптимизирован)
- **Database**: Neon PostgreSQL
- **Bot Webhook**: Vercel serverless functions

## 👥 Роли и доступ

| Роль | Может делать |
|------|-------------|
| **customer** | Просмотр товаров, покупки, отзывы, рефералы |
| **manager** | Управление заказами, аналитика |
| **admin** | Управление товарами, промокодами, пользователями |
| **super_admin** | Все + управление ролями и логи |
| **courier** | Отслеживание заказов для доставки |
| **support** | Ответы на вопросы, рефунды |

## 🔐 Безопасность

- ✅ HMAC верификация Telegram initData
- ✅ Проверка прав на каждом API endpoint
- ✅ Parameterized queries (защита от SQL инъекций)
- ✅ Rate limiting на критичных эндпоинтах
- ✅ Audit logging для всех операций
- ✅ Soft delete для важных данных
- ✅ Транзакции для операций с множеством таблиц

## 📊 Функционал

### Для клиентов
- 🛍️ Каталог товаров с фильтрацией
- 🛒 Корзина с сохранением статуса
- 💳 Оплата через Telegram Stars
- 📦 Отслеживание заказов
- ⭐ Отзывы и рейтинги
- 🎁 Реферальная система с бонусами
- ❤️ Избранное и отложенная корзина
- 🔄 Сравнение товаров

### Для админов
- 📈 Аналитика и графики выручки
- 📦 Управление товарами (включая bulk edit)
- 📋 История заказов с фильтрацией
- 📝 CSV импорт товаров
- 💬 Рассылка сообщений через бота
- 👥 Управление пользователями и ролями
- 📊 Экспорт данных в Excel

## 🧪 Тестирование

```bash
# Unit тесты
npm run test

# E2E тесты
npm run test:e2e

# Lint и type check
npm run lint
npm run type-check
```

## 📚 Дополнительные документы

- [DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Как разворачивать на Vercel
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Детальная архитектура
- [API_REFERENCE.md](./docs/API_REFERENCE.md) - Все API endpoints
- [SCHEMA.md](./docs/SCHEMA.md) - Схема базы данных

## 🤝 Контрибьютинг

1. Fork репозиторий
2. Создай ветку для фичи (`git checkout -b feature/NewFeature`)
3. Коммитай изменения (`git commit -m 'Add NewFeature'`)
4. Пушь в ветку (`git push origin feature/NewFeature`)
5. Открой Pull Request

## 📄 Лицензия

MIT License - смотри LICENSE файл

## 🔗 Ссылки

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram WebApp API](https://core.telegram.org/bots/webapps)
- [Next.js Documentation](https://nextjs.org/docs)
- [Telegram Stars](https://core.telegram.org/bots/payments)

---

**Версия**: 1.0.0  
**Последнее обновление**: 2026-04-04
