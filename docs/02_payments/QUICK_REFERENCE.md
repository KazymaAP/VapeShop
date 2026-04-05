# 🚀 QUICK REFERENCE — Платежи Telegram Stars

## Файлы для копирования

### 1️⃣ Обновите `pages/api/orders.ts`

- ✅ Замените ВЕСЬ файл на реализацию из этой сессии
- ✅ Проверьте импорт `Bot` из `grammy`

### 2️⃣ Обновите `pages/api/bot.ts`

- ✅ Замените ВЕСЬ файл на реализацию из этой сессии
- ✅ Добавлен import `{ query } from '../../lib/db'`

### 3️⃣ Обновите `lib/bot/payments.ts`

- ✅ Замените ВЕСЬ файл на реализацию из этой сессии
- ✅ Две функции: `handlePreCheckout` и `handlePaymentSuccess`

### 4️⃣ Создайте `pages/api/orders/verify-code.ts`

- ✅ Новый файл (скопируйте из этой сессии)
- ✅ Проверяет 6-значный код и меняет статус на 'done'

### 5️⃣ Создайте `lib/utils/payments.ts`

- ✅ Новый файл (скопируйте из этой сессии)
- ✅ Утилиты для фронтенда

### 6️⃣ Выполните SQL миграцию

- ✅ Файл: `db/migrations/002_telegram_stars_payment.sql`
- ✅ Добавляет поля в таблицу `orders`

### 7️⃣ Обновите `pages/cart.tsx` (ВАЖНО!)

- ⚠️ НЕ ЗАМЕНЯЙТЕ весь файл!
- ✅ ОБЪЕДИНИТЕ существующий код с новым (см. CART_UPDATE_EXAMPLE.tsx)
- ✅ Добавьте импорт `createOrderWithPayment` из `lib/utils/payments`
- ✅ Обновите функцию `handleCheckout()`

---

## Ключевые функции

### API эндпоинты

```typescript
// 1. Создание заказа
POST /api/orders
{
  telegram_id: number,
  items: Array<{product_id, name, price, quantity}>,
  delivery_method: 'pickup' | 'courier',
  delivery_date: string,
  address: string | null,
  promo_code?: string,
  discount?: number
}

// Ответ: { order_id, status: 'pending', message }

// 2. Проверка кода
POST /api/orders/verify-code
{
  order_id: string,
  code_6digit: number
}

// Ответ: { success: boolean, message, order? }
```

### Фронтенд функции

```typescript
import { createOrderWithPayment, verifyDeliveryCode } from '@/lib/utils/payments';

// 1. Создание заказа
const result = await createOrderWithPayment(
  telegram_id,
  items,
  'courier',
  '2026-04-03',
  'ул. Ленина, 1',
  'SPRING20',
  5
);

// 2. Проверка кода
const result = await verifyDeliveryCode(order_id, 123456);
if (result.success) {
  console.log('✅ Заказ завершён');
}
```

### Bot обработчики

```typescript
// В /api/bot.ts уже настроены:
bot.on('pre_checkout_query', handlePreCheckout);
bot.on('message:successful_payment', handlePaymentSuccess);

// handlePreCheckout — проверяет платёж
// handlePaymentSuccess — генерирует код и обновляет БД
```

---

## Переменные окружения

```env
TELEGRAM_BOT_TOKEN=123456:ABC...
WEBAPP_URL=https://your-app.vercel.app
ADMIN_TELEGRAM_IDS=123456789,987654321
NEON_DATABASE_URL=postgresql://...
```

---

## SQL запросы для проверки

```sql
-- Все заказы
SELECT id, status, paid_at, code_6digit FROM orders ORDER BY created_at DESC;

-- Ожидающие оплаты
SELECT * FROM orders WHERE status = 'pending';

-- Оплачены, но код не проверен
SELECT * FROM orders WHERE status = 'new';

-- Завершённые заказы
SELECT * FROM orders WHERE status = 'done';

-- Логи платежей
SELECT * FROM payment_logs ORDER BY created_at DESC;
```

---

## Webhook установка

```bash
# Production URL
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -d url=https://your-app.vercel.app/api/bot \
  -d allowed_updates='["message","callback_query","pre_checkout_query"]'

# Локально (ngrok)
ngrok http 3000
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -d url=https://<ngrok-id>.ngrok.io/api/bot \
  -d allowed_updates='["message","callback_query","pre_checkout_query"]'
```

---

## Тестовые сценарии

### ✅ Сценарий 1: Успешная оплата

1. Добавьте товары в корзину
2. Заполните доставку
3. Нажмите "Оформить"
4. В боте нажмите кнопку оплаты
5. Подтвердите оплату
6. Получите 6-значный код
7. ✅ Заказ в статусе `new`

### ✅ Сценарий 2: Проверка кода

1. Получите код из сообщения бота
2. POST `/api/orders/verify-code` с кодом
3. ✅ Статус заказа `done`

### ✅ Сценарий 3: Отмена заказа

1. Создайте заказ (статус `pending`)
2. Нажмите кнопку "❌ Отменить" в боте
3. ✅ Статус `cancelled`, товары на складе

---

## Структура БД

```sql
orders:
  id (UUID)
  user_telegram_id (BIGINT)
  status (VARCHAR) -- pending, new, confirmed, readyship, shipped, done, cancelled
  total (DECIMAL)
  paid_at (TIMESTAMP) -- время оплаты
  code_6digit (INT) -- 6-значный код
  code_expires_at (TIMESTAMP) -- истечение кода (24h)
  delivery_method (VARCHAR)
  delivery_date (DATE)
  address (TEXT)
  created_at (TIMESTAMP)
  updated_at (TIMESTAMP)

payment_logs:
  id (UUID)
  order_id (UUID)
  user_telegram_id (BIGINT)
  status (VARCHAR)
  amount (INT)
  error_message (TEXT)
  created_at (TIMESTAMP)
```

---

## Ошибки и решения

| Ошибка                          | Причина                            | Решение                         |
| ------------------------------- | ---------------------------------- | ------------------------------- |
| `sendInvoice is not a function` | Старая версия grammy               | `npm install grammy@latest`     |
| `Webhook 404`                   | URL вебхука неверен                | Проверьте getWebhookInfo        |
| `Invoice payload not found`     | order.id не совпадает              | Убедитесь payload это order.id  |
| `Заказ не найден`               | Заказ удален или статус не pending | Проверьте БД                    |
| `Код истёк`                     | Прошло >24 часов                   | Только 24 часа с момента оплаты |

---

## Полезные команды

```bash
# Проверка webhook
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo | jq

# Удаление webhook (для переустановки)
curl -X POST https://api.telegram.org/bot<TOKEN>/deleteWebhook

# Локальное тестирование
npm run dev
ngrok http 3000

# Проверка БД (psql)
psql -d vapeshop -c "SELECT * FROM orders LIMIT 5;"
```

---

## Чек-лист перед production

- [ ] Миграция БД выполнена
- [ ] Все файлы обновлены
- [ ] pages/cart.tsx объединён с новым кодом
- [ ] Webhook установлен
- [ ] Тестирование пройдено
- [ ] Логи проверены
- [ ] Сообщения админам работают
- [ ] Коды генерируются и проверяются
- [ ] Рефералки считаются

---

## 📚 Полная документация

- **IMPLEMENTATION_CHECKLIST.md** — пошаговый гайд (прочитайте первым!)
- **PAYMENT_INTEGRATION.md** — полное описание системы
- **PAYMENT_IMPLEMENTATION_SUMMARY.md** — итоговый отчёт

---

**Версия:** 1.0  
**Дата:** 2 апреля 2026  
**Статус:** ✅ Готово к production
