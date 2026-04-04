# 🏗️ Архитектура VapeShop Mini App

Полное описание системной архитектуры, потоков данных и взаимодействия компонентов.

## 📋 Содержание

1. [Общая архитектура](#общая-архитектура)
2. [Слои приложения](#слои-приложения)
3. [Потоки данных](#потоки-данных)
4. [Система ролей](#система-ролей)
5. [Процесс авторизации](#процесс-авторизации)
6. [Жизненный цикл заказа](#жизненный-цикл-заказа)
7. [Интеграция Telegram Bot](#интеграция-telegram-bot)
8. [Структура БД](#структура-бд)
9. [Кэширование](#кэширование)
10. [Безопасность](#безопасность)

---

## 🎯 Общая архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                     Telegram Mini App UI                    │
│  (React 18 + TypeScript + Tailwind CSS + Next.js Pages)     │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP/HTTPS (JSON)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                    Next.js API Routes                       │
│   (TypeScript + Node.js + Vercel Serverless)                │
│                                                              │
│  ├─ /api/products      (GET/POST/PUT)                       │
│  ├─ /api/orders        (GET/POST)                           │
│  ├─ /api/cart          (GET/POST/DELETE)                    │
│  ├─ /api/auth          (GET)                                │
│  ├─ /api/admin/*       (POST/DELETE - protected)            │
│  └─ /api/bot           (POST - Telegram webhook)            │
└──────────────────┬──────────────────────────────────────────┘
                   │
     ┌─────────────┼─────────────┐
     ↓             ↓             ↓
┌─────────┐  ┌──────────┐  ┌─────────────┐
│ Neon    │  │Supabase  │  │Telegram API │
│PostgreSQL   │(Storage) │  │(Bot & Auth) │
└─────────┘  └──────────┘  └─────────────┘
```

---

## 🧱 Слои приложения

### 1. Presentation Layer (Фронтенд)

**Файлы**: `pages/*.tsx`, `components/`

Отвечает за:
- Отображение UI (каталог, корзина, заказы, админка)
- Сбор пользовательского ввода (форма заказа, фильтры)
- Локальное состояние (корзина в localStorage, избранное)
- Отправка запросов на backend

**Ключевые компоненты**:
- `ProductCard` - карточка товара (изображение, цена, рейтинг)
- `CartItem` - элемент корзины (с удалением, сохранением)
- `OrderCard` - карточка заказа в истории
- `AdminSidebar` - навигация админки
- `Skeleton`, `EmptyState`, `Toast` - утилиты UX

### 2. API Layer (Backend)

**Файлы**: `pages/api/`

Отвечает за:
- Обработку HTTP запросов (GET/POST/PUT/DELETE)
- Валидацию входных данных
- Авторизацию и проверку ролей
- Обращение к БД
- Возврат JSON ответов

**Структура**:
```
pages/api/
├── products.ts           (GET список, POST новый)
├── products/[id].ts      (GET один, PUT обновить, DELETE)
├── orders.ts             (GET история, POST создание)
├── orders/[id].ts        (GET детали заказа)
├── orders/search-orders.ts (GET с фильтрацией)
├── cart.ts               (GET, POST добавить, DELETE удалить)
├── admin/
│   ├── products.ts       (PUT массовое обновление)
│   ├── import.ts         (POST CSV импорт)
│   ├── orders.ts         (GET все заказы для админки)
│   ├── stats.ts          (GET аналитика)
│   ├── settings.ts       (GET/PUT настройки)
│   └── broadcast.ts      (POST массовая рассылка)
├── bot.ts                (POST Telegram webhook)
├── referral.ts           (GET/POST реферальная система)
├── saved-for-later.ts    (GET/POST отложенная корзина)
├── compare.ts            (GET/POST сравнение товаров)
└── health.ts             (GET проверка здоровья)
```

### 3. Business Logic Layer

**Файлы**: `lib/`

Отвечает за:
- Бизнес-правила (расчет скидок, бонусов)
- Валидация данных
- Интеграция с Telegram API
- Отправка уведомлений
- Логирование действий

**Ключевые модули**:
- `lib/auth.ts` - HMAC верификация, проверка ролей
- `lib/db.ts` - подключение к БД, retry logic
- `lib/notifications.ts` - отправка сообщений в Telegram
- `lib/useSWR.ts` - клиентский кэш с SWR
- `lib/validate.ts` - валидация продуктов, заказов
- `lib/rateLimit.ts` - защита от DDoS

### 4. Data Layer (БД)

**Файлы**: `db/migrations/`, `lib/db.ts`

Отвечает за:
- Хранение данных (PostgreSQL/Neon)
- Выполнение запросов (SQL)
- Обеспечение целостности данных (constraints, triggers)
- Резервные копии

**Таблицы**:
- `users` - профили пользователей
- `products` - каталог товаров
- `categories` - категории
- `cart_items` - товары в корзине
- `orders` - заказы
- `order_items` - товары в заказе
- `reviews` - отзывы с рейтингом
- `referral_codes` - реферальные коды
- `saved_for_later` - отложенные товары
- `audit_log` - история действий
- И 10+ вспомогательных таблиц

---

## 🔄 Потоки данных

### Поток: Просмотр каталога

```
User opens /
  ↓
GET /api/products (page=1, limit=20)
  ↓
lib/auth.getTelegramIdFromRequest()
  ↓
Query: SELECT * FROM products WHERE is_active = true LIMIT 20
  ↓
Cache in SWR (revalidateOnFocus=false, dedupInterval=60000)
  ↓
Render ProductCard components
  ↓
onClick ProductCard → useRouter.push('/product/[id]')
```

### Поток: Добавление в корзину

```
User clicks "Add to Cart"
  ↓
POST /api/cart
  {
    "product_id": 123,
    "quantity": 2
  }
  ↓
lib/auth.requireAuth() - проверка Telegram ID
  ↓
Query: INSERT INTO cart_items VALUES (...)
         ON CONFLICT (user_telegram_id, product_id)
         DO UPDATE SET quantity = quantity + 2
  ↓
Return: { success: true, cartCount: 5 }
  ↓
Update counter in header via SWR mutate()
  ↓
Toast: "Товар добавлен в корзину"
```

### Поток: Оформление заказа

```
User clicks "Confirm Order" in /cart
  ↓
POST /api/orders
  {
    "items": [{ product_id: 1, qty: 2 }, ...],
    "delivery": "courier",
    "address": "..."
  }
  ↓
lib/auth.requireAuth()
  ↓
Validate items (check existence, quantity)
  ↓
BEGIN TRANSACTION
  ↓
  1. INSERT INTO orders (user_telegram_id, status='pending', total=...)
  2. INSERT INTO order_items (order_id, product_id, quantity, ...)
  3. UPDATE products SET stock = stock - qty (деcrement stock)
  4. DELETE FROM cart_items (очистка корзины)
  ↓
CREATE INVOICE with Telegram Stars
  ↓
COMMIT TRANSACTION
  ↓
Return: { order_id: 456, invoice_link: "..." }
  ↓
Redirect to payment
```

### Поток: Успешный платёж

```
User approves payment in Telegram
  ↓
Telegram Bot → POST /api/bot
  {
    "update_id": 123,
    "message": {...},
    "successful_payment": {...}
  }
  ↓
lib/bot/handlers.ts processSuccessfulPayment()
  ↓
Query: UPDATE orders SET status='paid' WHERE id=...
  ↓
Send notification to user: "Заказ принят! Номер: #456"
  ↓
Send notification to admin: "Новый заказ на сумму 500 ₽"
```

---

## 👥 Система ролей

Четыре уровня доступа:

| Роль | Возможности | WHERE условие |
|------|------------|----------------|
| **customer** (по умолчанию) | Просмотр каталога, создание заказов, отзывы | `role = 'customer'` |
| **seller** | Добавление/редактирование своих товаров | `role = 'seller'` |
| **manager** | Просмотр всех заказов, аналитика | `role = 'manager'` |
| **admin** | Полный доступ, управление пользователями, импорт | `role = 'admin'` |
| **super_admin** | Системные права, конфигурация бота | `role = 'super_admin'` |

**Проверка ролей** (backend):

```typescript
// lib/auth.ts
function requireRole(role: 'admin' | 'manager' | 'seller') {
  return (handler) => async (req, res) => {
    const telegramId = getTelegramIdFromRequest(req);
    const user = await query(
      'SELECT role FROM users WHERE telegram_id = $1',
      [telegramId]
    );
    
    if (user.rows[0]?.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    return handler(req, res);
  };
}
```

---

## 🔐 Процесс авторизации

### Шаг 1: Инициализация WebApp

```typescript
// pages/_app.tsx
import { useTelegramWebApp } from '@/lib/telegram';

export default function App() {
  const { user, isReady } = useTelegramWebApp();
  // user = { id, first_name, last_name, username, is_bot, is_premium, ... }
}
```

### Шаг 2: HMAC верификация initData

```typescript
// lib/auth.ts
function validateTelegramInitData(initData: string): boolean {
  // Telegram отправляет: query_id, user, auth_date, hash
  // hash = HMAC_SHA256(bot_token, query_string)
  
  const data = new URLSearchParams(initData);
  const hash = data.get('hash');
  data.delete('hash');
  
  const dataCheckString = [...data.entries()]
    .sort()
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN)
    .digest();
  
  const computed = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  
  return timingSafeEqual(computed, hash);
}
```

### Шаг 3: Проверка auth_date

```typescript
const authDate = parseInt(data.get('auth_date')!);
const now = Math.floor(Date.now() / 1000);

if (now - authDate > 3600) { // 1 час
  throw new Error('initData expired');
}
```

### Шаг 4: Извлечение Telegram ID

```typescript
const user = JSON.parse(data.get('user')!);
const telegramId = user.id;

// Добавить в БД если новый пользователь
await query(
  `INSERT INTO users (telegram_id, first_name, username, created_at)
   VALUES ($1, $2, $3, NOW())
   ON CONFLICT (telegram_id) DO NOTHING`,
  [telegramId, user.first_name, user.username]
);
```

---

## 📦 Жизненный цикл заказа

```
┌─────────────┐
│   PENDING   │ (Заказ создан, ожидание платежа)
└──────┬──────┘
       │ (Пользователь оплатил)
       ↓
┌─────────────┐
│   PAID      │ (Платёж получен)
└──────┬──────┘
       │ (Админ подтверждает отправку)
       ↓
┌─────────────┐
│  SHIPPED    │ (Товар отправлен)
└──────┬──────┘
       │ (Товар получен)
       ↓
┌─────────────┐
│ DELIVERED   │ (Доставлено)
└──────┬──────┘
       │ (Опционально: отзыв)
       ↓
┌─────────────┐
│ REVIEWED    │ (Есть отзыв)
└─────────────┘

Возможные отказы:
PAID → CANCELLED (по запросу пользователя или админа)
      → REFUNDED (возврат денег)
```

**Уведомления на каждом этапе**:

1. PENDING → Пользователю: "Заказ принят"
2. PAID → Админу: "Новый платежный заказ"
3. SHIPPED → Пользователю: "Ваш заказ отправлен"
4. DELIVERED → Пользователю: "Заказ доставлен, напишите отзыв"

---

## 🤖 Интеграция Telegram Bot

### Инициализация

```typescript
// pages/api/bot.ts
import { Bot } from 'grammy';

const bot = new Bot(TELEGRAM_BOT_TOKEN);

// Команды
bot.command('start', handleStart);
bot.command('orders', handleOrders);
bot.command('referral', handleReferral);
bot.command('help', handleHelp);

// Callbacks (кнопки)
bot.on('callback_query:data', async (ctx) => {
  const action = ctx.callbackQuery.data;
  
  if (action.startsWith('order_')) {
    handleOrderCallback(ctx);
  } else if (action.startsWith('pay_')) {
    handlePaymentCallback(ctx);
  }
});

// Платежи
bot.on('pre_checkout_query', handlePreCheckout);
bot.on('successful_payment', handleSuccessfulPayment);

export default webhookCallback(bot, 'http');
```

### Поток платежа через Telegram Stars

```
User clicks "Pay" in app
  ↓
POST /api/orders → sendInvoice(telegramId, ...)
  ↓
const invoice = await bot.api.sendInvoice(telegramId, {
  title: "Заказ #456",
  description: "3x товара",
  payload: "order_456",
  provider_token: "",  // "" для Telegram Stars
  currency: "XTR",     // XTR = Telegram Stars
  prices: [
    { label: "Сумма", amount: 500 }
  ]
});
  ↓
User presses "Pay"
  ↓
Telegram Bot ← pre_checkout_query
  ↓
handlePreCheckout: Verify order exists
  ↓
Telegram Bot ← successful_payment
  ↓
handleSuccessfulPayment:
  1. UPDATE orders SET status = 'paid'
  2. Send confirmation to user
  3. Notify admin
```

---

## 💾 Структура БД

### Основные таблицы

#### `users`
```sql
id SERIAL PRIMARY KEY
telegram_id BIGINT UNIQUE
first_name VARCHAR(255)
username VARCHAR(255)
role ENUM('customer', 'seller', 'manager', 'admin', 'super_admin')
phone VARCHAR(20)
email VARCHAR(255)
created_at TIMESTAMP
updated_at TIMESTAMP
```

#### `products`
```sql
id SERIAL PRIMARY KEY
name VARCHAR(255) NOT NULL
description TEXT
price DECIMAL(10,2) NOT NULL
stock INTEGER NOT NULL
image_url VARCHAR(255)
category_id INTEGER REFERENCES categories(id)
is_active BOOLEAN DEFAULT true
deleted_at TIMESTAMP NULL  -- soft delete
created_at TIMESTAMP
updated_at TIMESTAMP
```

#### `orders`
```sql
id SERIAL PRIMARY KEY
user_telegram_id BIGINT REFERENCES users(telegram_id)
status ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded')
total DECIMAL(10,2)
delivery_type ENUM('pickup', 'courier')
address TEXT
created_at TIMESTAMP
paid_at TIMESTAMP NULL
shipped_at TIMESTAMP NULL
delivered_at TIMESTAMP NULL
```

#### `order_items`
```sql
id SERIAL PRIMARY KEY
order_id INTEGER REFERENCES orders(id)
product_id INTEGER REFERENCES products(id)
quantity INTEGER
price DECIMAL(10,2)  -- цена в момент заказа
```

#### `audit_log`
```sql
id SERIAL PRIMARY KEY
user_telegram_id BIGINT
action VARCHAR(50)  -- 'DELETE', 'UPDATE', 'INSERT'
table_name VARCHAR(100)
record_id INTEGER
details JSONB
created_at TIMESTAMP
```

### Индексы для производительности

```sql
CREATE INDEX idx_orders_user_id ON orders(user_telegram_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_cart_items_user_id ON cart_items(user_telegram_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
```

---

## 🚀 Кэширование

### SWR (Stale-While-Revalidate)

**Клиент-сторе**:

```typescript
// lib/useSWR.ts
const SWR_CONFIG = {
  products: {
    revalidateOnFocus: false,
    dedupInterval: 60000,      // 1 min
    focusThrottleInterval: 300000
  },
  orders: {
    revalidateOnFocus: false,
    dedupInterval: 30000       // 30 sec
  }
};

export function useProducts() {
  return useSWR('/api/products', fetcher, SWR_CONFIG.products);
}
```

**Кэширование на уровне БД**:

Пока не реализовано, но можно добавить Redis для:
- Список товаров (кэш на 5 минут)
- Профиль пользователя (кэш на 10 минут)
- Аналитика (кэш на 1 час)

---

## 🔒 Безопасность

### 1. HMAC-SHA256 верификация

Все API запросы включают initData Telegram, который подписан ботом.

```typescript
// Проверка в каждом обработчике
if (!validateTelegramInitData(req.headers['x-init-data'])) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### 2. Проверка принадлежности данных

```typescript
// Пользователь может видеть только свои заказы
const { telegramId } = getTelegramIdFromRequest(req);
const order = await query(
  'SELECT * FROM orders WHERE id = $1 AND user_telegram_id = $2',
  [orderId, telegramId]
);

if (!order.rows.length) {
  return res.status(404).json({ error: 'Not found' });
}
```

### 3. Защита от SQL инъекций

```typescript
// ✅ Безопасно (параметризованные запросы)
await query('SELECT * FROM users WHERE id = $1', [userId]);

// ❌ ОПАСНО (не использовать!)
await query(`SELECT * FROM users WHERE id = ${userId}`);
```

### 4. Rate limiting

```typescript
// Защита критичных эндпоинтов
const handler = rateLimit(actualHandler, 'order');
// Лимит: 10 запросов в минуту на одного пользователя
```

### 5. Soft delete

```typescript
// DELETE → UPDATE is_active = false
// Данные сохраняются для аудита
const { deleted_at } = await soft_delete_product(productId);
```

### 6. Роли и permissions

```typescript
// Админ-эндпоинты требуют проверки роли
export default requireRole('admin')(handler);

// Проверка на бэкенде, не на фронтенде!
```

---

## 📊 Performance Tips

1. **Пагинация**: LIMIT/OFFSET на каждый список (max 100 items)
2. **Индексы**: На columns в WHERE, ORDER BY, JOIN
3. **SWR кэш**: Деdup 60сек, не реvalidate on focus
4. **Lazy loading**: Компоненты с dynamic() в Next.js
5. **ISR**: `revalidate: 60` для статичных страниц
6. **Compression**: gzip для JSON responses (Next.js по умолчанию)

---

**Версия**: 1.0.0  
**Дата обновления**: 2026-04-04
