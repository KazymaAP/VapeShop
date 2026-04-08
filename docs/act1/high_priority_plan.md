# 🟠 HIGH PRIORITY ISSUES - План исправления

## Статус: Cycle 1 завершен

**Исправлено CRITICAL:** 16/27 ✅  
**Начало HIGH:** Готово к фазе 2

---

## Список HIGH приоритета (29 проблем)

### LOG-CONSOLE-ERROR-001 - console.error → logger (100+ мест)

Найдено ~100+ использований `console.error/warn/log` в:
- `lib/bot/handlers.ts` (8+ мест)
- `lib/notifications.ts` (12+ мест)
- `lib/csrf.ts` (10+ мест)
- `lib/gamification.ts` (5+ мест)
- `pages/api/**/*.ts` (20+ мест)
- `components/**/*.tsx` (20+ мест)
- И ещё в 30+ файлах

**Рекомендация:** Использовать одноименный скрипт для автоматической замены или делать вручную по приоритету критических файлов

---

### CONF-CSP-001 - CSP Header с 'unsafe-inline'
- Файл: `next.config.js`
- Статус: ❌ НЕ ИСПРАВЛЕНО
- Действие: Заменить на nonce-based CSP

### PERF-PAGINATION-001 - Отсутствие пагинации в API (15+ endpoints)
- Файлы: `pages/api/orders.ts`, `pages/api/admin/users.ts`, и т.д.
- Статус: ❌ НЕ ИСПРАВЛЕНО
- Действие: Добавить LIMIT/OFFSET

### TYPE-ANY-001 - Использование `any` типов (32 найдено)
- Статус: ❌ НЕ ИСПРАВЛЕНО
- Действие: Заменить на конкретные типы

### HMAC-VERIFY-001 - HMAC верификация не везде
- Статус: ✅ ЧАСТИЧНО (основное использование исправлено)

### SOFT-DELETE-FILTERING-001 - Queries не фильтруют deleted_at
- Статус: ❌ НЕ ИСПРАВЛЕНО
- Действие: Добавить WHERE deleted_at IS NULL везде

### TODO-FIXME-001 - TODO/FIXME комментарии без плана
- Статус: ❌ НЕ ИСПРАВЛЕНО
- Действие: Создать issue для каждого

### И ещё 22 HIGH приоритета...

---

## 🎯 Следующие шаги (Фаза 2)

1. Установить пакеты (критич для работы):
   ```bash
   npm install @upstash/redis sharp isomorphic-dompurify
   ```

2. Запустить миграции:
   ```bash
   npm run migrate:prod
   ```

3. Настроить .env для:
   - Upstash Redis
   - Telegram Bot Token

4. HIGH приоритета - начать с:
   - LOG-CONSOLE-ERROR-001 (100+ мест)
   - CONF-CSP-001 (next.config.js)
   - PERF-PAGINATION-001 (15+ endpoints)
   - SOFT-DELETE-FILTERING-001 (queries)

5. Протестировать все CRITICAL исправления

---

