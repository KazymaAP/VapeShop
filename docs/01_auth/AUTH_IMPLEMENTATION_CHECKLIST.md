# Чеклист Внедрения Системы Аутентификации

## ✅ Фаза 1: Подготовка (ЗАВЕРШЕНО)

- [x] Создан `lib/auth.ts` с функциями:
  - [x] `getTelegramIdFromRequest()` - получение ID из заголовка или initData
  - [x] `getUserRole()` - получение роли из БД
  - [x] `isUserBlocked()` - проверка блокировки
  - [x] `hasRequiredRole()` - проверка допустимых ролей
  - [x] `requireAuth()` - middleware для защиты API
  - [x] `getTelegramId()` - получение ID из запроса (после requireAuth)
  - [x] `checkAccess()` - гибкая проверка доступа

- [x] Создан `lib/frontend/auth.ts` с функциями:
  - [x] `getTelegramIdHeader()` - получение заголовков с ID
  - [x] `getInitDataHeader()` - получение заголовков с initData
  - [x] `getCurrentTelegramId()` - получение текущего ID на фронте
  - [x] `getCurrentUser()` - получение информации о пользователе
  - [x] `fetchWithAuth()` - fetch с автоматическим добавлением заголовков
  - [x] `fetchWithAuthAndHandle()` - fetch с обработкой ошибок

## 📋 Фаза 2: Защита Админских API (В ПРОЦЕССЕ)

### Готовые
- [x] `/api/admin/products.ts` - Защищён `requireAuth(handler, ['admin'])`
  - [x] Добавлены импорты
  - [x] Переименована функция handler (не export default)
  - [x] Добавлена обёртка requireAuth в конце
  - [x] Добавлено логирование в admin_logs

### TODO - Нужно применить requireAuth
- [ ] `/api/admin/orders.ts` - Применить `requireAuth(handler, ['admin', 'manager'])`
  - [ ] Добавить импорт `{ requireAuth, getTelegramId } from '../../../lib/auth'`
  - [ ] Заменить `export default async function handler` на `async function handler`
  - [ ] Добавить в конце: `export default requireAuth(handler, ['admin', 'manager']);`
  - [ ] Добавить логирование: `const telegramId = getTelegramId(req);` + INSERT в admin_logs
  
- [ ] `/api/admin/users.ts` - Применить `requireAuth(handler, ['admin'])`
  - [ ] (Тот же процесс, что выше, но с `['admin']`)

- [ ] `/api/admin/stats.ts` - Применить `requireAuth(handler, ['admin'])`

- [ ] `/api/admin/settings.ts` - Применить `requireAuth(handler, ['admin'])`

- [ ] `/api/admin/import.ts` - Применить `requireAuth(handler, ['admin'])`
  - [ ] ВАЖНО: При загрузке файла не забыть не устанавливать Content-Type

- [ ] `/api/admin/broadcast.ts` - Применить `requireAuth(handler, ['admin'])`

- [ ] `/api/admin/faq.ts` - Применить `requireAuth(handler, ['admin'])` (если существует)

## 🎨 Фаза 3: Обновление Фронтенда (TODO)

### Обновить все компоненты админки для использования fetchWithAuth

- [ ] `pages/admin/products.tsx` - Заменить fetch на fetchWithAuth
  - [ ] GET /api/admin/products
  - [ ] POST /api/admin/products
  - [ ] PUT /api/admin/products
  - [ ] DELETE /api/admin/products

- [ ] `pages/admin/orders.tsx` - Заменить fetch на fetchWithAuth
  - [ ] GET /api/admin/orders
  - [ ] PUT /api/admin/orders

- [ ] `pages/admin/users.tsx` - Заменить fetch на fetchWithAuth
  - [ ] GET /api/admin/users
  - [ ] PUT /api/admin/users
  - [ ] DELETE /api/admin/users

- [ ] `pages/admin/stats.tsx` - Заменить fetch на fetchWithAuth
  - [ ] GET /api/admin/stats

- [ ] `pages/admin/settings.tsx` - Заменить fetch на fetchWithAuth
  - [ ] GET /api/admin/settings
  - [ ] PUT /api/admin/settings

- [ ] `pages/admin/import.tsx` - Обновить для загрузки файла с заголовками
  - [ ] POST /api/admin/import (с FormData)

- [ ] `pages/admin/broadcast.tsx` - Заменить fetch на fetchWithAuth
  - [ ] POST /api/admin/broadcast

- [ ] `pages/admin/faq.tsx` - Заменить fetch на fetchWithAuth (если существует)
  - [ ] GET /api/admin/faq
  - [ ] POST /api/admin/faq
  - [ ] PUT /api/admin/faq
  - [ ] DELETE /api/admin/faq

## 🗄️ Фаза 4: База Данных (TODO)

- [ ] Создать таблицу `admin_logs` для логирования действий:
```sql
CREATE TABLE admin_logs (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id),
  INDEX idx_admin_logs_user (user_telegram_id),
  INDEX idx_admin_logs_created_at (created_at DESC)
);
```

- [ ] Убедиться, что таблица `users` имеет поля:
  - [x] `telegram_id` (BIGINT PRIMARY KEY) - ID пользователя
  - [x] `role` (VARCHAR DEFAULT 'buyer') - Роль (admin, manager, seller, buyer)
  - [x] `is_blocked` (BOOLEAN DEFAULT FALSE) - Статус блокировки

## 🧪 Фаза 5: Тестирование (TODO)

### Тесты для каждого эндпоинта

- [ ] `/api/admin/products.ts`
  - [ ] GET без заголовка → 401
  - [ ] GET с заголовком admin → 200
  - [ ] GET с заголовком buyer → 403
  - [ ] GET с заблокированным пользователем → 403
  - [ ] POST с admin → 200, записано в admin_logs
  - [ ] DELETE с admin → 200, записано в admin_logs

- [ ] `/api/admin/orders.ts` (когда будет защищён)
  - [ ] GET без заголовка → 401
  - [ ] GET с manager → 200
  - [ ] GET с admin → 200
  - [ ] GET с buyer → 403
  - [ ] PUT с manager → 200, записано в admin_logs

- [ ] Фронтенд админки
  - [ ] Все запросы содержат заголовок X-Telegram-Id в DevTools
  - [ ] Обработка 401 (перенаправление на логин)
  - [ ] Обработка 403 (показ ошибки "нет прав")

## 📚 Документация

### Созданные файлы
- [x] `AUTH_SYSTEM_SUMMARY.md` - Полный обзор системы аутентификации
- [x] `ADMIN_API_AUTH_GUIDE.md` - Как защищать админские эндпоинты
- [x] `ADMIN_API_ORDERS_EXAMPLE.md` - Пример полной защиты /api/admin/orders.ts
- [x] `FRONTEND_ADMIN_AUTH_SETUP.md` - Как обновлять фронтенд админки
- [ ] `AUTH_IMPLEMENTATION_CHECKLIST.md` - Этот чеклист (находится в процессе)

## 🔍 Быстрая справка

### Для защиты нового эндпоинта

```typescript
import { requireAuth, getTelegramId } from '../../../lib/auth';

async function handler(req, res) {
  if (req.method === 'POST') {
    const telegramId = getTelegramId(req); // ID пользователя
    // ... ваша логика
  }
}

export default requireAuth(handler, ['admin']); // Защита: только админы
```

### Для фронтенда

```typescript
import { fetchWithAuth } from '../../../lib/frontend/auth';

const response = await fetchWithAuth('/api/admin/products', {
  method: 'POST',
  body: JSON.stringify(data),
});
```

## ⚠️ Критические моменты

1. **НЕ ЗАБЫТЬ**:
   - [x] Переименовать `export default async function handler` → `async function handler`
   - [x] Добавить обёртку `export default requireAuth(handler, ['admin']);` в конце
   - [x] Импортировать `{ requireAuth, getTelegramId }`
   - [x] Использовать `getTelegramId(req)` для логирования

2. **ПРОВЕРИТЬ**:
   - [ ] Все админские API защищены
   - [ ] Все компоненты админки используют `fetchWithAuth()`
   - [ ] Таблица `admin_logs` создана в БД
   - [ ] DevTools показывает заголовок X-Telegram-Id в запросах

3. **БУДУЩИЕ УЛУЧШЕНИЯ**:
   - [ ] Добавить HMAC-SHA256 верификацию initData
   - [ ] Добавить rate limiting
   - [ ] Добавить двухфакторную аутентификацию для админов
   - [ ] Добавить refresh tokens

## 📊 Статус выполнения

```
Фаза 1 (Подготовка)      ████████████████████ 100% ✓
Фаза 2 (Backend API)     ████░░░░░░░░░░░░░░░░  20% (1 из 8 эндпоинтов)
Фаза 3 (Frontend)        ░░░░░░░░░░░░░░░░░░░░   0%
Фаза 4 (БД)              ░░░░░░░░░░░░░░░░░░░░   0%
Фаза 5 (Тестирование)    ░░░░░░░░░░░░░░░░░░░░   0%
────────────────────────────────────────────
ИТОГО                    ░░░░░░░░░░░░░░░░░░░░  16%
```

## 📝 Примечания

- Система поддерживает 4 роли: `admin`, `manager`, `seller`, `buyer`
- Админы имеют полный доступ ко всем API
- Менеджеры видят заказы, но не могут менять товары
- Продавцы будут использоваться для API курьеров (в будущем)
- Покупатели используют основной функционал магазина

## ✨ Что дальше

После завершения всех фаз система будет:
- ✓ Защищена от несанкционированного доступа
- ✓ Логировать все действия администраторов
- ✓ Позволять разные уровни доступа по ролям
- ✓ Предотвращать действия заблокированных пользователей
- ✓ Готова к дополнительной безопасности (HMAC-SHA256)
