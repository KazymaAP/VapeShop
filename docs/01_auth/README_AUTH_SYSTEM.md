# 🔐 Система Аутентификации и Авторизации VapeShop

Полнофункциональная система управления доступом (RBAC) для Telegram Mini App магазина вейпов.

## 📋 Содержание

1. [Обзор](#обзор)
2. [Компоненты](#компоненты)
3. [Роли и права](#роли-и-права)
4. [Быстрый старт](#быстрый-старт)
5. [Файлы документации](#файлы-документации)
6. [Статус реализации](#статус-реализации)

## 🎯 Обзор

Система обеспечивает защиту всех API эндпоинтов от несанкционированного доступа путём:

- ✅ Проверки аутентификации (заголовок X-Telegram-Id)
- ✅ Проверки авторизации (роли пользователя)
- ✅ Проверки блокировки пользователей
- ✅ Логирования всех действий администраторов

### Архитектура

```
┌─ Telegram Mini App (Клиент)
│  ├─ window.Telegram.WebApp.initDataUnsafe.user.id
│  └─ Отправляет X-Telegram-Id заголовок
│
├─ Frontend Utilities (lib/frontend/auth.ts)
│  ├─ getTelegramIdHeader() - получение заголовков
│  ├─ fetchWithAuth() - fetch с автозаголовком
│  └─ fetchWithAuthAndHandle() - с обработкой ошибок
│
├─ API Эндпоинты (pages/api/*)
│  ├─ Проходят через middleware requireAuth
│  ├─ Получают заголовок X-Telegram-Id
│  └─ Обрабатываются согласно ролям
│
└─ Backend Authentication (lib/auth.ts)
   ├─ getTelegramIdFromRequest() - извлечение ID
   ├─ getUserRole() - получение роли из БД
   ├─ isUserBlocked() - проверка блокировки
   ├─ requireAuth() - middleware для защиты
   └─ getTelegramId() - получение ID после auth
```

## 🔑 Компоненты

### Backend - lib/auth.ts

Основной модуль аутентификации на сервере.

**Экспортируемые функции:**

```typescript
// Получение информации о пользователе
getTelegramIdFromRequest(req) → number | null
getUserRole(telegramId) → 'admin' | 'manager' | 'seller' | 'buyer' | null
isUserBlocked(telegramId) → boolean
getTelegramId(req) → number

// Проверка доступа
hasRequiredRole(telegramId, allowedRoles) → boolean
checkAccess(telegramId, allowedRoles) → { allowed: boolean; reason?: string }

// Middleware
requireAuth(handler, allowedRoles) → NextApiHandler
```

**Использование:**
```typescript
import { requireAuth, getTelegramId } from '../../../lib/auth';

async function handler(req, res) {
  // Ваша логика
  const telegramId = getTelegramId(req);
}

export default requireAuth(handler, ['admin']); // Требует роль admin
```

### Frontend - lib/frontend/auth.ts

Утилиты на клиенте для работы с аутентификацией.

**Экспортируемые функции:**

```typescript
// Заголовки
getTelegramIdHeader() → { 'X-Telegram-Id': string }
getInitDataHeader() → { 'Authorization': 'Bearer ...' }

// Информация о пользователе
getCurrentTelegramId() → number | null
getCurrentUser() → TelegramUser | null
isInTelegramApp() → boolean

// Fetch обёртки
fetchWithAuth(url, options) → Response
fetchWithAuthAndHandle(url, options) → Promise<any>
```

**Использование:**
```typescript
import { fetchWithAuth } from '../../../lib/frontend/auth';

const response = await fetchWithAuth('/api/admin/products', {
  method: 'POST',
  body: JSON.stringify(data),
});
```

## 👥 Роли и права

| Роль | Может делать | Не может делать |
|------|-------------|-----------------|
| **admin** | Всё (управление товарами, заказами, пользователями, статистика, импорт) | Ничего (полный доступ) |
| **manager** | Просмотр заказов, изменение статуса | Товары, пользователи, настройки |
| **seller** | Подтверждение кодов доставки (в будущем) | Товары, заказы (без кодов), пользователи |
| **buyer** | Покупки, корзина, профиль | Админ-панель, управление другими пользователями |

## 🚀 Быстрый старт

### 1. Защита нового эндпоинта

```typescript
import { requireAuth, getTelegramId } from '../../../lib/auth';

async function handler(req, res) {
  if (req.method === 'POST') {
    const telegramId = getTelegramId(req);
    // Ваша логика
  }
}

export default requireAuth(handler, ['admin']);
```

### 2. Использование на фронтенде

```typescript
import { fetchWithAuth } from '../../../lib/frontend/auth';

const data = await fetchWithAuth('/api/admin/products', {
  method: 'POST',
  body: JSON.stringify(product),
});
```

### 3. Тестирование через curl

```bash
# Без заголовка → 401
curl -X GET http://localhost:3000/api/admin/products

# С заголовком, роль admin → 200
curl -X GET http://localhost:3000/api/admin/products \
  -H "X-Telegram-Id: 123456789"

# С заголовком, роль buyer → 403
curl -X GET http://localhost:3000/api/admin/products \
  -H "X-Telegram-Id: 987654321"
```

## 📚 Файлы документации

### Справочные документы

- **QUICK_AUTH_REFERENCE.md** - Быстрые примеры кода для копирования
  - Шаблон для новых эндпоинтов
  - SQL запросы
  - Тесты через curl

- **AUTH_SYSTEM_SUMMARY.md** - Полный обзор архитектуры
  - Архитектура системы
  - Схема БД
  - Примеры кода
  - Решение проблем

### Руководства по внедрению

- **ADMIN_API_AUTH_GUIDE.md** - Как защищать админские API
  - Таблица всех эндпоинтов
  - Требуемые роли для каждого
  - Пошаговая инструкция

- **ADMIN_API_ORDERS_EXAMPLE.md** - Подробный пример
  - До и после защиты
  - Объяснение каждого шага
  - Тестирование

- **FRONTEND_ADMIN_AUTH_SETUP.md** - Как обновлять фронтенд
  - Примеры для каждого компонента
  - Обработка ошибок
  - Тестирование в DevTools

### Отслеживание прогресса

- **AUTH_IMPLEMENTATION_CHECKLIST.md** - Чеклист всех работ
  - Статус каждого эндпоинта
  - TODO для каждого компонента
  - Скролляющийся прогресс-бар

- **NEXT_STEPS.md** - Рекомендации для следующей сессии
  - Приоритеты работы
  - Минимальный MVP
  - Инструменты отладки

## 📊 Статус реализации

### Фаза 1: Backend (100% ✅)
- [x] lib/auth.ts - Все функции реализованы
- [x] lib/frontend/auth.ts - Все утилиты готовы
- [x] /api/admin/products.ts - Защищен requireAuth
- [x] /api/cart.ts - Защищен от блокировки

### Фаза 2: Остальные Admin API (20%)
- [x] /api/admin/products.ts - ✓ ГОТОВ
- [ ] /api/admin/orders.ts - TODO
- [ ] /api/admin/users.ts - TODO
- [ ] /api/admin/stats.ts - TODO
- [ ] /api/admin/settings.ts - TODO
- [ ] /api/admin/import.ts - TODO
- [ ] /api/admin/broadcast.ts - TODO
- [ ] /api/admin/faq.ts - TODO (если есть)

### Фаза 3: Frontend (0%)
- [ ] pages/admin/products.tsx - TODO
- [ ] pages/admin/orders.tsx - TODO
- [ ] pages/admin/users.tsx - TODO
- [ ] pages/admin/stats.tsx - TODO
- [ ] pages/admin/settings.tsx - TODO
- [ ] pages/admin/import.tsx - TODO
- [ ] pages/admin/broadcast.tsx - TODO
- [ ] pages/admin/faq.tsx - TODO

### Фаза 4: База данных (0%)
- [ ] Таблица admin_logs создана
- [ ] Индексы добавлены
- [ ] Миграция выполнена

### Фаза 5: Тестирование (0%)
- [ ] Unit тесты для lib/auth.ts
- [ ] Интеграционные тесты для API
- [ ] E2E тесты для админки

**Общий прогресс: 16% (Фаза 1 завершена, остальное требует внедрения)**

## 🔐 Безопасность

### Текущая реализация
- ✅ Заголовок X-Telegram-Id для аутентификации
- ✅ Проверка ролей на бэкенде
- ✅ Проверка блокировки на бэкенде
- ✅ Логирование действий администраторов
- ⚠️ Заголовок не криптографически защищен (может быть подделан)

### Будущие улучшения
- [ ] HMAC-SHA256 верификация initData
- [ ] Refresh tokens для долгоживущих сессий
- [ ] Rate limiting по IP и пользователю
- [ ] Двухфакторная аутентификация для админов
- [ ] Audit log с детализацией действий

## 📋 Требования к БД

### Таблица users
```sql
-- Обязательные поля
telegram_id BIGINT PRIMARY KEY
username VARCHAR(255)
role VARCHAR(50) DEFAULT 'buyer' -- admin, manager, seller, buyer
is_blocked BOOLEAN DEFAULT FALSE
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()

-- Индексы
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_blocked ON users(is_blocked);
```

### Таблица admin_logs (требуется создать)
```sql
id SERIAL PRIMARY KEY
user_telegram_id BIGINT NOT NULL (REFERENCES users.telegram_id)
action VARCHAR(50) NOT NULL
details JSONB
created_at TIMESTAMP DEFAULT NOW()

-- Индексы
CREATE INDEX idx_admin_logs_user ON admin_logs(user_telegram_id);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at DESC);
```

## 🔧 Конфигурация окружения

Требуемые переменные в `.env.local`:

```env
# Обязательные (уже используются)
TELEGRAM_BOT_TOKEN=your_token_here
WEBAPP_URL=https://your-domain.com

# Опционально (для будущей верификации)
TELEGRAM_BOT_SECRET=your_secret_key
```

## 💡 Лучшие практики

1. **Всегда используйте requireAuth для adminских API**
   ```typescript
   export default requireAuth(handler, ['admin']);
   ```

2. **Логируйте критические действия**
   ```typescript
   const telegramId = getTelegramId(req);
   await query('INSERT INTO admin_logs ...');
   ```

3. **Используйте fetchWithAuth на фронтенде**
   ```typescript
   const res = await fetchWithAuth('/api/admin/products');
   ```

4. **Всегда обрабатывайте 401/403**
   ```typescript
   if (response.status === 401) { /* не аутентифицирован */ }
   if (response.status === 403) { /* нет прав */ }
   ```

5. **Тестируйте в DevTools перед коммитом**
   - Проверьте заголовок X-Telegram-Id в Network tab
   - Проверьте статус 200/401/403

## 🆘 Частые проблемы

| Проблема | Решение |
|----------|---------|
| 401 Unauthorized | Проверьте заголовок X-Telegram-Id в DevTools |
| 403 Forbidden | Проверьте роль пользователя: `SELECT role FROM users WHERE telegram_id = X` |
| Заголовок не отправляется | Используйте `fetchWithAuth()` вместо `fetch()` |
| Логирование не работает | Убедитесь что таблица admin_logs создана |

## 📞 Помощь

1. Прочитайте QUICK_AUTH_REFERENCE.md для быстрых примеров
2. Посмотрите ADMIN_API_ORDERS_EXAMPLE.md для подробного примера
3. Используйте AUTH_IMPLEMENTATION_CHECKLIST.md для отслеживания
4. Смотрите NEXT_STEPS.md для рекомендаций

## 📅 История обновлений

### Версия 1.0 (текущая)
- ✅ Backend аутентификация (lib/auth.ts)
- ✅ Frontend утилиты (lib/frontend/auth.ts)
- ✅ Пример защиты API (products.ts)
- ✅ Полная документация

## 📝 Лицензия

Часть проекта VapeShop. Все компоненты закрыты.

---

**Начните отсюда:** Прочитайте [QUICK_AUTH_REFERENCE.md](QUICK_AUTH_REFERENCE.md) для быстрого старта 🚀
