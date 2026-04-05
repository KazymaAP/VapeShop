# Быстрый Справочник по Защите API Эндпоинтов

Используйте этот файл для быстрого копирования кода при защите эндпоинтов.

## 1️⃣ Шаблон для защиты административного API

### Скопируйте этот шаблон в каждый `/api/admin/*.ts` файл:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';
import { requireAuth, getTelegramId } from '../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // TODO: Ваша логика GET

      res.status(200).json({ success: true });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'Ошибка' });
    }
  } else if (req.method === 'POST') {
    try {
      // TODO: Ваша логика POST

      // Логируем действие (опционально)
      const telegramId = getTelegramId(req);
      await query(
        `INSERT INTO admin_logs (user_telegram_id, action, details) VALUES ($1, $2, $3)`,
        [
          telegramId,
          'action_name',
          JSON.stringify({
            /* данные */
          }),
        ]
      ).catch((err) => console.error('Logging error:', err));

      res.status(200).json({ success: true });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'Ошибка' });
    }
  } else if (req.method === 'PUT') {
    try {
      // TODO: Ваша логика PUT

      const telegramId = getTelegramId(req);
      // Логирование...

      res.status(200).json({ success: true });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'Ошибка' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // TODO: Ваша логика DELETE

      const telegramId = getTelegramId(req);
      // Логирование...

      res.status(200).json({ success: true });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'Ошибка' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Замените ['admin'] на нужную роль:
// - ['admin'] - только админы
// - ['admin', 'manager'] - админы и менеджеры
// - ['admin', 'seller'] - админы и продавцы (курьеры)
export default requireAuth(handler, ['admin']);
```

## 2️⃣ Логирование действий администраторов

Вставьте этот код в каждый эндпоинт, где нужно логировать:

```typescript
// Получаем ID администратора
const telegramId = getTelegramId(req);

// Логируем в БД
await query(`INSERT INTO admin_logs (user_telegram_id, action, details) VALUES ($1, $2, $3)`, [
  telegramId,
  'action_type', // create_product, update_order, delete_user, etc.
  JSON.stringify({
    /* параметры действия */
  }),
]).catch((err) => console.error('Logging error:', err));
```

## 3️⃣ Фронтенд: Использование fetchWithAuth

### Вариант 1: Простой fetch с автоматическим заголовком

```typescript
import { fetchWithAuth } from '../../../lib/frontend/auth';

const response = await fetchWithAuth('/api/admin/products', {
  method: 'POST',
  body: JSON.stringify(data),
});

const result = await response.json();
```

### Вариант 2: С обработкой ошибок

```typescript
import { fetchWithAuth } from '../../../lib/frontend/auth';

const response = await fetchWithAuth('/api/admin/products', {
  method: 'POST',
  body: JSON.stringify(data),
});

if (!response.ok) {
  if (response.status === 401) {
    console.log('Требуется аутентификация');
    return;
  }
  if (response.status === 403) {
    console.log('Недостаточно прав');
    return;
  }
}

const result = await response.json();
```

### Вариант 3: Ручное добавление заголовка

```typescript
import { getTelegramIdHeader } from '../../../lib/frontend/auth';

const response = await fetch('/api/admin/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...getTelegramIdHeader(),
  },
  body: JSON.stringify(data),
});
```

## 4️⃣ Специальный случай: Загрузка файла

Для POST запросов с FormData (например, импорт CSV):

```typescript
import { getTelegramIdHeader } from '../../../lib/frontend/auth';

const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/admin/import', {
  method: 'POST',
  headers: {
    // НЕ устанавливаем Content-Type - браузер сделает это автоматически
    ...getTelegramIdHeader(),
  },
  body: formData,
});
```

## 5️⃣ Список админских эндпоинтов (готовы к защите)

```
/api/admin/products.ts     ← ✓ УЖЕ ЗАЩИЩЁН
/api/admin/orders.ts       ← TODO: Применить requireAuth(['admin', 'manager'])
/api/admin/users.ts        ← TODO: Применить requireAuth(['admin'])
/api/admin/stats.ts        ← TODO: Применить requireAuth(['admin'])
/api/admin/settings.ts     ← TODO: Применить requireAuth(['admin'])
/api/admin/import.ts       ← TODO: Применить requireAuth(['admin'])
/api/admin/broadcast.ts    ← TODO: Применить requireAuth(['admin'])
/api/admin/faq.ts          ← TODO: Применить requireAuth(['admin']) (если есть)
```

## 6️⃣ Компоненты админки (фронтенд)

```
pages/admin/products.tsx   ← TODO: Обновить на fetchWithAuth
pages/admin/orders.tsx     ← TODO: Обновить на fetchWithAuth
pages/admin/users.tsx      ← TODO: Обновить на fetchWithAuth
pages/admin/stats.tsx      ← TODO: Обновить на fetchWithAuth
pages/admin/settings.tsx   ← TODO: Обновить на fetchWithAuth
pages/admin/import.tsx     ← TODO: Обновить на fetchWithAuth
pages/admin/broadcast.tsx  ← TODO: Обновить на fetchWithAuth
pages/admin/faq.tsx        ← TODO: Обновить на fetchWithAuth (если есть)
```

## 7️⃣ Таблица admin_logs

Создайте эту таблицу для логирования действий:

```sql
-- Создание таблицы для логирования
CREATE TABLE admin_logs (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_admin_logs_user ON admin_logs(user_telegram_id);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at DESC);
```

## 8️⃣ SQL запросы для управления ролями

### Сделать пользователя админом

```sql
UPDATE users SET role = 'admin' WHERE telegram_id = YOUR_TELEGRAM_ID;
```

### Изменить роль на менеджера

```sql
UPDATE users SET role = 'manager' WHERE telegram_id = YOUR_TELEGRAM_ID;
```

### Заблокировать пользователя

```sql
UPDATE users SET is_blocked = TRUE WHERE telegram_id = YOUR_TELEGRAM_ID;
```

### Разблокировать пользователя

```sql
UPDATE users SET is_blocked = FALSE WHERE telegram_id = YOUR_TELEGRAM_ID;
```

### Получить список админов

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

## 9️⃣ Тестирование через curl

### Тест 1: Без заголовка (должен вернуть 401)

```bash
curl -X GET http://localhost:3000/api/admin/products
```

### Тест 2: С заголовком, роль admin (должен вернуть 200)

```bash
curl -X GET http://localhost:3000/api/admin/products \
  -H "X-Telegram-Id: 123456789"
```

### Тест 3: С заголовком, роль buyer (должен вернуть 403)

```bash
curl -X GET http://localhost:3000/api/admin/products \
  -H "X-Telegram-Id: 987654321"
```

### Тест 4: POST запрос с данными

```bash
curl -X POST http://localhost:3000/api/admin/products \
  -H "X-Telegram-Id: 123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Name",
    "price": 100,
    "stock": 50
  }'
```

## 🔟 Проверка заголовков в DevTools

1. Откройте браузер DevTools (F12)
2. Перейдите на вкладку Network
3. Сделайте запрос в админке
4. Кликните на запрос
5. Перейдите в Headers → Request Headers
6. Убедитесь, что есть: `x-telegram-id: 123456789`

## 1️⃣1️⃣ Обработка ошибок аутентификации

```typescript
// 401 - не аутентифицирован
if (response.status === 401) {
  alert('Требуется аутентификация. Пожалуйста, откройте админку через Telegram Mini App.');
  window.location.href = '/';
}

// 403 - нет прав
if (response.status === 403) {
  alert('У вас недостаточно прав для этого действия.');
}

// 500 - ошибка сервера
if (response.status === 500) {
  console.error('Server error:', await response.json());
}
```

## 1️⃣2️⃣ Импорты

Вставьте эти импорты в начало файла:

### Backend импорты

```typescript
import { requireAuth, getTelegramId } from '../../../lib/auth';
```

### Frontend импорты

```typescript
import { fetchWithAuth, getTelegramIdHeader } from '../../../lib/frontend/auth';
```

## 📋 Чеклист для каждого эндпоинта

При защите каждого эндпоинта проверьте:

- [ ] Добавлены импорты `{ requireAuth, getTelegramId }`
- [ ] Функция переименована с `export default async function handler` на `async function handler`
- [ ] Добавлена обёртка `export default requireAuth(handler, ['admin']);` в конце
- [ ] Добавлено логирование `getTelegramId(req)` где нужно
- [ ] Всё работает: тест через curl возвращает 200 для админа, 401 без заголовка, 403 для не-админа

## ✨ Чеклист для фронтенда

При обновлении каждого компонента админки проверьте:

- [ ] Импортирован `fetchWithAuth` из `lib/frontend/auth`
- [ ] Все `fetch()` заменены на `fetchWithAuth()`
- [ ] DevTools показывает `x-telegram-id` заголовок в запросах
- [ ] Обработаны ошибки 401 и 403
- [ ] Всё работает

## 🎯 Порядок внедрения

Рекомендуемый порядок для минимизации проблем:

1. ✓ lib/auth.ts уже готов
2. ✓ lib/frontend/auth.ts уже готов
3. ✓ /api/admin/products.ts уже защищен
4. → Начните отсюда: /api/admin/orders.ts (используйте пример из ADMIN_API_ORDERS_EXAMPLE.md)
5. → Затем: остальные /api/admin/\* (используйте шаблон выше)
6. → После этого: обновите pages/admin/\* (используйте примеры из FRONTEND_ADMIN_AUTH_SETUP.md)
7. → В конце: создайте таблицу admin_logs и протестируйте всё

---

**Дополнительная документация:**

- `AUTH_SYSTEM_SUMMARY.md` - Полный обзор системы
- `ADMIN_API_AUTH_GUIDE.md` - Подробное руководство
- `ADMIN_API_ORDERS_EXAMPLE.md` - Пример с объяснениями
- `FRONTEND_ADMIN_AUTH_SETUP.md` - Примеры для фронтенда
- `AUTH_IMPLEMENTATION_CHECKLIST.md` - Полный чеклист
