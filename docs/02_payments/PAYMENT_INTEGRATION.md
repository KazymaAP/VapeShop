# 💳 Интеграция платежей Telegram Stars

## Обзор

Система платежей Telegram Stars позволяет пользователям оплачивать заказы внутри Telegram, используя встроенную валюту — звёзды (⭐️).

## Архитектура

### Поток оплаты:

```
Пользователь в Mini App
    ↓
Создаёт заказ (POST /api/orders)
    ↓
Заказ создаётся со статусом 'pending' (ожидание оплаты)
    ↓
Бот отправляет инвойс с кнопкой оплаты
    ↓
Пользователь нажимает "Оплатить"
    ↓
Telegram Bot API проверяет платёж (pre_checkout_query)
    ↓
Пользователь подтверждает оплату
    ↓
Bot получает successful_payment callback
    ↓
Заказ переходит в статус 'new', генерируется 6-значный код
    ↓
Админ/менеджер комплектует заказ
    ↓
Курьер/покупатель проверяет 6-значный код (POST /api/orders/verify-code)
    ↓
Заказ переходит в статус 'done'
```

## Статусы заказа

| Статус      | Описание                      | Может быть отменён? |
| ----------- | ----------------------------- | ------------------- |
| `pending`   | Ожидание оплаты               | ✅ Да (покупатель)  |
| `new`       | Оплачен, ожидает комплектации | ✅ Да (админ)       |
| `confirmed` | Подтвержден менеджером        | ✅ Да (админ)       |
| `readyship` | Готов к отправке              | ⚠️ Нет              |
| `shipped`   | Отправлен                     | ❌ Нет              |
| `done`      | Завершён (код проверен)       | ❌ Нет              |
| `cancelled` | Отменён                       | ❌ Нет (финальный)  |

## Файлы в системе

### API эндпоинты

#### 1. `pages/api/orders.ts` — Создание заказа и отправка инвойса

**POST /api/orders**

Request:

```json
{
  "telegram_id": 123456789,
  "items": [
    {
      "product_id": "uuid-1",
      "name": "Vape Liquid 30ML",
      "price": 10,
      "quantity": 2
    }
  ],
  "delivery_method": "courier",
  "delivery_date": "2026-04-03",
  "address": "ул. Ленина, д. 1, кв. 5",
  "promo_code": "SPRING20",
  "discount": 5
}
```

Response (успех):

```json
{
  "order_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "pending",
  "message": "Инвойс отправлен. Ожидайте оплаты."
}
```

Response (ошибка):

```json
{
  "error": "Missing required fields"
}
```

**Что происходит:**

1. Валидирует данные заказа
2. Создаёт заказ в БД со статусом `pending`
3. Добавляет товары в таблицу `order_items`
4. Уменьшает остаток товаров на складе
5. Очищает корзину пользователя
6. Отправляет инвойс через Telegram Bot API
7. Возвращает ID заказа

#### 2. `pages/api/orders/verify-code.ts` — Проверка 6-значного кода

**POST /api/orders/verify-code**

Request:

```json
{
  "order_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "code_6digit": 123456
}
```

Response (успех):

```json
{
  "success": true,
  "message": "✅ Заказ #a1b2c3d4 успешно завершён!",
  "order": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "done",
    "total": 25,
    "created_at": "2026-04-02T15:30:00Z",
    "updated_at": "2026-04-02T16:00:00Z"
  }
}
```

Response (ошибка):

```json
{
  "success": false,
  "message": "Неверный код доставки"
}
```

**Что происходит:**

1. Валидирует формат кода (6-значное число)
2. Находит заказ по ID
3. Проверяет, что код совпадает
4. Проверяет, что код не истёк (24 часа)
5. Обновляет статус заказа на `done`
6. Очищает код (устанавливает NULL)
7. Возвращает подтвердение

### Обработчики Bot

#### 3. `lib/bot/payments.ts` — Обработка платежей

**`handlePreCheckout(ctx: Context)`**

Срабатывает при попытке пользователя оплатить инвойс.

**Что делает:**

- Проверяет, что заказ существует и находится в статусе `pending`
- Если проверка успешна, подтверждает возможность оплаты
- Если ошибка, отклоняет платёж с сообщением об ошибке

**`handlePaymentSuccess(ctx: Context)`**

Срабатывает после успешной оплаты инвойса.

**Что делает:**

1. Извлекает информацию о платеже (order_id, сумма)
2. Проверяет, что заказ ещё не оплачен
3. Генерирует 6-значный код (100000-999999)
4. Обновляет статус заказа на `new`
5. Сохраняет код и время истечения (24 часа)
6. Отправляет пользователю сообщение с кодом
7. Отправляет уведомление админам
8. Начисляет реферальные бонусы (если применимо)

### Утилиты фронтенда

#### 4. `lib/utils/payments.ts` — Функции для работы с платежами

```typescript
// Создание заказа
await createOrderWithPayment(telegram_id, items, 'courier', '2026-04-03', 'Адрес', 'SPRING20', 5);

// Проверка кода
await verifyDeliveryCode(order_id, 123456);

// Форматирование суммы
formatStars(100); // "100 ⭐️"

// Получение информации о заказе
await getOrderInfo(order_id);

// Отмена заказа
await cancelOrder(order_id, telegram_id);
```

## Установка и конфигурация

### 1. Требования к окружению

Убедитесь, что в `.env.local` установлены:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklmnoPQRstuvWXYZabcdefg
WEBAPP_URL=https://your-app.vercel.app
ADMIN_TELEGRAM_IDS=123456789,987654321
```

### 2. Миграция БД

Выполните SQL скрипт из `db/migrations/002_telegram_stars_payment.sql`:

```bash
# Через Neon Console или psql:
psql postgresql://user:password@host/vapeshop < db/migrations/002_telegram_stars_payment.sql
```

Убедитесь, что таблица `orders` имеет все необходимые поля:

- `status` (VARCHAR)
- `paid_at` (TIMESTAMP)
- `code_6digit` (INT)
- `code_expires_at` (TIMESTAMP)

### 3. Настройка бота

Убедитесь, что у бота есть права на отправку инвойсов.

В Telegram BotFather выполните:

```
/setpaymentprovider
```

Для **Telegram Stars** не нужно указывать сторонний провайдера платежей — используется встроенная система Stars.

### 4. Webhook конфигурация

Убедитесь, что webhook бота указан на `/api/bot`:

```bash
curl -X POST \
  https://api.telegram.org/bot<TOKEN>/setWebhook \
  -d url=https://your-app.vercel.app/api/bot \
  -d allowed_updates='["message","callback_query","pre_checkout_query"]'
```

## Примеры использования

### Frontend (React/Next.js)

```typescript
import { createOrderWithPayment, verifyDeliveryCode } from '@/lib/utils/payments';
import { useTelegramWebApp } from '@/lib/telegram';

export default function CheckoutPage() {
  const { user } = useTelegramWebApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheckout = async (items) => {
    setLoading(true);
    setError('');

    try {
      const result = await createOrderWithPayment(
        user.id,
        items,
        'courier',
        '2026-04-03',
        'ул. Ленина, 1',
        null,
        0
      );

      // Инвойс отправлен, ждём оплаты
      alert(`Заказ #${result.order_id.slice(0, 8)} создан. Проверьте бота для оплаты.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => handleCheckout(items)} disabled={loading}>
        {loading ? 'Оформление...' : 'Оформить заказ'}
      </button>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
```

### Проверка кода доставки (для курьера)

```typescript
const [code, setCode] = useState('');
const [orderId, setOrderId] = useState('');

const handleVerifyCode = async () => {
  try {
    const result = await verifyDeliveryCode(orderId, parseInt(code));
    if (result.success) {
      alert('✅ Заказ завершён!');
    }
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
};

return (
  <div>
    <input
      type="text"
      placeholder="ID заказа"
      value={orderId}
      onChange={(e) => setOrderId(e.target.value)}
    />
    <input
      type="text"
      placeholder="6-значный код"
      value={code}
      onChange={(e) => setCode(e.target.value)}
    />
    <button onClick={handleVerifyCode}>Проверить код</button>
  </div>
);
```

## Тестирование

### 1. Тест в Telegram (действительно работающие звёзды)

1. Откройте Mini App в Telegram
2. Добавьте товары в корзину
3. Перейдите к оплате
4. Введите данные доставки
5. Нажмите "Оформить заказ"
6. В боте появится кнопка оплаты
7. Нажмите "💳 Оплатить X ⭐️"
8. Подтвердите оплату
9. Получите 6-значный код

### 2. Тест кода доставки

1. Сразу после оплаты получите код, например: `123456`
2. Передайте код курьеру или используйте тест-интерфейс
3. POST `/api/orders/verify-code`
4. Заказ перейдёт в статус `done`

### 3. Проверка статуса в БД

```sql
SELECT id, status, paid_at, code_6digit, code_expires_at FROM orders ORDER BY created_at DESC LIMIT 5;
```

## Обработка ошибок

### Ошибка: "Invoice payload not found"

**Причина:** Order ID не совпадает между заказом и платежом.

**Решение:** Убедитесь, что `payload` в инвойсе совпадает с `order.id`.

### Ошибка: "Заказ не найден или уже оплачен"

**Причина:**

- Заказ удалён или не существует
- Заказ уже оплачен (статус не `pending`)
- Неверный user_telegram_id

**Решение:** Проверьте логи БД и убедитесь, что заказ создан корректно.

### Ошибка: "Код доставки истёк"

**Причина:** Прошло более 24 часов после оплаты.

**Решение:** Заказ можно вручную завершить через админ-панель.

## Безопасность

### ✅ Реализовано

- ✅ Проверка статуса заказа перед оплатой
- ✅ Проверка собственника заказа (user_telegram_id)
- ✅ Верификация кода (только 6-значный число)
- ✅ Время жизни кода (24 часа)
- ✅ Перевод товаров в корзину → заказ → оплату

### ⚠️ Требует доработки

- ⚠️ Валидация инвойс-ссылки (убедитесь, что используется официальный API)
- ⚠️ Логирование всех операций платежа в `payment_logs`
- ⚠️ Дополнительная проверка подписи initData от Telegram WebApp
- ⚠️ Rate limiting на API эндпоинты

### ❌ Не реализовано

- ❌ Refund (возврат денег) — требует дополнительной логики
- ❌ Частичная оплата — используется либо всё, либо ничего
- ❌ Автоматическое уведомление админов в Telegram (используется base Console.log)

## Развёртывание

### 1. На Vercel

Система работает "из коробки" с Vercel благодаря Next.js API Routes.

1. Загрузьте код на GitHub
2. Подключите Vercel к репозиторию
3. Установите environment variables в Vercel dashboard
4. Деплой автоматическается

### 2. Локально для тестирования

```bash
npm run dev

# Exposing local server to Telegram (используйте ngrok)
ngrok http 3000

# Установите webhook
curl -X POST \
  https://api.telegram.org/bot<TOKEN>/setWebhook \
  -d url=https://<ngrok-url>/api/bot \
  -d allowed_updates='["message","callback_query","pre_checkout_query"]'
```

## Дополнительно

### Реферальные бонусы

Если пользователь пришёл по реферальной ссылке (`referred_by` не NULL), то:

- 10% от суммы заказа начисляется рефереру в виде бонусов
- Бонусы складываются в `bonus_balance` пользователя
- Бонусы можно использовать при следующей покупке (требует доработки в корзине)

### Логирование платежей

Все платежи логируются в таблицу `payment_logs` для анализа и отладки.

```sql
SELECT * FROM payment_logs ORDER BY created_at DESC LIMIT 20;
```

### Отмена заказа

Заказ можно отменить только если статус `pending` или `new`:

```typescript
// Через API
DELETE /api/orders/:id?telegram_id=123456789

// Через бота
/cancel_order:order-id (callback query)
```

При отмене:

1. Статус меняется на `cancelled`
2. Товары возвращаются на склад
3. Пользователю отправляется подтверждение в боте

## Полезные команды

```bash
# Проверить логи платежей
psql -d vapeshop -c "SELECT * FROM payment_logs ORDER BY created_at DESC LIMIT 10;"

# Проверить незавершённые заказы
psql -d vapeshop -c "SELECT id, user_telegram_id, status, created_at FROM orders WHERE status = 'pending' OR status = 'new';"

# Проверить истёкшие коды
psql -d vapeshop -c "SELECT id, code_expires_at FROM orders WHERE code_expires_at < NOW() AND status = 'new';"
```

## Ссылки и ресурсы

- [Telegram Bot API — Payments](https://core.telegram.org/bots/payments)
- [Telegram Stars](https://core.telegram.org/bots/payments-star-bot)
- [grammY Documentation](https://grammy.dev/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

---

**Версия документации:** 1.0  
**Дата обновления:** 2 апреля 2026
