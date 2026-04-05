# Все проблемы найденные в Цикле 2

## КРИТИЧЕСКИЕ (SECURITY/BUGS)

### 1. ❌ SECURITY: pages/api/orders/index.ts — telegram_id без верификации

- Файл: pages/api/orders/index.ts
- Проблема: Получает telegram_id из query параметров без верификации HMAC
- Причина: Позволяет получить заказы кого-то другого
- Решение: Использовать getTelegramIdFromRequest() для верификации
- Приоритет: CRITICAL
- Статус: ИСПРАВЛЕНО ✅

## ВЫСОКИЙ ПРИОРИТЕТ (TYPESCRIPT ANY ERRORS)

### 2. lib/db.ts — Multiple `any` типов

- Строки: 18, 34, 47
- Проблема: Использование `any` вместо конкретных типов
- Статус: ИСПРАВЛЕНО ✅

### 3. lib/auth.ts — `any` типы

- Строки: 286, 311
- Проблема: (req as any).telegramId
- Статус: ИСПРАВЛЕНО ✅

### 4. lib/useFetch.ts — 5x `any` типов

- Строки: 11, 13, 17, 22, 93
- Проблема: Неопределённые типы для generic функций
- Статус: ОЖИДАНИЕ

### 5. lib/useSWR.ts — 6x `any` типов

- Строки: 9, 13, 64, 105, 156, 197
- Проблема: Неопределённые типы для generic
- Статус: ОЖИДАНИЕ

### 6. components/ActivationModal.tsx — 5x `any` типов

- Строки: 274, 289, 304, 319, 333
- Проблема: Callback типы без явного указания
- Статус: ОЖИДАНИЕ

### 7. lib/validate.ts — 2x `any` типов

- Строки: 263 (2 раза)
- Проблема: Типы для JSON операций
- Статус: ОЖИДАНИЕ

### 8. lib/analytics.ts — 3x `any` типов

- Строки: 11, 64, 79
- Проблема: Неопределённые типы для tracking
- Статус: ОЖИДАНИЕ

## СРЕДНИЙ ПРИОРИТЕТ (UNUSED VARS/IMPORTS)

### 9. components/FeaturedProducts.tsx — Unused import SkeletonLoader

- Строка: 11
- Статус: ИСПРАВЛЕНО ✅

### 10. components/OrderExportButton.tsx — Unused import safeFetch

- Строка: 7
- Статус: ИСПРАВЛЕНО ✅

### 11. components/OrderTimeline.tsx — Unused variable isUpcoming

- Строка: 69
- Статус: ИСПРАВЛЕНО ✅

### 12. lib/searchSuggestions.tsx — Unused variable e

- Строка: 30
- Статус: ИСПРАВЛЕНО ✅

### 13. lib/telegram.ts — Unused import useCallback

- Строка: 1
- Статус: ИСПРАВЛЕНО ✅

### 14. lib/validation.ts — Unused constant PAYMENT_STATUS

- Строка: 10
- Статус: ИСПРАВЛЕНО ✅

## НИЗКИЙ ПРИОРИТЕТ (CONSOLE STATEMENTS)

### 15. pages/api/cron/abandoned-cart.ts — 7x console.log

- Строки: 32, 50, 72, 88, 134, 136, 149
- Решение: Заменить на logger или удалить
- Статус: ОЖИДАНИЕ

### 16. pages/api/cron/cleanup-old-sessions.ts — console.log

- Строка: 75
- Статус: ОЖИДАНИЕ

### 17. components/ImageUpload.tsx — console.log

- Строка: 84
- Статус: ОЖИДАНИЕ

### 18. lib/logger.ts — 3x console (в самом логгере)

- Строки: 78, 90
- Статус: ДОПУСТИМО (это logger)

## WARNINGS (REACT HOOKS)

### 19+ Missing useCallback/dependencies в 30+ файлах

- Проблема: missing dependency в useEffect
- Решение: Обернуть в useCallback или добавить в dependencies
- Статус: ОЖИДАНИЕ (низкий приоритет)

---

## СТАТИСТИКА

- ✅ Исправлено: 6
- 🔄 В процессе: 0
- ⏳ Ожидание: 18+
- 📊 Всего: 24+

## ПОРЯДОК ИСПРАВЛЕНИЯ

Следующие для исправления по приоритетам:

1. ✅ [КРИТИЧЕСКАЯ] orders/index.ts security
2. ✅ [ВЫСОКИЙ] db.ts any типы
3. ✅ [ВЫСОКИЙ] auth.ts any типы
4. [ВЫСОКИЙ] useFetch.ts any типы
5. [ВЫСОКИЙ] useSWR.ts any типы
6. [ВЫСОКИЙ] ActivationModal.tsx any типы
7. [ВЫСОКИЙ] validate.ts any типы
8. [ВЫСОКИЙ] analytics.ts any типы
   9-14. [СРЕДНИЙ] Unused imports/vars (уже готово)
   15+. [НИЗКИЙ] Console statements (можно пропустить)
   20+. [НИЗКИЙ] React hooks warnings
