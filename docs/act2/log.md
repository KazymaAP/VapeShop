# Лог действий - VapeShop Audit Fix Cycle 1

## Инициализация (05.04.2026 15:20)
- Создана папка `docs/act2` для отслеживания исправлений
- Инициализирован `state.json` с основными метриками
- Загруженный отчёт: 9 критических, 28 высоких, 31 средних, 14 низких, 7 незавершённых фич

## Исправления КРИТИЧЕСКИХ проблем (05.04.2026 15:30)

### CRIT-009: Добавлены импорты в rbac.ts ✅
- Файл: pages/api/admin/rbac.ts
- Добавлены: `import { requireAuth } from '@/lib/auth'`, `import { query } from '@/lib/db'`
- Добавлена типизация `NextApiRequest` и `NextApiResponse`

### CRIT-004: Валидация status в kanban.ts ✅
- Файл: pages/api/admin/kanban.ts
- Добавлена enum-валидация VALID_STATUSES перед UPDATE
- Предотвращена SQL injection через параметр status

### CRIT-006: Race condition (FOR UPDATE) ✅
- Файл: pages/api/orders.ts
- Добавлен SELECT с FOR UPDATE в начало транзакции
- Перепроверка количества товара после получения блокировки
- Расширенная обработка ошибок при недостатке товара

### CRIT-007: Bot error handler ✅
- Файл: pages/api/bot.ts
- Добавлен `bot.catch((err) => { console.error(...); })`
- Теперь ошибки бота логируются и не прерывают webhook

### CRIT-001: Ручные действия (подготовлено) ✅
- Создан файл manual_instructions.md с инструкциями
- Требуется ручная ротация токенов BotFather и пароля Neon

## Исправления ВЫСОКИХ приоритетов (05.04.2026 15:30)

### HIGH-014: Import в pages.ts ✅
- Файл: pages/api/admin/pages.ts
- Добавлен `import { requireAuth } from '@/lib/auth'`

### HIGH-012: Синтаксис catch в kanban.ts ✅
- Файл: pages/api/admin/kanban.ts
- Исправлено: `catch {}` → `catch (err)`
- Исправлена ошибка с переменной `_e`

### HIGH-013: Синтаксис catch в db-backup.ts ✅
- Файл: pages/api/cron/db-backup.ts
- Исправлено: `catch {}` → `catch (err)`
- Переменная `_e` заменена на `err`

### HIGH-008: getTelegramIdFromRequest в product-ratings.ts ✅
- Файл: pages/api/product-ratings.ts
- Заменено: `requireAuth(req, res)` → `getTelegramIdFromRequest(req)`
- Добавлена проверка авторизации с status 401

## Исправления СРЕДНИХ приоритетов (05.04.2026 15:30)

### MED-025: Удалён хардкод в import-csv.js ✅
- Файл: import-csv.js
- Удалена real DATABASE_URL строка
- Добавлена проверка переменной окружения с exit(1)

---

## Очередь исправлений
- **Фаза 1**: 4 из 9 критических исправлены ✅
- **Фаза 2**: Начало работы с остальными CRITICAL и HIGH
- **Фаза 3**: Среднеприоритетные проблемы
- **Фаза 4**: Низкоприоритетные
- **Фаза 5**: Незавершённые фичи

