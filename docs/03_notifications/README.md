# 🔔 Система Уведомлений VapeShop (P3) - Полное Руководство

**Версия:** 1.0  
**Статус:** ✅ Готово  
**Дата:** 2024

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Архитектура](#архитектура)
3. [Компоненты](#компоненты)
4. [Типы уведомлений](#типы-уведомлений)
5. [Установка и настройка](#установка-и-настройка)
6. [Использование](#использование)
7. [API Endpoints](#api-endpoints)
8. [Интеграция с заказами](#интеграция-с-заказами)
9. [Кроны и задачи](#кроны-и-задачи)
10. [Примеры](#примеры)

---

## 🎯 Обзор

Система уведомлений VapeShop обеспечивает:

- ✅ Отправку сообщений через Telegram Bot API
- ✅ Управление типами уведомлений (включение/отключение)
- ✅ Логирование всех отправленных сообщений
- ✅ Отслеживание брошенных корзин
- ✅ Автоматические напоминания
- ✅ Разные целевые аудитории (admin, manager, seller, buyer)

## 🏗️ Архитектура

```
┌─ Событие в системе (новый заказ, статус изменился)
│
├─ Проверка: включено ли уведомление?
│  └─ Если отключено → SKIP
│
├─ Получение целевых пользователей по роли
│  └─ SELECT FROM users WHERE role = target_role
│
├─ Отправка сообщения через Telegram Bot API
│  └─ bot.api.sendMessage(user_id, text, extra)
│
└─ Логирование в notification_history
   ├─ Статус: sent/failed
   ├─ Время отправки
   └─ Текст сообщения
```

## 🔧 Компоненты

### 1. lib/notifications.ts (11.8 KB)

Основной модуль уведомлений

**Экспортируемые функции:**

- `sendNotification(telegramId, text, extra?, eventType?)` - отправить сообщение одному пользователю
- `broadcastNotification(role, text, extra?, eventType?)` - отправить сообщение всем с ролью
- `notifyAdminsNewOrder(orderId, totalPrice, username, itemsCount)` - новый заказ
- `notifyBuyerOrderCreated(telegramId, orderId, totalPrice)` - заказ оплачен
- `notifyBuyerOrderStatus(telegramId, orderId, newStatus, code6digit?)` - статус изменился
- `notifyAbandonedCart(telegramId, itemsCount, totalPrice)` - напоминание о корзине
- `getNotificationStats(daysBack?)` - статистика

### 2. db/migrations/003_notification_settings.sql

SQL миграция для создания таблиц

**Таблицы:**

- `notification_settings` - настройки типов уведомлений
- `notification_history` - логи отправленных сообщений
- `abandoned_carts` - отслеживание брошенных корзин

### 3. API Endpoints

#### GET /api/admin/settings/notifications

Получить все настройки и статистику

#### POST /api/admin/settings/notifications

Сохранить обновления для нескольких настроек

#### PUT /api/admin/settings/notifications

Обновить одну конкретную настройку

#### PATCH /api/orders/[id]/status

Изменить статус заказа и отправить уведомление

#### GET /api/cron/abandoned-cart

Cron задача для напоминаний о брошенных корзинах

### 4. React компонент

`pages/admin/settings/notifications.tsx` - интерфейс для управления

---

## 📬 Типы уведомлений

### 1. order_new_admin

**Когда:** После оплаты заказа  
**Кому:** Всем админам  
**Текст:** 🆕 Новый заказ #{ID}...  
**Кнопка:** Просмотреть заказ в админке

```
🆕 Новый заказ #550e8400
👤 От: @username
💰 Сумма: 1250 ⭐️
📦 Товаров: 3 шт.
```

### 2. order_status_changed_buyer

**Когда:** Статус заказа изменился на 'confirmed', 'readyship', 'shipped' или 'done'  
**Кому:** Покупателю  
**Примеры:**

- 📦 Заказ #550e8400 подтверждён
- 🚀 Заказ #550e8400 готов к выдаче. Код: 123456
- 🚚 Заказ #550e8400 передан курьеру
- ✅ Заказ #550e8400 выполнен. Спасибо за покупку!

### 3. order_ready_ship

**Когда:** Заказ готов к отправке (status = 'readyship')  
**Кому:** Покупателю  
**Особенность:** Содержит 6-значный код для курьера

```
🚀 Заказ #550e8400 готов к выдаче
Ваш код подтверждения: 123456
```

### 4. abandoned_cart

**Когда:** Корзина не обновлялась 2+ часа (cron)  
**Кому:** Покупателю  
**Кнопка:** Перейти в корзину

```
💔 У вас остались товары в корзине
📦 Товаров: 3 шт.
💰 Сумма: 1250 ⭐️
```

---

## 🚀 Установка и настройка

### Шаг 1: Выполнить миграцию БД

```sql
-- Выполните в Neon/PostgreSQL
-- Содержимое: db/migrations/003_notification_settings.sql

CREATE TABLE IF NOT EXISTS notification_settings (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT TRUE,
  target_role VARCHAR(50) NOT NULL,
  ...
);

-- ... остальные таблицы
```

### Шаг 2: Инициализировать бот в lib/notifications.ts

```typescript
// В pages/api/bot.ts ДО создания экспорта:
import { setBotInstance } from '../../lib/notifications';
setBotInstance(bot);
```

### Шаг 3: Добавить .env переменные

```env
# Обязательные (уже есть)
TELEGRAM_BOT_TOKEN=your_bot_token

# Опционально для Cron
CRON_SECRET=your_cron_secret_key
```

### Шаг 4: Установить Vercel Cron (если на Vercel)

Добавить в `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/abandoned-cart",
      "schedule": "0 * * * *" // Каждый час
    }
  ]
}
```

---

## 💻 Использование

### Отправить уведомление одному пользователю

```typescript
import { sendNotification } from '../lib/notifications';

await sendNotification(
  123456789, // telegram_id
  '✅ Ваш заказ оплачен!',
  {
    reply_markup: {
      inline_keyboard: [[{ text: '📋 Мой заказ', web_app: { url: 'https://...' } }]],
    },
  },
  'order_status_changed_buyer' // event_type для логирования
);
```

### Отправить рассылку всем админам

```typescript
import { broadcastNotification } from '../lib/notifications';

await broadcastNotification(
  'admin', // target_role
  '🆕 Новый заказ!',
  undefined,
  'order_new_admin'
);
```

### Отправить специализированное уведомление о новом заказе

```typescript
import { notifyAdminsNewOrder } from '../lib/notifications';

await notifyAdminsNewOrder(
  orderId,
  totalPrice, // в звёздах
  username, // имя покупателя
  itemsCount // количество товаров
);
```

### Отправить уведомление об изменении статуса

```typescript
import { notifyBuyerOrderStatus } from '../lib/notifications';

await notifyBuyerOrderStatus(
  telegramId,
  orderId,
  'readyship', // 'confirmed', 'readyship', 'shipped', 'done'
  '123456' // 6-digit code (опционально)
);
```

---

## 📡 API Endpoints

### GET /api/admin/settings/notifications

```bash
curl -X GET http://localhost:3000/api/admin/settings/notifications \
  -H "X-Telegram-Id: 123456789"
```

**Ответ:**

```json
{
  "settings": [
    {
      "id": 1,
      "event_type": "order_new_admin",
      "is_enabled": true,
      "target_role": "admin"
    },
    ...
  ],
  "stats": {
    "total_sent": 150,
    "total_failed": 3,
    "success_rate": "98.0"
  }
}
```

### POST /api/admin/settings/notifications

```bash
curl -X POST http://localhost:3000/api/admin/settings/notifications \
  -H "X-Telegram-Id: 123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      { "id": 1, "is_enabled": false, "target_role": "admin" },
      { "id": 2, "is_enabled": true, "target_role": "buyer" }
    ]
  }'
```

### PATCH /api/orders/[id]/status

```bash
curl -X PATCH http://localhost:3000/api/orders/550e8400/status \
  -H "X-Telegram-Id: 123456789" \
  -H "Content-Type: application/json" \
  -d '{ "status": "readyship" }'
```

**Что происходит:**

1. Изменяется status в БД
2. Логируется действие админа
3. Отправляется уведомление покупателю

### GET /api/cron/abandoned-cart

```bash
# Тестирование
curl -X GET http://localhost:3000/api/cron/abandoned-cart?token=your_cron_secret

# Или с заголовком (для Vercel)
curl -X GET http://localhost:3000/api/cron/abandoned-cart \
  -H "x-cron-secret: your_cron_secret"
```

---

## 🛒 Интеграция с заказами

### В pages/api/orders.ts после успешной оплаты

```typescript
import { notifyAdminsNewOrder, notifyBuyerOrderCreated } from '../../lib/notifications';

// После обновления статуса на 'new' (order paid)
const order = result.rows[0];
const user = await query('SELECT username FROM users WHERE telegram_id = $1', [telegramId]);

// Уведомить админов
await notifyAdminsNewOrder(
  order.id,
  order.total_price,
  user.rows[0]?.username || 'Unknown',
  orderItems.length
);

// Уведомить покупателя
await notifyBuyerOrderCreated(telegramId, order.id, order.total_price);
```

---

## ⏰ Кроны и задачи

### Abandoned Cart Cron

**Частота:** Каждый час (рекомендуется)

**Что делает:**

1. Находит корзины с последним обновлением > 2 часов назад
2. Проверяет, нет ли у пользователя активных заказов
3. Проверяет, не отправлено ли уже напоминание
4. Отправляет уведомление
5. Обновляет статус в БД

**Установка на Vercel:**

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

**Установка на self-hosted:**
Используйте unix cron:

```bash
0 * * * * curl -X GET http://yourapp.com/api/cron/abandoned-cart?token=YOUR_SECRET
```

---

## 📝 Примеры

### Пример 1: Включить/отключить тип уведомления

```typescript
// Отключить напоминания о брошенных корзинах
fetch('/api/admin/settings/notifications', {
  method: 'PUT',
  headers: {
    'X-Telegram-Id': '123456789',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    event_type: 'abandoned_cart',
    is_enabled: false,
  }),
});
```

### Пример 2: Получить статистику в React

```typescript
useEffect(() => {
  fetch('/api/admin/settings/notifications', {
    headers: { 'X-Telegram-Id': '123456789' },
  })
    .then((r) => r.json())
    .then((data) => {
      console.log('Всего отправлено:', data.stats.total_sent);
      console.log('Ошибок:', data.stats.total_failed);
      console.log('Успешность:', data.stats.success_rate + '%');
    });
}, []);
```

### Пример 3: Тестовое уведомление

```bash
# В Node.js скрипте
import { sendNotification } from './lib/notifications';

await sendNotification(
  YOUR_TELEGRAM_ID,
  '🔔 Это тестовое уведомление',
  undefined,
  'test'
);
```

---

## 🔐 Безопасность

### Защита API

- ✅ Все endpoints защищены `requireAuth()`
- ✅ Только админы могут менять настройки
- ✅ Все действия логируются в `admin_logs`

### Защита Cron

- ✅ Проверка `CRON_SECRET` для /api/cron/\*
- ✅ Rate limiting между уведомлениями (100ms)
- ✅ Graceful error handling

### Безопасность Telegram

- ✅ Используется официальный Bot API через grammY
- ✅ Никакие приватные данные не логируются
- ✅ Все сообщения парсируются как HTML

---

## 🐛 Решение проблем

### Уведомления не отправляются

1. Проверьте `TELEGRAM_BOT_TOKEN` в .env
2. Убедитесь что `setBotInstance()` вызван в bot.ts
3. Проверьте логи: `SELECT * FROM notification_history WHERE status = 'failed'`

### Cron не работает

1. На Vercel: проверьте `vercel.json`
2. На self-hosted: проверьте unix cron: `crontab -l`
3. Проверьте `CRON_SECRET` если используется
4. Тестируйте через curl с заголовком

### Письма не отправляются админам

1. Убедитесь что в БД есть пользователи с `role = 'admin'`
2. Проверьте `notification_settings` - включены ли уведомления?
3. Проверьте логи отправки

---

## 📊 Мониторинг

### SQL запросы для мониторинга

```sql
-- Статистика по типам уведомлений
SELECT event_type, COUNT(*) as count,
       COUNT(CASE WHEN status='failed' THEN 1 END) as failed
FROM notification_history
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY event_type;

-- Найти проблемы
SELECT * FROM notification_history
WHERE status = 'failed'
ORDER BY sent_at DESC
LIMIT 10;

-- Мониторить брошенные корзины
SELECT COUNT(*), COUNT(CASE WHEN reminder_sent THEN 1 END) as reminded
FROM abandoned_carts
WHERE abandoned_at >= NOW() - INTERVAL '24 hours';
```

---

## 📚 Дополнительные файлы

- `docs/03_notifications/IMPLEMENTATION_CHECKLIST.md` - чеклист внедрения
- `docs/03_notifications/COPY_PASTE_TEMPLATES.md` - готовые куски кода
- `docs/03_notifications/TROUBLESHOOTING.md` - решение проблем
- `docs/03_notifications/API_REFERENCE.md` - справка по API

---

**Система уведомлений готова к production!** ✨
