# ✅ Чек-лист внедрения платежей Telegram Stars

## Фаза 1: Подготовка базы данных (30 мин)

### 1.1 Миграция БД

- [ ] Прочитайте `db/migrations/002_telegram_stars_payment.sql`
- [ ] Выполните миграцию в Neon:
  ```bash
  psql postgresql://user:password@host/vapeshop < db/migrations/002_telegram_stars_payment.sql
  ```
- [ ] Проверьте, что таблица `orders` имеет все поля:
  ```sql
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'orders'
  ORDER BY ordinal_position;
  ```
- [ ] Убедитесь, что созданы индексы и триггеры

### 1.2 Проверка существующих таблиц

- [ ] В таблице `orders` есть поле `status` (VARCHAR)
- [ ] В таблице `orders` есть поле `paid_at` (TIMESTAMP)
- [ ] В таблице `orders` есть поле `code_6digit` (INT)
- [ ] В таблице `orders` есть поле `code_expires_at` (TIMESTAMP)
- [ ] В таблице `order_items` есть все необходимые поля
- [ ] В таблице `users` есть поле `telegram_id` (BIGINT PRIMARY KEY)
- [ ] В таблице `users` есть поле `bonus_balance` (DECIMAL)

---

## Фаза 2: Обновление кода (1-2 часа)

### 2.1 Обновление API эндпоинтов

#### ✅ Файл: `pages/api/orders.ts`

- [ ] Замените содержимое на реализацию из моих изменений
- [ ] Проверьте, что импортирует `Bot` из `grammy`
- [ ] Убедитесь, что используется `bot.api.sendInvoice()` (не `createInvoiceLink`)
- [ ] Проверьте, что отправляется сообщение пользователю с кнопкой оплаты
- [ ] Проверьте, что создаётся инвойс с правильными параметрами:
  - `title`: Заказ #{id}
  - `payload`: order.id (UUID)
  - `currency`: "XTR"
  - `prices`: [{ label: "Итого", amount: total }]

#### ✅ Новый файл: `pages/api/orders/verify-code.ts`

- [ ] Создайте этот файл (он сейчас отсутствует)
- [ ] Скопируйте содержимое из моей реализации
- [ ] Проверьте, что обработчик POST работает корректно
- [ ] Убедитесь, что проверяет:
  - Совпадение кода
  - Время истечения кода (24 часа)
  - Статус заказа (только 'new')

#### ✅ Файл: `pages/api/bot.ts`

- [ ] Замените содержимое на реализацию из моих изменений
- [ ] Добавьте обработчик для callback `cancel_order:`
- [ ] Проверьте, что импортирует `query` из `lib/db`
- [ ] Убедитесь, что обработчик отмены возвращает товары на склад

### 2.2 Обновление обработчиков платежей

#### ✅ Файл: `lib/bot/payments.ts`

- [ ] Замените содержимое на реализацию из моих изменений
- [ ] Проверьте функцию `handlePreCheckout`:
  - Проверяет статус заказа ('pending')
  - Подтверждает платёж (`answerPreCheckoutQuery(true)`)
- [ ] Проверьте функцию `handlePaymentSuccess`:
  - Генерирует 6-значный код
  - Обновляет статус на 'new'
  - Отправляет сообщение пользователю с кодом
  - Отправляет уведомление админам
  - Начисляет реферальные бонусы

### 2.3 Создание утилит

#### ✅ Новый файл: `lib/utils/payments.ts`

- [ ] Создайте этот файл
- [ ] Скопируйте содержимое из моей реализации
- [ ] Проверьте функции:
  - `createOrderWithPayment()` — создание заказа
  - `verifyDeliveryCode()` — проверка кода
  - `formatStars()` — форматирование
  - `getOrderInfo()`, `cancelOrder()` — вспомогательные

### 2.4 Обновление фронтенда

#### ⚠️ Файл: `pages/cart.tsx` (требует ручного обновления)

- [ ] **НЕ ЗАМЕНЯЙТЕ** весь файл, а **ОБЪЕДИНИТЕ** с существующим:
  1. Импортируйте `createOrderWithPayment` из `lib/utils/payments`
  2. Добавьте функцию `applyPromoCode()`
  3. Добавьте функцию `calculateDeliveryFee()`
  4. Обновите `handleCheckout()` чтобы использовать `createOrderWithPayment()`
  5. Добавьте обработку ошибок и успеха платежа
  6. Обновите UI для отображения всех полей доставки
- [ ] Пример полного файла в: `CART_UPDATE_EXAMPLE.tsx` (для справки)
- [ ] После обновления протестируйте на локальной машине

---

## Фаза 3: Конфигурация Telegram Bot (20 мин)

### 3.1 Проверка переменных окружения

- [ ] В `.env.local` установлены:
  - `TELEGRAM_BOT_TOKEN` (формат: `123456:ABC...`)
  - `WEBAPP_URL` (например: `https://your-app.vercel.app`)
  - `ADMIN_TELEGRAM_IDS` (список ID админов через запятую)

### 3.2 Настройка бота в Telegram

#### Убедитесь, что в Telegram BotFather:

- [ ] Команда `/start` зарегистрирована
- [ ] Команда `/orders` зарегистрирована
- [ ] Для платежей звёздами дополнительно:
  ```
  /setpaymentprovider
  # Выберите бота
  # Для звёзд можно выбрать любого или использовать встроенный
  ```

### 3.3 Webhook конфигурация

#### Установка webhook на production:

```bash
curl -X POST \
  https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -d url=https://your-app.vercel.app/api/bot \
  -d allowed_updates='["message","callback_query","pre_checkout_query"]'
```

#### Проверка webhook:

```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

#### Для локального тестирования (используйте ngrok):

```bash
# Установите ngrok: https://ngrok.com/download
ngrok http 3000

# Установите webhook
curl -X POST \
  https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -d url=https://<ngrok-id>.ngrok.io/api/bot \
  -d allowed_updates='["message","callback_query","pre_checkout_query"]'
```

---

## Фаза 4: Тестирование (1-2 часа)

### 4.1 Локальное тестирование

#### На локальной машине:

```bash
# Запустите dev сервер
npm run dev

# Откройте ngrok в отдельном терминале
ngrok http 3000

# Установите webhook на ngrok URL (см. выше)

# Откройте Mini App в Telegram и тестируйте
```

#### Тестовые сценарии:

1. **Создание заказа**
   - [ ] Добавьте товары в корзину
   - [ ] Заполните форму доставки
   - [ ] Нажмите "Оформить заказ"
   - [ ] Проверьте, что инвойс отправлен в боте
   - [ ] Проверьте БД: заказ создан со статусом `pending`

2. **Платёж (с реальными звёздами)**
   - [ ] Нажмите кнопку оплаты в боте
   - [ ] Выберите количество звёзд
   - [ ] Подтвердите оплату
   - [ ] Проверьте, что получили сообщение с кодом
   - [ ] Проверьте БД: статус изменился на `new`, код сохранён

3. **Проверка кода**
   - [ ] Используйте полученный 6-значный код
   - [ ] Отправьте POST запрос на `/api/orders/verify-code`
   - [ ] Убедитесь, что статус изменился на `done`
   - [ ] Проверьте, что код стал NULL в БД

4. **Отмена заказа**
   - [ ] Создайте заказ со статусом `pending`
   - [ ] Нажмите кнопку отмены в боте
   - [ ] Проверьте, что статус изменился на `cancelled`
   - [ ] Проверьте, что товары вернулись на склад

### 4.2 Проверка БД

```sql
-- Список всех заказов с платежами
SELECT id, user_telegram_id, status, total, paid_at, code_6digit, code_expires_at, created_at
FROM orders
ORDER BY created_at DESC
LIMIT 20;

-- Заказы, ожидающие оплаты
SELECT * FROM orders WHERE status = 'pending';

-- Заказы с оплатой, но без кода
SELECT * FROM orders WHERE status = 'new' AND code_6digit IS NULL;

-- Истёкшие коды
SELECT * FROM orders WHERE code_expires_at < NOW() AND status = 'new';

-- Логи платежей
SELECT * FROM payment_logs ORDER BY created_at DESC LIMIT 10;
```

### 4.3 Проверка логов

#### В консоли:

- [ ] При создании заказа видны логи в `/api/orders`
- [ ] При платеже видны логи в `/lib/bot/payments.ts`

#### В Telegram:

- [ ] Получаете сообщение с инвойсом
- [ ] После оплаты получаете сообщение с кодом
- [ ] Админы получают уведомление о платеже

---

## Фаза 5: Production deployment (30 мин)

### 5.1 Vercel deployment

- [ ] Залейте изменения на GitHub
- [ ] Vercel автоматически задеплоится
- [ ] Проверьте логи деплоя на ошибки

### 5.2 Обновление webhook

```bash
curl -X POST \
  https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -d url=https://your-production-url.vercel.app/api/bot \
  -d allowed_updates='["message","callback_query","pre_checkout_query"]'
```

### 5.3 Финальная проверка

- [ ] Откройте Mini App на боевом сервере
- [ ] Протестируйте полный цикл платежа (реальные звёзды!)
- [ ] Проверьте, что получаются уведомления
- [ ] Убедитесь, что коды генерируются и проверяются

---

## Фаза 6: Документирование (опционально)

- [ ] Прочитайте `PAYMENT_INTEGRATION.md` полностью
- [ ] Поделитесь с командой
- [ ] Обновите README с информацией о платежах
- [ ] Документируйте все custom changes в вашем проекте

---

## 🆘 Возможные проблемы и решения

### Проблема: "sendInvoice is not a function"

**Причина:** Неправильная версия grammy или API не поддерживает метод.

**Решение:**

```bash
npm install grammy@latest
```

### Проблема: "Ошибка подключения к БД"

**Причина:** Переменная окружения `NEON_DATABASE_URL` не установлена или неверна.

**Решение:**

- Проверьте `.env.local`
- Переподключитесь к Neon и скопируйте строку подключения заново

### Проблема: "Invoice payload not found"

**Причина:** Payload в инвойсе не совпадает с order.id.

**Решение:**

- В `/api/orders.ts` убедитесь, что `payload` это `order.id` (UUID)
- В `lib/bot/payments.ts` убедитесь, что `payment.invoice_payload` это именно order.id

### Проблема: "Webhook вернул 404"

**Причина:** URL вебхука неверен или сервер не доступен.

**Решение:**

- Проверьте, что URL правильный: `https://ваш-домен.com/api/bot`
- Проверьте, что сервер работает
- Переустановите webhook

### Проблема: "Код истёк через 5 минут вместо 24 часов"

**Причина:** Неправильно установлено время истечения в БД.

**Решение:**

- Проверьте, что `code_expires_at` вычисляется как `NOW() + interval '24 hours'`
- Убедитесь, что часовой пояс БД установлен корректно

---

## 📊 Проверочная таблица

| Шаг                                   | Статус | Дата | Примечание |
| ------------------------------------- | ------ | ---- | ---------- |
| Миграция БД                           | ☐      |      |            |
| Обновление `/api/orders.ts`           | ☐      |      |            |
| Создание `/api/orders/verify-code.ts` | ☐      |      |            |
| Обновление `/api/bot.ts`              | ☐      |      |            |
| Обновление `/lib/bot/payments.ts`     | ☐      |      |            |
| Создание `/lib/utils/payments.ts`     | ☐      |      |            |
| Обновление `pages/cart.tsx`           | ☐      |      |            |
| Конфигурация Telegram Bot             | ☐      |      |            |
| Установка webhook                     | ☐      |      |            |
| Локальное тестирование                | ☐      |      |            |
| Production deployment                 | ☐      |      |            |
| Финальная проверка                    | ☐      |      |            |

---

## 📞 Поддержка

Если у вас возникли проблемы:

1. Проверьте логи в консоли (npm run dev)
2. Проверьте логи в Telegram Bot API (getWebhookInfo)
3. Проверьте логи в БД (SELECT \* FROM payment_logs)
4. Используйте ngrok для локального отладки
5. Включите debug режим в grammy (для development)

---

**Версия чек-листа:** 1.0  
**Дата создания:** 2 апреля 2026
