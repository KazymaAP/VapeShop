# Пример Полной Защиты Админского API - /api/admin/orders.ts

Этот файл демонстрирует, как правильно защитить админский API эндпоинт с использованием middleware `requireAuth`.

## До защиты (небезопасно)

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // КТО УГОДНО может получить все заказы!
    const result = await query('SELECT * FROM orders');
    res.status(200).json({ orders: result.rows });
  } else if (req.method === 'PUT') {
    // КТО УГОДНО может изменить статус любого заказа!
    const { id, status } = req.body;
    await query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
    res.status(200).json({ success: true });
  }
}
```

## После защиты (безопасно) ✓

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';
import { requireAuth, getTelegramId } from '../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Только админы и менеджеры видят заказы
      const result = await query(
        `SELECT id, user_telegram_id, items, total_price, status, created_at, paid_at, code_6digit
         FROM orders
         ORDER BY created_at DESC
         LIMIT 100`
      );

      const orders = result.rows.map(row => ({
        id: row.id,
        user_telegram_id: row.user_telegram_id,
        items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
        total_price: parseFloat(row.total_price),
        status: row.status,
        created_at: row.created_at,
        paid_at: row.paid_at,
        code_6digit: row.code_6digit,
      }));

      res.status(200).json({ orders });
    } catch (err) {
      console.error('Get orders error:', err);
      res.status(500).json({ error: 'Ошибка загрузки заказов' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, status } = req.body;

      if (!id || !status) {
        return res.status(400).json({ error: 'Missing id or status' });
      }

      // Проверяем, что статус допустимый
      const validStatuses = ['pending', 'new', 'in_progress', 'done', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      // Получаем старый статус для логирования
      const oldOrderResult = await query('SELECT status FROM orders WHERE id = $1', [id]);
      const oldStatus = oldOrderResult.rows[0]?.status;

      // Обновляем
      await query(
        `UPDATE orders
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [status, id]
      );

      // Логируем действие администратора
      const telegramId = getTelegramId(req);
      await query(
        `INSERT INTO admin_logs (user_telegram_id, action, details)
         VALUES ($1, $2, $3)`,
        [
          telegramId,
          'update_order_status',
          JSON.stringify({
            order_id: id,
            old_status: oldStatus,
            new_status: status,
          }),
        ]
      ).catch(err => console.error('Logging error:', err));

      res.status(200).json({ success: true, message: `Статус заказа изменён на ${status}` });
    } catch (err) {
      console.error('Update order error:', err);
      res.status(500).json({ error: 'Ошибка обновления заказа' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// 🔐 ВАЖНО: requireAuth защищает эндпоинт
// Проверяет:
// 1. X-Telegram-Id заголовок передан
// 2. Пользователь не заблокирован (is_blocked = false)
// 3. Роль входит в ['admin', 'manager']
// 4. Если проверка не прошла → возвращает 401 или 403
export default requireAuth(handler, ['admin', 'manager']);
```

## Что изменилось?

### 1. Импорты
```typescript
// Добавили
import { requireAuth, getTelegramId } from '../../../lib/auth';
```

### 2. Переименование функции
```typescript
// Было
export default async function handler(req, res) { ... }

// Стало
async function handler(req, res) { ... }
```

### 3. Обёртка в конце файла
```typescript
export default requireAuth(handler, ['admin', 'manager']);
```

Это делает:
- ✅ Проверяет наличие X-Telegram-Id заголовка → 401 если нет
- ✅ Проверяет роль пользователя → 403 если не admin/manager
- ✅ Проверяет блокировку пользователя → 403 если заблокирован

### 4. Логирование действия
```typescript
const telegramId = getTelegramId(req);
await query(
  `INSERT INTO admin_logs (user_telegram_id, action, details) VALUES ($1, $2, $3)`,
  [telegramId, 'update_order_status', JSON.stringify({...})]
);
```

Это записывает в БД кто, когда и что изменил.

## Тестирование

### Тест 1: Без заголовка (401)
```bash
curl -X GET http://localhost:3000/api/admin/orders
# Ответ: {"error":"Unauthorized"}
# Статус: 401
```

### Тест 2: С заголовком admin (200)
```bash
curl -X GET http://localhost:3000/api/admin/orders \
  -H "X-Telegram-Id: 123456789"
# Ответ: {"orders":[{id: "...", status: "new", ...}]}
# Статус: 200
```

### Тест 3: С заголовком buyer (403)
```bash
curl -X GET http://localhost:3000/api/admin/orders \
  -H "X-Telegram-Id: 987654321"  # Пользователь с ролью buyer
# Ответ: {"error":"Forbidden"}
# Статус: 403
```

### Тест 4: Обновить статус заказа
```bash
curl -X PUT http://localhost:3000/api/admin/orders \
  -H "X-Telegram-Id: 123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "done"
  }'
# Ответ: {"success":true,"message":"Статус заказа изменён на done"}
# Статус: 200
```

## Проверка логирования

В БД должна появиться запись:
```sql
SELECT * FROM admin_logs
WHERE user_telegram_id = 123456789
ORDER BY created_at DESC
LIMIT 1;

-- Результат:
-- id | user_telegram_id | action                   | details                                              | created_at
-- 1  | 123456789        | update_order_status      | {"order_id":"550e...", "old_status":"new", "new_...  | 2024-01-15 10:30:45
```

## Применение этого шаблона к другим эндпоинтам

Просто скопируйте этот шаблон и адаптируйте:

```typescript
// /api/admin/users.ts
import { requireAuth, getTelegramId } from '../../../lib/auth';

async function handler(req, res) {
  // Ваша логика
  if (req.method === 'PUT') {
    const telegramId = getTelegramId(req);
    // Логируйте действие
  }
}

export default requireAuth(handler, ['admin']); // Только админы
```

```typescript
// /api/admin/import.ts
import { requireAuth, getTelegramId } from '../../../lib/auth';

async function handler(req, res) {
  // Ваша логика импорта CSV
  const telegramId = getTelegramId(req);
}

export default requireAuth(handler, ['admin']); // Только админы
```

```typescript
// /api/admin/settings.ts
import { requireAuth, getTelegramId } from '../../../lib/auth';

async function handler(req, res) {
  // Ваша логика настроек
  const telegramId = getTelegramId(req);
}

export default requireAuth(handler, ['admin']); // Только админы
```

## Частые ошибки

### ❌ Ошибка 1: Забыли обёртку requireAuth
```typescript
export default handler; // ❌ НЕ ЗАЩИЩЕНО!
```
**Решение:**
```typescript
export default requireAuth(handler, ['admin']); // ✓ ЗАЩИЩЕНО
```

### ❌ Ошибка 2: export default async function вместо async function
```typescript
export default async function handler(req, res) { ... } // ❌ Не работает с requireAuth
```
**Решение:**
```typescript
async function handler(req, res) { ... }
export default requireAuth(handler, ['admin']); // ✓ Правильно
```

### ❌ Ошибка 3: Забыли логирование
```typescript
async function handler(req, res) {
  if (req.method === 'PUT') {
    await query('UPDATE products SET ...'); // ❌ Никто не знает, кто это сделал
  }
}
```
**Решение:**
```typescript
async function handler(req, res) {
  if (req.method === 'PUT') {
    const telegramId = getTelegramId(req);
    await query('INSERT INTO admin_logs ...'); // ✓ Записано в логи
    await query('UPDATE products SET ...');
  }
}
```

## Резюме изменений на примере /api/admin/orders.ts

| Аспект | До | После |
|--------|----|----- |
| **Кто может получить доступ?** | Любой | Только admin или manager |
| **Логирование действий** | Нет | Да, в таблице admin_logs |
| **Проверка блокировки** | Нет | Да, middleware requireAuth |
| **Возврат 401 без заголовка** | Нет | Да |
| **Возврат 403 без прав** | Нет | Да |
| **Безопасность** | ⚠️ Низкая | ✓ Средняя-высокая |

## Применение ко ВСЕМ админским эндпоинтам

1. `/api/admin/orders.ts` → `requireAuth(handler, ['admin', 'manager'])`
2. `/api/admin/products.ts` → ✓ Уже готов
3. `/api/admin/users.ts` → `requireAuth(handler, ['admin'])`
4. `/api/admin/stats.ts` → `requireAuth(handler, ['admin'])`
5. `/api/admin/settings.ts` → `requireAuth(handler, ['admin'])`
6. `/api/admin/import.ts` → `requireAuth(handler, ['admin'])`
7. `/api/admin/broadcast.ts` → `requireAuth(handler, ['admin'])`
8. `/api/admin/faq.ts` → `requireAuth(handler, ['admin'])`

Все следуют одному и тому же шаблону! 🚀
