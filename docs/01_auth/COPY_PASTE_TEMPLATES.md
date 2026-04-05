# 🚀 Копируй-Вставляй: Готовые Решения

Этот файл содержит готовые куски кода, которые можно копировать и использовать прямо сейчас.

## 1️⃣ Защита нового админского API

Этот код работает для **любого** файла в `/api/admin/`

### Шаг 1: Замените начало файла

❌ **Было:**

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
```

✅ **Стало:**

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';
import { requireAuth, getTelegramId } from '../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
```

### Шаг 2: Замените конец файла

❌ **Было:**

```typescript
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
```

✅ **Стало:**

```typescript
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// 🔐 Защита эндпоинта
// Выберите роль для вашего API:
// - ['admin'] - только админы
// - ['admin', 'manager'] - админы и менеджеры
// - ['admin', 'seller'] - админы и продавцы (курьеры)
export default requireAuth(handler, ['admin']); // ← ИЗМЕНИТЕ РОЛЬ
```

## 2️⃣ Логирование действия администратора

Вставьте этот код в нужном месте эндпоинта:

```typescript
// Получаем ID администратора
const telegramId = getTelegramId(req);

// Логируем в БД (опционально - может быть async)
await query(`INSERT INTO admin_logs (user_telegram_id, action, details) VALUES ($1, $2, $3)`, [
  telegramId,
  'action_name_here', // Например: create_product, update_order, delete_user
  JSON.stringify({
    product_id: id,
    old_name: oldName,
    new_name: newName,
    // Добавьте нужные детали
  }),
]).catch((err) => console.error('Logging error:', err));
```

### Примеры для разных действий

**Создание товара:**

```typescript
await query(`INSERT INTO admin_logs (user_telegram_id, action, details) VALUES ($1, $2, $3)`, [
  telegramId,
  'create_product',
  JSON.stringify({ name: req.body.name, price: req.body.price }),
]).catch((err) => console.error('Logging error:', err));
```

**Обновление заказа:**

```typescript
await query(`INSERT INTO admin_logs (user_telegram_id, action, details) VALUES ($1, $2, $3)`, [
  telegramId,
  'update_order_status',
  JSON.stringify({ order_id: id, old_status: oldStatus, new_status: newStatus }),
]).catch((err) => console.error('Logging error:', err));
```

**Удаление пользователя:**

```typescript
await query(`INSERT INTO admin_logs (user_telegram_id, action, details) VALUES ($1, $2, $3)`, [
  telegramId,
  'delete_user',
  JSON.stringify({ user_id: id, username: username }),
]).catch((err) => console.error('Logging error:', err));
```

## 3️⃣ Обновление фронтенд компонента

### Шаг 1: Добавьте импорт в начало файла

```typescript
import { fetchWithAuth } from '../../../lib/frontend/auth';
```

### Шаг 2: Замените все fetch на fetchWithAuth

❌ **Было:**

```typescript
const response = await fetch('/api/admin/products', {
  method: 'POST',
  body: JSON.stringify(data),
});
```

✅ **Стало:**

```typescript
const response = await fetchWithAuth('/api/admin/products', {
  method: 'POST',
  body: JSON.stringify(data),
});
```

### Шаг 3: Добавьте обработку ошибок (опционально)

```typescript
const response = await fetchWithAuth('/api/admin/products', {
  method: 'POST',
  body: JSON.stringify(data),
});

if (!response.ok) {
  if (response.status === 401) {
    alert('Требуется аутентификация');
    return;
  }
  if (response.status === 403) {
    alert('У вас недостаточно прав');
    return;
  }
}

const result = await response.json();
// Используйте result
```

## 4️⃣ Специальный случай: Загрузка файла

Для POST запросов с FormData (CSV, изображения и т.д.):

```typescript
import { getTelegramIdHeader } from '../../../lib/frontend/auth';

async function handleFileUpload(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', 'csv');

  const response = await fetch('/api/admin/import', {
    method: 'POST',
    headers: {
      // НЕ устанавливаем Content-Type - браузер сделает это автоматически
      ...getTelegramIdHeader(),
    },
    body: formData,
  });

  if (!response.ok) {
    console.error('Upload failed:', await response.json());
    return;
  }

  const result = await response.json();
  console.log('Uploaded:', result);
}
```

## 5️⃣ Управление ролями - SQL команды

Скопируйте и выполните в базе данных:

### Сделать админом

```sql
UPDATE users SET role = 'admin' WHERE telegram_id = YOUR_TELEGRAM_ID;
```

### Сделать менеджером

```sql
UPDATE users SET role = 'manager' WHERE telegram_id = YOUR_TELEGRAM_ID;
```

### Сделать курьером (продавцом)

```sql
UPDATE users SET role = 'seller' WHERE telegram_id = YOUR_TELEGRAM_ID;
```

### Сделать обычным покупателем

```sql
UPDATE users SET role = 'buyer' WHERE telegram_id = YOUR_TELEGRAM_ID;
```

### Заблокировать пользователя

```sql
UPDATE users SET is_blocked = TRUE WHERE telegram_id = YOUR_TELEGRAM_ID;
```

### Разблокировать пользователя

```sql
UPDATE users SET is_blocked = FALSE WHERE telegram_id = YOUR_TELEGRAM_ID;
```

### Получить список всех админов

```sql
SELECT telegram_id, username, role FROM users WHERE role = 'admin';
```

### Получить логи действий администратора

```sql
SELECT * FROM admin_logs
WHERE user_telegram_id = YOUR_TELEGRAM_ID
ORDER BY created_at DESC
LIMIT 20;
```

## 6️⃣ Тестирование - curl команды

Скопируйте и выполните в терминале:

### Тест 1: Без заголовка (должно быть 401)

```bash
curl -X GET http://localhost:3000/api/admin/products
```

### Тест 2: С заголовком, админ (должно быть 200)

```bash
curl -X GET http://localhost:3000/api/admin/products \
  -H "X-Telegram-Id: 123456789"
```

### Тест 3: С заголовком, не-админ (должно быть 403)

```bash
curl -X GET http://localhost:3000/api/admin/products \
  -H "X-Telegram-Id: 987654321"
```

### Тест 4: POST запрос

```bash
curl -X POST http://localhost:3000/api/admin/products \
  -H "X-Telegram-Id: 123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "price": 100,
    "stock": 50
  }'
```

### Тест 5: PUT запрос

```bash
curl -X PUT http://localhost:3000/api/admin/products \
  -H "X-Telegram-Id: 123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Updated Product",
    "price": 150
  }'
```

## 7️⃣ Создание таблицы логирования

Скопируйте и выполните в БД один раз:

```sql
-- Таблица для логирования действий администраторов
CREATE TABLE IF NOT EXISTS admin_logs (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_admin_logs_user ON admin_logs(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
```

## 8️⃣ Проверка заголовка в DevTools

Инструкция с картинки:

1. Откройте страницу админки в браузере
2. Нажмите `F12` для открытия DevTools
3. Перейдите на вкладку **Network**
4. Сделайте любой запрос (нажмите кнопку в админке)
5. Кликните на запрос в списке
6. Перейдите в **Headers** → найдите **Request Headers**
7. Ищите строку `x-telegram-id: 123456789`
8. Если есть → всё правильно ✅
9. Если нет → используйте `fetchWithAuth()` вместо `fetch()` ❌

## 9️⃣ Быстрая проверка: Работает ли?

Выполните эту последовательность:

1. **Тест 1: Без заголовка**

   ```bash
   curl -X GET http://localhost:3000/api/admin/products
   ```

   Должно вернуться: `{"error":"Unauthorized"}` статус 401

2. **Тест 2: С заголовком**

   ```bash
   curl -X GET http://localhost:3000/api/admin/products \
     -H "X-Telegram-Id: 123456789"
   ```

   Должно вернуться: `{"products":[...]}` статус 200

3. **Если оба теста прошли → ✅ Всё работает!**

4. **Если второй тест вернул 403 → это нормально**
   - Может быть, пользователь 123456789 не является админом
   - Используйте SQL: `SELECT role FROM users WHERE telegram_id = 123456789`

## 🔟 Шаблон для документирования нового API

Скопируйте этот шаблон в комментарий вашего API:

```typescript
/**
 * API эндпоинт для управления товарами
 *
 * @method GET - Получить список товаров
 * @method POST - Создать новый товар
 * @method PUT - Обновить товар
 * @method DELETE - Удалить товар
 *
 * @requires X-Telegram-Id заголовок
 * @requires роль 'admin'
 *
 * @returns 200 - Успешно
 * @returns 401 - Требуется аутентификация (нет X-Telegram-Id)
 * @returns 403 - Доступ запрещён (недостаточно прав или заблокирован)
 * @returns 500 - Ошибка сервера
 *
 * @example
 * // GET /api/admin/products
 * curl -X GET http://localhost:3000/api/admin/products \
 *   -H "X-Telegram-Id: 123456789"
 */
```

## 1️⃣1️⃣ Обработка ошибок на фронтенде

Используйте этот код для красивой обработки ошибок:

```typescript
async function safeApiCall(url, options) {
  try {
    const response = await fetchWithAuth(url, options);

    if (response.status === 401) {
      alert('Требуется аутентификация. Пожалуйста, откройте админку через Telegram Mini App.');
      // window.location.href = '/'; // Можно перенаправить
      return null;
    }

    if (response.status === 403) {
      alert('У вас недостаточно прав для этого действия.');
      console.log('Required role not found');
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      alert(`Ошибка: ${error.message || error.error}`);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error('API call failed:', err);
    alert('Произошла непредвиденная ошибка');
    return null;
  }
}

// Использование
const result = await safeApiCall('/api/admin/products', {
  method: 'POST',
  body: JSON.stringify(product),
});

if (result) {
  console.log('Success:', result);
}
```

---

**Совет:** Сохраните эту страницу! Это ваш персональный "шпаргалка" для быстрого копирования.

**Последовательность действий:**

1. Скопируйте нужный код
2. Подставьте в свой файл
3. Измените значения под себя
4. Протестируйте

**Всё готово к использованию!** ✨
