# 🚨 КРАТКАЯ СВОДКА КРИТИЧЕСКИХ ПРОБЛЕМ БЕЗОПАСНОСТИ

**Статус:** 28 CRITICAL PROBLEMS FOUND
**Дата:** 7 апреля 2026
**Действовать:** IMMEDIATELY

---

## ⚡ TOP 10 САМЫХ КРИТИЧНЫХ ПРОБЛЕМ (ИСПРАВИТЬ СЕГОДНЯ)

### 1️⃣ MISSING AUTH - Публичный доступ к критичным endpoints
```
❌ /api/cart/items/[product_id] - POST/PUT БЕЗ AUTH
❌ /api/product-ratings - POST БЕЗ AUTH  
❌ /api/reviews - POST БЕЗ AUTH
❌ /api/recommendations - GET с user_id БЕЗ AUTH (anyone can enumerate users)
❌ /api/promocodes/apply - POST БЕЗ AUTH (anyone can use promo codes!)

📍 Статус: 5 endpoints доступны для атак
⏱️ Время исправления: 2 часа
```

### 2️⃣ TIMING ATTACKS - Уязвимости при сравнении токенов
```
❌ /api/admin/settings - confirmToken сравнивается через !==
❌ /api/bot - Telegram webhook secret сравнивается через !==

🔧 Решение: Заменить на crypto.timingSafeEqual()
⏱️ Время исправления: 30 минут
```

### 3️⃣ N+1 QUERIES - Потенциальный DDOS и timeout
```
❌ /api/admin/broadcast - loop с 10,000+ sendMessage (может зависнуть)
❌ /api/cron/price-drop-notifications - UPDATE после каждого message
❌ /api/admin/low-stock - sendMessage для каждого админа

💥 Имп: 10k users × 10 sec timeout = 27+ часов execution time!
⏱️ Время исправления: 4 часа
```

### 4️⃣ NO ROW-LEVEL SECURITY - Доступ к чужим данным
```
❌ /api/orders/[id] - Можно запросить любой order сразу по ID
❌ /api/addresses - Можно удалить адрес любого пользователя
❌ /api/cart - Можно изменить корзину любого пользователя

📍 Статус: Data leak + CRUD attacks на любые записи
⏱️ Время исправления: 3 часа
```

### 5️⃣ MISSING CSRF PROTECTION - CSRF attacks
```
❌ /api/cart - PUT/DELETE БЕЗ CSRF
❌ /api/addresses - POST/DELETE БЕЗ CSRF
❌ /api/favorites - POST/DELETE БЕЗ CSRF

🎯 Атака: Отправить link вроде /api/cart/delete - пользователь удалит свою корзину
⏱️ Время исправления: 1.5 часа
```

### 6️⃣ NO RATE LIMITING - Brute force attacks
```
❌ /api/orders/verify-code - 1 million guesses/sec possible
❌ /api/admin/import - Expensive operation without rate limit

🔐 Решение: RATE_LIMIT_PRESETS.veryStrict (5 req/min)
⏱️ Время исправления: 30 минут
```

### 7️⃣ RACE CONDITIONS - Double charging + data corruption
```
❌ /api/orders.ts - checkout может быть обработан 2 раза
❌ /api/admin/products/bulk-update - Lost update problem
❌ /api/cart - Race condition между читаем и обновлением items

💰 Имп: Double charging в платежах, потеря данных
⏱️ Время исправления: 3 часа
```

### 8️⃣ MISSING DATABASE INDEXES - Slow queries
```
❌ user_telegram_id (используется в 20+ queries)
❌ product_id (используется в JOINs)
❌ orders.status (используется для фильтрации)

🐌 Имп: ВСЕ SELECT запросы медленные, можно DoS через медленные queries
⏱️ Время исправления: 1 час
```

### 9️⃣ NO FOREIGN KEYS - Orphaned records
```
❌ order_items.product_id - может ссылаться на deleted product
❌ order_items.order_id - может быть orphaned если order deleted

📍 Статус: Database integrity issues, reporting bugs
⏱️ Время исправления: 1 час
```

### 🔟 INFO LEAK - User enumeration
```
❌ /api/recommendations?userId=123 - любой может перебрать все user IDs
❌ /api/gamification/leaderboard - нет LIMIT, может return 1M records

🎯 Атака: Enumerate все пользователи, узнать их покупки, создать рейтинги
⏱️ Время исправления: 1 час
```

---

## 📊 ДЕФЕКТЫ ПО КАТЕГОРИЯМ

| Категория | Count | Серьезность |
|-----------|-------|------------|
| Auth/CSRF | 5 | 🔴 CRITICAL |
| Performance | 6 | 🔴 CRITICAL |
| Data Integrity | 4 | 🔴 CRITICAL |
| Security | 8 | 🔴 CRITICAL |
| Database | 3 | 🔴 CRITICAL |
| Other | 2 | 🟠 HIGH |

---

## ✅ QUICK FIXES (30 MIN EACH)

### Fix #1: Apply timingSafeEqual 
```bash
grep -r "!== expectedSecret\|!== confirmToken" pages/api/
# найти все места и заменить на crypto.timingSafeEqual()
```

### Fix #2: Add requireAuth to endpoints
```bash
grep "export default async function handler\|export default handler;" pages/api/
# Обернуть в requireAuth() где нужно
```

### Fix #3: Add RATE_LIMIT_PRESETS.veryStrict
```bash
# На /api/orders/verify-code
export default rateLimit(handler, RATE_LIMIT_PRESETS.veryStrict);
```

### Fix #4: Add Row-Level Security Checks
```typescript
const order = await query(
  `SELECT * FROM orders WHERE id = $1 AND user_telegram_id = $2`,
  [orderId, currentTelegramId]
);
```

### Fix #5: Add CSRF Protection
```typescript
import { withCSRFProtection } from '@/lib/csrf';
export default withCSRFProtection(requireAuth(handler));
```

---

## 🎯 PRIORITY CHECKLIST

**СЕГОДНЯ (4-6 ЧАСОВ):**
- [ ] Добавить requireAuth на 5 endpoints
- [ ] Заменить timingSafeEqual на 2 местах  
- [ ] Добавить rate limiting на verify-code
- [ ] Добавить row-level security checks
- [ ] Добавить CSRF protection на 5 endpoints

**ЗАВТРА (8 ЧАСОВ):**
- [ ] Оптимизировать broadcast N+1 queries
- [ ] Оптимизировать price-drop N+1 queries
- [ ] Добавить DB indexes (3 основных)
- [ ] Добавить foreign key constraints
- [ ] Добавить input validation на admin endpoints

**ЭТОЙ НЕДЕЛЕ (20 ЧАСОВ):**
- [ ] Рефакторить bulk-update на batch
- [ ] Добавить FOR UPDATE в транзакциях
- [ ] Добавить idempotency keys на платежи
- [ ] Оптимизировать JOINs
- [ ] CORS configuration

---

## 📈 RISK MATRIX

```
              Вероятность       
             HIGH    MEDIUM  LOW
Т  CRITICAL   [X]      [ ]     [ ]
и    HIGH     [ ]      [X]     [ ]
ч  MEDIUM     [ ]      [ ]     [X]
к
и
ст
ь

Текущее состояние: МЫ НАХОДИМСЯ В КРАСНОЙ ЗОНЕ!
```

---

## 🚀 QUICK START

```bash
# 1. Вот полный отчет
cat SECURITY_ANALYSIS_CRITICAL_ISSUES.md

# 2. Начните с CRITICAL-004 (Missing Auth)
grep -r "export default async function handler\|export default rateLimit" pages/api/ | grep -v requireAuth

# 3. Для каждого файла добавьте:
# export default requireAuth(handler, ['customer']);

# 4. Затем CRITICAL-005 (Timing Attacks)
grep "confirmToken !==" pages/api/admin/settings.ts
# Заменить на crypto.timingSafeEqual()

# 5. Проверить что работает
npm run dev
# Проверить что endpoints требуют auth
```

---

## ⚠️ РИСК PRODUCTION

| Если не исправить | Риск |
|------------------|------|
| Missing Auth | 🔴 ANYONE CAN DELETE/MODIFY DATA |
| N+1 Queries | 🟠 GOES DOWN UNDER 10K USERS |
| Race Conditions | 💰 DOUBLE CHARGING IN PRODUCTION |
| No Indexes | 🟠 TAKES 1 HOUR PER QUERY |
| No Row-Level Security | 🔴 DATA LEAK OF ALL USERS |

---

## 📞 HELP NEEDED?

Смотри полный отчет: `SECURITY_ANALYSIS_CRITICAL_ISSUES.md`

Каждая проблема имеет:
- 📍 Точное местоположение в коде
- 📝 Код примера vulnerability
- ✅ Решение с примером кода
- ⏱️ Время на исправление
