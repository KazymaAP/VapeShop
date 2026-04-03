# 🚀 ПЛАН ДОВЕДЕНИЯ VapeShop ДО PRODUCTION-READY

**Дата начала**: 2026-04-03  
**Статус**: 🟡 В ПРОЦЕССЕ  
**Версия**: 1.0.0

---

## 📋 СТРУКТУРА РАБОТ

### ✅ ФАЗА 1: КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ (2-3 часа)

**Статус**: 🟢 НАЧАТО

#### 1.1 Защита Admin API - requireAuth (7 файлов)
- [ ] `pages/api/admin/orders.ts` — ✅ ИСПРАВЛЕНО 
  - Добавлены импорт `requireAuth` и экспорт с `requireAuth(handler, ['admin', 'manager'])`
- [ ] `pages/api/admin/import.ts` — TODO
- [ ] `pages/api/admin/stats.ts` — TODO
- [ ] `pages/api/admin/settings.ts` — TODO
- [ ] `pages/api/admin/broadcast.ts` — TODO
- [ ] `pages/api/admin/users.ts` — TODO
- [ ] `pages/api/admin/products.ts` — TODO

**Выполнено**: 1/7  
**Время**: 30 сек × 7 = 3.5 мин (экономно, так как одинаковый pattern)

#### 1.2 Критические ошибки в коде (3 файла)
- [ ] `pages/api/orders.ts` — исправить createInvoiceLink
- [ ] `lib/db.ts` — исправить rejectUnauthorized
- [ ] `components/ActivationModal.tsx` — улучшить валидацию

**Время**: 15 + 5 + 10 = 30 минут

#### 1.3 Проверка принадлежности в публичных API (4 файла)
- [ ] `pages/api/addresses.ts` — добавить проверку telegram_id
- [ ] `pages/api/cart.ts` — добавить проверку telegram_id
- [ ] `pages/api/favorites.ts` — добавить проверку telegram_id
- [ ] `pages/api/reviews.ts` — добавить проверку telegram_id

**Время**: 10 мин × 4 = 40 минут

**ИТОГО ФАЗА 1**: ~1.5 часа активной работы

---

### 🟡 ФАЗА 2: РЕФАКТОРИНГ И УЛУЧШЕНИЯ (2-3 часа)

**Статус**: ⏳ ОЖИДАЕТ

#### 2.1 Единый формат ошибок
- [ ] Создать `lib/errorHandler.ts`
- [ ] Обновить все API эндпоинты

**Время**: 1 час

#### 2.2 Типизация API ответов
- [ ] Создать `types/api.ts`
- [ ] Обновить обработчики API

**Время**: 1 час

#### 2.3 Кэширование и оптимизация
- [ ] Добавить ISR в `pages/index.tsx`
- [ ] Добавить индексы БД
- [ ] Rate limiting

**Время**: 1 час

**ИТОГО ФАЗА 2**: ~3 часа

---

### 🟤 ФАЗА 3: ПОВТОРНЫЙ АУДИТ И ФИНАЛЬНЫЕ ИСПРАВЛЕНИЯ

**Статус**: ⏳ ОЖИДАЕТ

- [ ] Полный анализ всех API
- [ ] Тестирование всех критических путей
- [ ] Исправление найденных ошибок

**ИТОГО ФАЗА 3**: ~2 часа

---

### 📊 ФАЗА 4: ФИНАЛЬНЫЙ ОТЧЁТ

**Статус**: ⏳ ОЖИДАЕТ

- [ ] Создать `docs/fixes/FINAL_REPORT.md`
- [ ] Резюме готовности к production

**ИТОГО ФАЗА 4**: 30 минут

---

## 🎯 КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ (ДЕТАЛИ)

### 1. Защита Admin API

**Шаблон исправления:**
```typescript
// ДО:
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') { ... }
}

// ПОСЛЕ:
import { requireAuth } from '../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') { ... }
}

export default requireAuth(handler, ['admin']);  // или ['admin', 'manager']
```

**Список файлов для ФАЗЫ 1.1:**
1. `pages/api/admin/orders.ts` — роль: `['admin', 'manager']`
2. `pages/api/admin/import.ts` — роль: `['admin']`
3. `pages/api/admin/stats.ts` — роль: `['admin']`
4. `pages/api/admin/settings.ts` — роль: `['admin']`
5. `pages/api/admin/broadcast.ts` — роль: `['admin']`
6. `pages/api/admin/users.ts` — роль: `['admin']`
7. `pages/api/admin/products.ts` — роль: `['admin']`

---

### 2. Исправление createInvoiceLink в pages/api/orders.ts

**Проблема**: 
```typescript
// Строка 41 - опасно разбирать TOKEN
process.env.TELEGRAM_BOT_TOKEN!.split(':')[0]
```

**Решение**:
1. Добавить в `.env` переменную `TELEGRAM_BOT_ID=123456789`
2. Использовать `process.env.TELEGRAM_BOT_ID!` вместо разбора TOKEN
3. Добавить валидацию товаров перед созданием заказа

---

### 3. Исправление rejectUnauthorized в lib/db.ts

**Проблема**:
```typescript
ssl: { rejectUnauthorized: false }  // ⚠️ ОПАСНО на production
```

**Решение**:
```typescript
ssl: process.env.NODE_ENV === 'production' 
  ? { rejectUnauthorized: true }
  : { rejectUnauthorized: false }
```

---

### 4. Проверка принадлежности в API

**Шаблон:**
```typescript
// В начало добавить
import { getTelegramIdFromRequest } from '../../lib/auth';

// В начало handler
const currentTelegramId = await getTelegramIdFromRequest(req);
if (!currentTelegramId) {
  return res.status(401).json({ error: 'Unauthorized' });
}

// При DELETE/PUT
if (telegram_id !== currentTelegramId) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

**Файлы**:
1. `pages/api/addresses.ts`
2. `pages/api/cart.ts`
3. `pages/api/favorites.ts`
4. `pages/api/reviews.ts`

---

## 📈 СТАТИСТИКА ГОТОВНОСТИ

| Фаза | Задачи | Выполнено | % | Статус |
|------|--------|-----------|---|--------|
| **ФАЗА 1** | 14 | 1 | 7% | 🟡 В ПРОЦЕССЕ |
| **ФАЗА 2** | 6 | 0 | 0% | ⏳ ОЖИДАЕТ |
| **ФАЗА 3** | 3 | 0 | 0% | ⏳ ОЖИДАЕТ |
| **ФАЗА 4** | 2 | 0 | 0% | ⏳ ОЖИДАЕТ |
| **ИТОГО** | 25 | 1 | 4% | 🟡 НАЧАЛО |

---

## ⏱️ ВРЕМЕННЫЕ ОЦЕНКИ

| Фаза | Время | Статус |
|------|-------|--------|
| ФАЗА 1 | 1.5 часа | 🟡 В ПРОЦЕССЕ |
| ФАЗА 2 | 3 часа | ⏳ ОЖИДАЕТ |
| ФАЗА 3 | 2 часа | ⏳ ОЖИДАЕТ |
| ФАЗА 4 | 0.5 часа | ⏳ ОЖИДАЕТ |
| **ИТОГО** | **6.5 часов** | 🟡 НАЧАЛО |

---

## 📝 ВЕДОМОСТЬ ВЫПОЛНЕНИЯ

### ✅ ВЫПОЛНЕНО

1. ✅ **2026-04-03 15:30** — Добавлена защита `pages/api/admin/orders.ts` с requireAuth
   - Добавлен импорт `requireAuth` из lib/auth
   - Переименован export на `requireAuth(handler, ['admin', 'manager'])`
   - Статус: ГОТОВО

---

### 🟡 В ПРОЦЕССЕ

Исправление остальных 6 admin API файлов (import, stats, settings, broadcast, users, products)

---

### ⏳ ОЖИДАЕТ

- Фаза 1.2-1.3: Критические ошибки и проверка принадлежности
- Фаза 2: Рефакторинг и улучшения
- Фаза 3: Повторный аудит
- Фаза 4: Финальный отчёт

---

## 🚦 СЛЕДУЮЩИЕ ШАГИ

1. **Продолжить ФАЗУ 1.1** — добавить requireAuth к остальным 6 admin API
2. После каждого файла запускать `npm run build && npm run lint`
3. Перейти к ФАЗЕ 1.2 (критические ошибки)
4. Перейти к ФАЗЕ 1.3 (проверка принадлежности)

---

**Создано автоматически при анализе проекта**  
**Версия: 1.0.0**  
**Последнее обновление: 2026-04-03 15:30 UTC**
