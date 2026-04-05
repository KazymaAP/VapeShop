# 🚀 Копируй-Вставляй: Система Уведомлений

Готовые куски кода для быстрого внедрения.

## 1️⃣ Интеграция в pages/api/orders.ts

### Добавьте импорты в начало файла

```typescript
import { notifyAdminsNewOrder, notifyBuyerOrderCreated } from '../../lib/notifications';
```

### Скопируйте этот код ПОСЛЕ успешной оплаты (когда status = 'new')

```typescript
// Получаем информацию о заказе и пользователе для уведомлений
const orderResult = await query(
  `SELECT id, total_price, user_telegram_id FROM orders WHERE id = $1`,
  [orderId]
);
const order = orderResult.rows[0];

const userResult = await query(`SELECT username FROM users WHERE telegram_id = $1`, [telegramId]);
const user = userResult.rows[0];

// Отправляем уведомление администраторам
try {
  await notifyAdminsNewOrder(
    order.id,
    order.total_price,
    user?.username || 'Unknown',
    items.length
  );
} catch (err) {
  console.error('Notify admins error:', err);
}

// Отправляем уведомление покупателю
try {
  await notifyBuyerOrderCreated(telegramId, order.id, order.total_price);
} catch (err) {
  console.error('Notify buyer error:', err);
}
```

---

## 2️⃣ Инициализация Bot в pages/api/bot.ts

### Добавьте импорт

```typescript
import { setBotInstance } from '../../lib/notifications';
```

### Добавьте инициализацию (сразу после создания bot)

```typescript
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

// ← ДОБАВЬТЕ ЭТО
setBotInstance(bot);
// ↑ ДОБАВЬТЕ ЭТО

// Остальной код...
bot.command('start', handleStart);
```

---

## 3️⃣ Выполнить SQL миграцию

Выполните в Neon PostgreSQL:

```sql
-- Миграция 003: Система уведомлений

CREATE TABLE IF NOT EXISTS notification_settings (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT TRUE,
  target_role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO notification_settings (event_type, is_enabled, target_role)
VALUES
  ('order_new_admin', true, 'admin'),
  ('order_status_changed_buyer', true, 'buyer'),
  ('order_ready_ship', true, 'buyer'),
  ('abandoned_cart', true, 'buyer')
ON CONFLICT (event_type) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_notification_settings_event_type
  ON notification_settings(event_type);

-- Таблица истории
CREATE TABLE IF NOT EXISTS notification_history (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  message_text TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'sent',
  error_message TEXT,
  FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_history_user
  ON notification_history(user_telegram_id);

-- Таблица брошенных корзин
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL UNIQUE,
  total_items INT NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  abandoned_at TIMESTAMP DEFAULT NOW(),
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMP,
  recovery_clicked BOOLEAN DEFAULT FALSE,
  recovered_at TIMESTAMP,
  FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_user
  ON abandoned_carts(user_telegram_id);
```

---

## 4️⃣ Добавить переменные в .env.local

```env
# Опционально для cron (если используете)
CRON_SECRET=your_super_secret_key_change_me
```

---

## 5️⃣ Настроить Cron (если на Vercel)

Добавьте в `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/abandoned-cart",
      "schedule": "0 * * * *"
    }
  ]
}
```

Или если нет такого файла, создайте его в корне:

```json
{
  "crons": [
    {
      "path": "/api/cron/abandoned-cart",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

## 6️⃣ Быстрые тесты через curl

### Тест 1: Изменить статус заказа

```bash
curl -X PATCH http://localhost:3000/api/orders/550e8400-e29b-41d4-a716-446655440000/status \
  -H "X-Telegram-Id: YOUR_ADMIN_ID" \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed"}'
```

### Тест 2: Получить настройки уведомлений

```bash
curl -X GET http://localhost:3000/api/admin/settings/notifications \
  -H "X-Telegram-Id: YOUR_ADMIN_ID"
```

### Тест 3: Отключить напоминания о корзине

```bash
curl -X PUT http://localhost:3000/api/admin/settings/notifications \
  -H "X-Telegram-Id: YOUR_ADMIN_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type":"abandoned_cart",
    "is_enabled":false
  }'
```

### Тест 4: Запустить cron

```bash
curl -X GET http://localhost:3000/api/cron/abandoned-cart?token=your_super_secret_key_change_me
```

---

## 7️⃣ React компонент админки

Файл уже создан: `pages/admin/settings/notifications.tsx`

Просто откройте: http://localhost:3000/admin/settings/notifications

---

## 8️⃣ Отправить тестовое уведомление вручную

Создайте временный файл `test-notification.ts`:

```typescript
import { sendNotification } from './lib/notifications';

async function test() {
  const success = await sendNotification(
    YOUR_TELEGRAM_ID,
    '🔔 Это тестовое уведомление от VapeShop!',
    undefined,
    'test'
  );

  console.log(success ? '✅ Отправлено!' : '❌ Ошибка');
}

test().catch(console.error);
```

Запустите: `npx ts-node test-notification.ts`

---

## 🔍 SQL для проверки

```sql
-- Проверить настройки
SELECT * FROM notification_settings;

-- Проверить логи отправки
SELECT * FROM notification_history ORDER BY sent_at DESC LIMIT 10;

-- Проверить брошенные корзины
SELECT * FROM abandoned_carts;

-- Статистика за неделю
SELECT event_type, COUNT(*) as sent,
       COUNT(CASE WHEN status='failed' THEN 1 END) as failed
FROM notification_history
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY event_type;
```

---

## ❌ Если что-то не работает

### Уведомления не отправляются

1. Проверьте bot инициализирован:

   ```typescript
   // В pages/api/bot.ts
   setBotInstance(bot); // Это ДОЛЖНО быть
   ```

2. Проверьте логи:

   ```sql
   SELECT * FROM notification_history WHERE status='failed';
   ```

3. Проверьте что админ существует:
   ```sql
   SELECT telegram_id, role FROM users WHERE role='admin';
   ```

### Cron не работает

1. На Vercel - проверьте `vercel.json`
2. На self-hosted - тестируйте через curl с заголовком
3. Проверьте логи сервера

### Админ-панель не показывает статистику

1. Проверьте что таблица `notification_history` есть
2. Убедитесь что уведомления отправлялись (есть записи в таблице)

---

## 📋 Финальный чеклист

- [ ] Импорты добавлены в orders.ts
- [ ] Код уведомлений добавлен в orders.ts
- [ ] setBotInstance вызван в bot.ts
- [ ] SQL миграция выполнена
- [ ] CRON_SECRET добавлен в .env (если нужно)
- [ ] vercel.json обновлен (если на Vercel)
- [ ] Тесты curl прошли
- [ ] Админ-панель работает
- [ ] Статистика отображается

**Всё готово!** Система уведомлений работает. 🎉
