# Чек-лист оставшихся действий

## 🔴 КРИТИЧЕСКИЕ (9)

### [РУЧНОЕ] CRIT-001: Ротация токенов
- [ ] Ротировать TELEGRAM_BOT_TOKEN в BotFather
- [ ] Ротировать DATABASE_URL пароль в Neon
- [ ] Обновить .env.local.example с плейсхолдерами
- **Инструкция в**: `manual_instructions.md`

### [КОД] CRIT-002: Redis для CSRF (требует Upstash)
- [ ] Установить @upstash/redis
- [ ] Создать Redis инстанс на Upstash
- [ ] Обновить lib/csrf.ts с Redis хранилищем

### [КОД] CRIT-003: Redis для Rate Limiting
- [ ] Установить @upstash/ratelimit
- [ ] Обновить lib/rateLimit.ts с Upstash

### [КОД] CRIT-004: Валидация status в kanban.ts
- [ ] Добавить enum проверку в pages/api/admin/kanban.ts

### [КОД] CRIT-005: Telegram ID только из initData
- [ ] Проверить все эндпоинты на исходе telegram_id из body/query

### [SQL] CRIT-006: Race condition (FOR UPDATE)
- [ ] Добавить FOR UPDATE в транзакцию orders.ts

### [КОД] CRIT-007: Bot error handler
- [ ] Добавить bot.catch() в pages/api/bot.ts

### [КОД] CRIT-008: Порядок middleware
- [ ] Переделать export в pages/api/admin/orders.ts

### [КОД] CRIT-009: Добавить импорты в rbac.ts
- [ ] Импортировать requireAuth и query

---

## 🟠 ВЫСОКИЕ (28) - в процессе

### Быстрые исправления кода (HIGH-012, HIGH-013, HIGH-014, etc.)
- [ ] HIGH-012: catch блок в kanban.ts
- [ ] HIGH-013: catch блок в cron/db-backup.ts
- [ ] HIGH-014: import в pages.ts
- [ ] HIGH-008: getTelegramIdFromRequest в product-ratings.ts
- [ ] HIGH-016: referralStats в profile.tsx

### Исправления BД (HIGH-006, HIGH-015, HIGH-017, etc.)
- [ ] HIGH-006: Консолидировать имена таблиц
- [ ] HIGH-015: Определить каноническую схему carts
- [ ] HIGH-017: Исправить таблицы в leaderboard.ts
- [ ] HIGH-018: Исправить balance.ts
- [ ] HIGH-019: Исправить support/customers.ts
- [ ] HIGH-020: Исправить manager-stats.ts
- [ ] HIGH-021: Создать таблицу order_history
- [ ] HIGH-022: Исправить recommendations.ts
- [ ] HIGH-023: Консолидировать admin_logs/audit_log
- [ ] HIGH-027: Исправить export-orders.ts

---

## 🟡 СРЕДНИЕ (31)

### Конфиг и миграции
- [ ] MED-005: Удалить дублирование saved_for_later
- [ ] MED-006: Консолидировать compare_items
- [ ] MED-020: Консолидировать ab_tests
- [ ] MED-028: Создать таблицу settings
- [ ] MED-025: Убрать хардкод в import-csv.js
- [ ] MED-010: Исправить redirect в next.config.js

### React Router / Next.js
- [ ] MED-021: Исправить tracking/index.tsx
- [ ] MED-022: Исправить admin/kanban.tsx
- [ ] MED-023: Создать middleware.ts
- [ ] MED-030: Исправить Toast import

---

## ⚪ НИЗКИЕ (14)

- [ ] LOW-006: Создать public/no-image.png и favicon.ico
- [ ] LOW-012: Исправить vercel.json cron endpoints
- [ ] LOW-009: Обновить Link синтаксис на новый

---

## 📦 НЕЗАВЕРШЁННЫЕ ФИЧИ (7)

- [ ] FEAT-001: Реализовать upload изображений в Supabase
- [ ] FEAT-003: Интегрировать геймификацию в покупки
- [ ] (остальные — позже)

---

**ИТОГО ДЛЯ ИСПРАВЛЕНИЯ**: ~89 проблем
**РУЧНЫХ ДЕЙСТВИЙ**: 1 (CRIT-001)
**АВТОМАТИЧЕСКИХ**: ~88
