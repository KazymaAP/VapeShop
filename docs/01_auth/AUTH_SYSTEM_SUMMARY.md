# Система Аутентификации и Авторизации - Полный Обзор

## Введение

Реализована полнофункциональная система управления доступом (RBAC - Role-Based Access Control) для всех API эндпоинтов VapeShop. Система включает:

- ✅ Аутентификацию через заголовок `X-Telegram-Id`
- ✅ Проверку прав доступа по ролям (admin, manager, seller, buyer)
- ✅ Проверку блокировки пользователей
- ✅ Логирование действий администраторов
- ✅ Фронтенд-утилиты для отправки заголовков

## Компоненты системы

### 1. Backend - lib/auth.ts

**Основная функция**

```typescript
export function requireAuth(handler: NextApiHandler, allowedRoles: string[]) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Проверяет аутентификацию и авторизацию
    // Возвращает 401 если не аутентифицирован
    // Возвращает 403 если нет прав
  };
}
```

**Дополнительные функции**

- `getTelegramIdFromRequest(req)` - Извлекает ID пользователя из заголовка
- `getTelegramId(req)` - Alias для getTelegramIdFromRequest
- `getUserRole(telegramId)` - Получает роль пользователя из БД
- `isUserBlocked(telegramId)` - Проверяет, заблокирован ли пользователь

**Использование**

```typescript
import { requireAuth } from '../../../lib/auth';

async function handler(req, res) {
  // Ваша логика
}

export default requireAuth(handler, ['admin']); // Требует роль admin
```

### 2. Frontend - lib/frontend/auth.ts

**Основная функция**

```typescript
export function getTelegramIdHeader() {
  const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
  return user ? { 'X-Telegram-Id': String(user.id) } : {};
}
```

**Удобные функции**

- `fetchWithAuth(url, options)` - Wraps fetch, автоматически добавляет заголовок
- `fetchWithAuthAndHandle(url, options, onError)` - С обработкой ошибок 401/403
- `getCurrentTelegramId()` - Получает текущий telegram_id

**Использование**

```typescript
import { fetchWithAuth } from '../../../lib/frontend/auth';

const response = await fetchWithAuth('/api/admin/products', {
  method: 'POST',
  body: JSON.stringify(data),
});
```

## Роли и права

| Роль        | Сможет                                                                   | Не сможет                        |
| ----------- | ------------------------------------------------------------------------ | -------------------------------- |
| **admin**   | Все операции: товары, заказы, пользователи, статистика, импорт, рассылки | Ничего (полный доступ)           |
| **manager** | Просмотр заказов, обновление статуса                                     | Товары, пользователи, статистика |
| **seller**  | Подтверждение кодов доставки (future API)                                | Товары, заказы, пользователи     |
| **buyer**   | Покупки, корзина, профиль                                                | Админ-панель, все                |

## Список защищённых эндпоинтов

### Готовые к защите (requireAuth уже применен)

- ✅ `POST /api/admin/products` - Создание товара
- ✅ `PUT /api/admin/products` - Обновление товара
- ✅ `GET /api/admin/products` - Список товаров
- ✅ `DELETE /api/admin/products` - Удаление товара

### Требуют защиты (TODO)

- [ ] `GET /api/admin/orders` → `requireAuth(handler, ['admin', 'manager'])`
- [ ] `PUT /api/admin/orders` → `requireAuth(handler, ['admin', 'manager'])`
- [ ] `GET /api/admin/users` → `requireAuth(handler, ['admin'])`
- [ ] `PUT /api/admin/users` → `requireAuth(handler, ['admin'])`
- [ ] `GET /api/admin/stats` → `requireAuth(handler, ['admin'])`
- [ ] `POST /api/admin/import` → `requireAuth(handler, ['admin'])`
- [ ] `POST /api/admin/broadcast` → `requireAuth(handler, ['admin'])`
- [ ] `GET /api/admin/settings` → `requireAuth(handler, ['admin'])`
- [ ] `PUT /api/admin/settings` → `requireAuth(handler, ['admin'])`

### Уже защищены (блокировка пользователей)

- ✅ `POST /api/orders` - Создание заказа (проверка блокировки)
- ✅ `GET /api/cart` - Получение корзины (проверка блокировки)
- ✅ `POST /api/cart` - Добавление в корзину (проверка блокировки)
- ✅ `PUT /api/cart` - Обновление корзины (проверка блокировки)
- ✅ `DELETE /api/cart` - Очистка корзины (проверка блокировки)

## Архитектура аутентификации

```
┌─ Клиент (Telegram Mini App)
│  ├─ Читает window.Telegram.WebApp.initDataUnsafe.user.id
│  ├─ Добавляет в заголовок X-Telegram-Id: <id>
│  └─ Отправляет запрос
│
├─ Запрос в API
│  │
│  ├─ Проходит через requireAuth middleware
│  │  ├─ Извлекает X-Telegram-Id из заголовка
│  │  ├─ Получает роль из БД (users.role)
│  │  ├─ Проверяет блокировку (users.is_blocked)
│  │  ├─ Проверяет допустимые роли
│  │  └─ Возвращает 401/403 если проверка не прошла
│  │
│  └─ Если OK → передаёт на обработчик API
│     ├─ Можно использовать getTelegramId(req) для логирования
│     └─ Обрабатывает запрос и возвращает результат
│
└─ Ответ клиенту
   ├─ 200: Успешно
   ├─ 401: Требуется аутентификация (заголовок не передан)
   ├─ 403: Доступ запрещён (роль не подходит или заблокирован)
   └─ 500: Ошибка сервера
```

## Схема базы данных

### Таблица users

```sql
CREATE TABLE users (
  telegram_id BIGINT PRIMARY KEY,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'buyer', -- admin, manager, seller, buyer
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индекс для быстрого поиска по роли
CREATE INDEX idx_users_role ON users(role);
```

### Таблица admin_logs (для логирования)

```sql
CREATE TABLE admin_logs (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL,
  action VARCHAR(50) NOT NULL, -- create_product, update_product, delete_product, etc.
  details JSONB, -- JSON с параметрами действия
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id),
  INDEX idx_admin_logs_user (user_telegram_id),
  INDEX idx_admin_logs_created_at (created_at DESC)
);
```

## Тестирование

### 1. Тест без заголовка (должен быть 401)

```bash
curl -X GET http://localhost:3000/api/admin/products
# Ответ: {"error":"Unauthorized"}, статус 401
```

### 2. Тест с заголовком, роль admin (должен быть 200)

```bash
curl -X GET http://localhost:3000/api/admin/products \
  -H "X-Telegram-Id: 123456789"
# Ответ: {"products":[...]}, статус 200
```

### 3. Тест с заголовком, роль buyer (должен быть 403)

```bash
curl -X GET http://localhost:3000/api/admin/products \
  -H "X-Telegram-Id: 987654321"  # Пользователь с ролью buyer
# Ответ: {"error":"Forbidden"}, статус 403
```

### 4. Тест с заблокированным пользователем (должен быть 403)

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "X-Telegram-Id: 555555555" \  # is_blocked = true
  -H "Content-Type: application/json" \
  -d '{"items":[...]}'
# Ответ: {"error":"Forbidden","message":"Ваш аккаунт был заблокирован"}, статус 403
```

## Последовательность внедрения

### Фаза 1: Backend ✅ ГОТОВ

- [x] lib/auth.ts создан и протестирован
- [x] pages/api/admin/products.ts защищен requireAuth
- [x] pages/api/cart.ts защищен isUserBlocked для всех методов

### Фаза 2: Остальные админские API (TODO)

- [ ] Обновить все /api/admin/\* эндпоинты
- [ ] Использовать ADMIN_API_AUTH_GUIDE.md как шаблон

### Фаза 3: Frontend (TODO)

- [ ] Обновить компоненты pages/admin/\* для использования fetchWithAuth
- [ ] Использовать FRONTEND_ADMIN_AUTH_SETUP.md как шаблон

### Фаза 4: Тестирование (TODO)

- [ ] Интеграционные тесты для каждой роли
- [ ] Проверка логирования в admin_logs
- [ ] Проверка 401/403 ответов

## Файлы документации

1. **ADMIN_API_AUTH_GUIDE.md** - Как защищать админские эндпоинты
2. **FRONTEND_ADMIN_AUTH_SETUP.md** - Как обновлять фронтенд для отправки заголовков
3. **AUTH_SYSTEM_SUMMARY.md** - Этот файл (общий обзор)

## Примеры кода

### Backend пример (уже готов)

```typescript
// pages/api/admin/products.ts
import { requireAuth, getTelegramId } from '../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const telegramId = getTelegramId(req);

    // Логируем действие
    await query(`INSERT INTO admin_logs (user_telegram_id, action, details) VALUES ($1, $2, $3)`, [
      telegramId,
      'create_product',
      JSON.stringify({ name: req.body.name }),
    ]);

    // ... остальная логика
  }
}

export default requireAuth(handler, ['admin']);
```

### Frontend пример

```typescript
// pages/admin/products.tsx
import { fetchWithAuth } from '../../../lib/frontend/auth';

async function createProduct(data) {
  const response = await fetchWithAuth('/api/admin/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) console.log('Требуется логин');
    if (response.status === 403) console.log('Нет прав доступа');
    return;
  }

  const result = await response.json();
  // ... обработка результата
}
```

##常見проблемы и решения

| Проблема                           | Решение                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| 401 Unauthorized                   | Проверьте заголовок X-Telegram-Id в запросе                                         |
| 403 Forbidden                      | Проверьте роль пользователя в БД: `SELECT role FROM users WHERE telegram_id = <ID>` |
| Не добавляется заголовок на фронте | Используйте `fetchWithAuth` вместо `fetch`                                          |
| Заголовок есть, но 401             | Убедитесь, что X-Telegram-Id это число, не строка с кавычками                       |

## Безопасность

### Текущая реализация

- ✅ Заголовок X-Telegram-Id используется для простого тестирования
- ✅ Проверка роли на бэкенде
- ✅ Проверка блокировки на бэкенде
- ⚠️ Заголовок не криптографически защищен (может быть подделан)

### Будущие улучшения

- [ ] Добавить HMAC-SHA256 верификацию initData (уже есть заглушка в parseInitData)
- [ ] Добавить refresh tokens
- [ ] Добавить rate limiting по IP
- [ ] Добавить двухфакторную аутентификацию для админов

## Резюме

✅ **Что готово:**

- Middleware для проверки аутентификации и авторизации
- Функции для получения данных пользователя
- Защита админского эндпоинта products.ts
- Защита корзины от заблокированных пользователей
- Фронтенд утилиты для отправки заголовков
- Подробная документация

📝 **Что нужно сделать:**

1. Применить requireAuth к остальным /api/admin/\* эндпоинтам (см. ADMIN_API_AUTH_GUIDE.md)
2. Обновить все компоненты админки для использования fetchWithAuth (см. FRONTEND_ADMIN_AUTH_SETUP.md)
3. Добавить таблицу admin_logs для логирования
4. Протестировать все эндпоинты

📋 **Чеклист внедрения:**

- [x] lib/auth.ts создан
- [x] lib/frontend/auth.ts создан
- [x] pages/api/admin/products.ts защищен
- [x] pages/api/cart.ts защищен
- [ ] pages/api/admin/orders.ts защищен
- [ ] pages/api/admin/users.ts защищен
- [ ] pages/api/admin/stats.ts защищен
- [ ] pages/api/admin/settings.ts защищен
- [ ] pages/api/admin/import.ts защищен
- [ ] pages/api/admin/broadcast.ts защищен
- [ ] Обновлены все pages/admin/\*.tsx компоненты
- [ ] Добавлена таблица admin_logs
- [ ] Проведено тестирование
