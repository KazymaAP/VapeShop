# Обновление фронтенда админки для отправки заголовков аутентификации

## Обзор

Все компоненты админки в `pages/admin/*` должны отправлять заголовок `X-Telegram-Id` при запросах к API. Это необходимо для идентификации пользователя на бэкенде.

## Способ 1: Используем готовую функцию `fetchWithAuth` (рекомендуется)

### Импорт

```typescript
import { fetchWithAuth } from '../../../lib/frontend/auth';
```

### Использование

```typescript
// Вместо
// const response = await fetch('/api/admin/products', { ... });

// Используйте
const response = await fetchWithAuth('/api/admin/products', {
  method: 'POST',
  body: JSON.stringify({ name: 'Product', price: 100 }),
});
```

### С обработкой ошибок

```typescript
import { fetchWithAuthAndHandle } from '../../../lib/frontend/auth';

const response = await fetchWithAuthAndHandle(
  '/api/admin/products',
  { method: 'POST', body: JSON.stringify(data) },
  (status) => {
    if (status === 401) {
      console.log('Требуется аутентификация');
      // Перенаправить на логин
    }
    if (status === 403) {
      console.log('У вас недостаточно прав');
    }
  }
);
```

## Способ 2: Ручное добавление заголовка

```typescript
import { getTelegramIdHeader } from '../../../lib/frontend/auth';

async function createProduct(data) {
  const response = await fetch('/api/admin/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getTelegramIdHeader(),
    },
    body: JSON.stringify(data),
  });
  return response.json();
}
```

## Примеры для каждого компонента админки

### pages/admin/products.tsx

```typescript
import { fetchWithAuth } from '../../../lib/frontend/auth';

// Получить список товаров
async function loadProducts() {
  const response = await fetchWithAuth('/api/admin/products');
  const data = await response.json();
  setProducts(data.products);
}

// Создать товар
async function handleAddProduct(product) {
  const response = await fetchWithAuth('/api/admin/products', {
    method: 'POST',
    body: JSON.stringify(product),
  });
  const data = await response.json();
  // ...
}

// Обновить товар
async function handleUpdateProduct(productId, updates) {
  const response = await fetchWithAuth('/api/admin/products', {
    method: 'PUT',
    body: JSON.stringify({ id: productId, ...updates }),
  });
  const data = await response.json();
  // ...
}

// Удалить товар
async function handleDeleteProduct(productId) {
  const response = await fetchWithAuth('/api/admin/products', {
    method: 'DELETE',
  });
  // ...
}
```

### pages/admin/orders.tsx

```typescript
import { fetchWithAuth } from '../../../lib/frontend/auth';

async function loadOrders() {
  const response = await fetchWithAuth('/api/admin/orders');
  const data = await response.json();
  setOrders(data.orders);
}

async function updateOrderStatus(orderId, newStatus) {
  const response = await fetchWithAuth('/api/admin/orders', {
    method: 'PUT',
    body: JSON.stringify({ id: orderId, status: newStatus }),
  });
  const data = await response.json();
  // ...
}
```

### pages/admin/users.tsx

```typescript
import { fetchWithAuth } from '../../../lib/frontend/auth';

async function loadUsers() {
  const response = await fetchWithAuth('/api/admin/users');
  const data = await response.json();
  setUsers(data.users);
}

async function blockUser(userId) {
  const response = await fetchWithAuth('/api/admin/users', {
    method: 'PUT',
    body: JSON.stringify({ id: userId, is_blocked: true }),
  });
  const data = await response.json();
  // ...
}

async function changeUserRole(userId, newRole) {
  const response = await fetchWithAuth('/api/admin/users', {
    method: 'PUT',
    body: JSON.stringify({ id: userId, role: newRole }),
  });
  const data = await response.json();
  // ...
}
```

### pages/admin/stats.tsx

```typescript
import { fetchWithAuth } from '../../../lib/frontend/auth';

async function loadStats() {
  const response = await fetchWithAuth('/api/admin/stats');
  const data = await response.json();
  setStats(data);
}

async function loadChart(period) {
  const response = await fetchWithAuth(`/api/admin/stats?period=${period}`);
  const data = await response.json();
  setChartData(data.chart);
}
```

### pages/admin/import.tsx

```typescript
import { fetchWithAuth } from '../../../lib/frontend/auth';

async function handleImportCSV(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/admin/import', {
    method: 'POST',
    headers: {
      ...getTelegramIdHeader(),
      // Не устанавливаем Content-Type - браузер сделает это автоматически
    },
    body: formData,
  });

  const data = await response.json();
  // ...
}
```

### pages/admin/settings.tsx

```typescript
import { fetchWithAuth } from '../../../lib/frontend/auth';

async function loadSettings() {
  const response = await fetchWithAuth('/api/admin/settings');
  const data = await response.json();
  setSettings(data.settings);
}

async function saveSettings(newSettings) {
  const response = await fetchWithAuth('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(newSettings),
  });
  const data = await response.json();
  // ...
}
```

### pages/admin/broadcast.tsx

```typescript
import { fetchWithAuth } from '../../../lib/frontend/auth';

async function sendBroadcast(message, filter) {
  const response = await fetchWithAuth('/api/admin/broadcast', {
    method: 'POST',
    body: JSON.stringify({ message, filter }),
  });
  const data = await response.json();
  // ...
}
```

## Обработка ошибок аутентификации

Рекомендуется создать обёртку для обработки 401/403:

```typescript
// lib/frontend/authErrorHandler.ts
export async function fetchWithAuthErrorHandling(url: string, options?: RequestInit) {
  const response = await fetchWithAuth(url, options);

  if (response.status === 401) {
    // Пользователь не аутентифицирован
    // Перенаправить на страницу логина или показать модальное окно
    window.location.href = '/login';
    return null;
  }

  if (response.status === 403) {
    // Пользователь не имеет доступа
    alert('У вас недостаточно прав для этого действия');
    return null;
  }

  return response;
}
```

Затем используйте везде в админке:

```typescript
const response = await fetchWithAuthErrorHandling('/api/admin/products');
if (response) {
  const data = await response.json();
  // ...
}
```

## Чеклист обновления компонентов

- [ ] `pages/admin/products.tsx` - Обновить все fetch на fetchWithAuth
- [ ] `pages/admin/orders.tsx` - Обновить все fetch на fetchWithAuth
- [ ] `pages/admin/users.tsx` - Обновить все fetch на fetchWithAuth
- [ ] `pages/admin/stats.tsx` - Обновить все fetch на fetchWithAuth
- [ ] `pages/admin/settings.tsx` - Обновить все fetch на fetchWithAuth
- [ ] `pages/admin/import.tsx` - Обновить fetch (особенно для FormData)
- [ ] `pages/admin/broadcast.tsx` - Обновить все fetch на fetchWithAuth
- [ ] `pages/admin/faq.tsx` - Обновить все fetch на fetchWithAuth (если существует)
- [ ] Создать обработчик ошибок аутентификации (опционально)

## Тестирование

1. Откройте админку в браузере
2. Откройте DevTools (F12) → Network
3. Сделайте запрос в админке
4. Проверьте, что заголовок `X-Telegram-Id` присутствует в запросе
5. Проверьте, что бэкенд возвращает 200 (успех), а не 401 или 403

## Возможные проблемы

### Проблема: получаю 401 Unauthorized

**Причина**: `X-Telegram-Id` заголовок не отправляется
**Решение**: Убедитесь, что используете `fetchWithAuth()` или `getTelegramIdHeader()`

### Проблема: получаю 403 Forbidden

**Причина**: Пользователь не имеет требуемой роли
**Решение**: Проверьте, что ваш пользователь имеет роль `admin` в БД. Запрос в консоли:

```sql
SELECT telegram_id, role FROM users WHERE telegram_id = <YOUR_ID>;
```

### Проблема: window.Telegram undefined

**Причина**: Компонент отрисовывается на сервере (SSR)
**Решение**: Используйте `useEffect` для получения данных:

```typescript
useEffect(() => {
  const header = getTelegramIdHeader();
  // используйте header
}, []);
```

## Резюме

1. **Вместо `fetch()` используйте `fetchWithAuth()`** - это одна строка и всё работает
2. **Или ручно добавляйте заголовок**: `...getTelegramIdHeader()`
3. **Обрабатывайте ошибки**: Проверяйте на 401 и 403 статусы
4. **Тестируйте в DevTools** - смотрите заголовки запросов
