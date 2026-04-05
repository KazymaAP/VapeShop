# Защита Админских API Эндпоинтов

## Обзор

Все API эндпоинты в `pages/api/admin/*` должны быть защищены middleware `requireAuth()` для проверки:

1. **Аутентификация**: Пользователь передал `X-Telegram-Id` заголовок
2. **Авторизация**: Пользователь имеет требуемую роль
3. **Блокировка**: Пользователь не в чёрном списке

## Пример реализации (pages/api/admin/products.ts)

```typescript
import { requireAuth, getTelegramId } from '../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Ваша обработка запроса
  if (req.method === 'POST') {
    // ...
    const telegramId = getTelegramId(req); // Получить ID для логирования
    // ...
  }
  // ...
}

// Обёртка в конце файла
export default requireAuth(handler, ['admin']);
```

## Применение к каждому эндпоинту

### 1. `/api/admin/products.ts` ✓ ГОТОВ

- Статус: **ЗАЩИЩЁН**
- Требуемые роли: `['admin']`
- Действия: POST (создать), PUT (обновить), GET (список), DELETE (удалить)

### 2. `/api/admin/orders.ts`

- Требуемые роли: `['admin', 'manager']` (менеджеры должны видеть заказы)
- Действия: GET (список заказов), PUT (обновить статус)

```typescript
// В конце файла
export default requireAuth(handler, ['admin', 'manager']);
```

### 3. `/api/admin/users.ts`

- Требуемые роли: `['admin']`
- Действия: GET (список пользователей), PUT (изменить роль/блокировка), DELETE

```typescript
export default requireAuth(handler, ['admin']);
```

### 4. `/api/admin/stats.ts`

- Требуемые роли: `['admin']`
- Действия: GET (статистика, графики)

```typescript
export default requireAuth(handler, ['admin']);
```

### 5. `/api/admin/settings.ts`

- Требуемые роли: `['admin']`
- Действия: GET (получить настройки), PUT (сохранить)

```typescript
export default requireAuth(handler, ['admin']);
```

### 6. `/api/admin/import.ts`

- Требуемые роли: `['admin']`
- Действия: POST (загрузить CSV с товарами)

```typescript
export default requireAuth(handler, ['admin']);
```

### 7. `/api/admin/broadcast.ts`

- Требуемые роли: `['admin']`
- Действия: POST (отправить сообщение всем пользователям)

```typescript
export default requireAuth(handler, ['admin']);
```

### 8. `/api/admin/faq.ts` (если существует)

- Требуемые роли: `['admin']`
- Действия: GET (список), POST (создать), PUT (обновить), DELETE

```typescript
export default requireAuth(handler, ['admin']);
```

## Инструкция по обновлению каждого файла

### Шаг 1: Добавить импорты

```typescript
import { requireAuth, getTelegramId } from '../../../lib/auth';
```

### Шаг 2: Переименовать export

Изменить `export default async function handler` → `async function handler`

### Шаг 3: Добавить обертку в конце

```typescript
export default requireAuth(handler, ['admin']); // или другие роли
```

### Шаг 4: Использовать getTelegramId() для логирования

Везде, где нужно логировать действие админа:

```typescript
const telegramId = getTelegramId(req);
// Затем использовать telegramId для записи в БД
```

## Логирование действий администраторов

Рекомендуется создать таблицу для логирования:

```sql
CREATE TABLE admin_logs (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id)
);

CREATE INDEX idx_admin_logs_user ON admin_logs(user_telegram_id);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at DESC);
```

## Использование на фронтенде (pages/admin/\*)

В каждом компоненте админки при запросе к API добавлять заголовок:

```typescript
import { getTelegramIdHeader, fetchWithAuth } from '../../../lib/frontend/auth';

// Вариант 1: Ручное добавление заголовка
const headers = {
  'Content-Type': 'application/json',
  ...getTelegramIdHeader(),
};

const response = await fetch('/api/admin/products', {
  method: 'POST',
  headers,
  body: JSON.stringify(data),
});

// Вариант 2: Используем готовую функцию
const response = await fetchWithAuth('/api/admin/products', {
  method: 'POST',
  body: JSON.stringify(data),
});

// Вариант 3: С обработкой ошибок аутентификации
import { fetchWithAuthAndHandle } from '../../../lib/frontend/auth';

const response = await fetchWithAuthAndHandle(
  '/api/admin/products',
  {
    method: 'POST',
    body: JSON.stringify(data),
  },
  (status) => {
    if (status === 401) console.log('Требуется аутентификация');
    if (status === 403) console.log('У вас недостаточно прав');
  }
);
```

## Тестирование

### Через curl (без заголовка - должно быть 401)

```bash
curl -X GET http://localhost:3000/api/admin/products
# Ответ: { error: 'Unauthorized' }, статус 401
```

### Через curl (с заголовком - роль admin - должно быть успех)

```bash
curl -X GET http://localhost:3000/api/admin/products \
  -H "X-Telegram-Id: 123456789"
# Ответ: { products: [...] }, статус 200
```

### Через curl (с заголовком - роль buyer - должно быть 403)

```bash
curl -X GET http://localhost:3000/api/admin/products \
  -H "X-Telegram-Id: 987654321" # Пользователь с ролью buyer
# Ответ: { error: 'Forbidden' }, статус 403
```

## Чеклист применения

- [ ] `/api/admin/products.ts` - ✓ ГОТОВ
- [ ] `/api/admin/orders.ts` - Добавить requireAuth
- [ ] `/api/admin/users.ts` - Добавить requireAuth
- [ ] `/api/admin/stats.ts` - Добавить requireAuth
- [ ] `/api/admin/settings.ts` - Добавить requireAuth
- [ ] `/api/admin/import.ts` - Добавить requireAuth
- [ ] `/api/admin/broadcast.ts` - Добавить requireAuth
- [ ] `/api/admin/faq.ts` - Добавить requireAuth (если существует)
- [ ] Обновить все компоненты `pages/admin/*` использовать `getTelegramIdHeader()` или `fetchWithAuth()`
- [ ] Создать таблицу `admin_logs` для логирования

## Резюме

1. **Все админские API защищены одинаково**: применить `requireAuth(handler, ['admin'])` в конце файла
2. **Менеджеры видят заказы**: `/api/admin/orders.ts` должен быть `requireAuth(handler, ['admin', 'manager'])`
3. **Фронтенд должен отправлять заголовок**: Используйте `getTelegramIdHeader()` в админке
4. **Логирование**: Используйте `getTelegramId(req)` для записи действий в `admin_logs`
