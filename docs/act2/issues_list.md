# Список проблем из audit report

## 🔴 КРИТИЧЕСКИЕ (9)

- [ ] CRIT-001: Реальные секреты в .env.local и .env.local.example (ручное действие)
- [ ] CRIT-002: CSRF защита не работает на Vercel (in-memory) (код/redis)
- [ ] CRIT-003: Rate limiting не работает на Vercel (in-memory) (код/redis)
- [ ] CRIT-004: SQL инъекция через status в kanban.ts (код)
- [ ] CRIT-005: Telegram ID из req.body не верифицируется (код)
- [ ] CRIT-006: Race condition при создании заказа (код/sql)
- [ ] CRIT-007: Отсутствие error handler бота (код)
- [ ] CRIT-008: Некорректный порядок middleware в orders.ts (код)
- [ ] CRIT-009: Отсутствуют импорты в rbac.ts (код)

## 🟠 ВЫСОКИЕ (28)

- [ ] HIGH-001: Отсутствие timeout для fetch (код)
- [ ] HIGH-002: N+1 запросы в activate.ts (код)
- [ ] HIGH-003: Валидация промокода (код)
- [ ] HIGH-004: Обработка ошибок платежей (код)
- [ ] HIGH-005: Отсутствие индексов в БД (sql)
- [ ] HIGH-006: Несоответствие имён таблиц (sql/код)
- [ ] HIGH-007: Проверка роли в users/role.ts (код)
- [ ] HIGH-008: Авторизация в product-ratings.ts (код)
- [ ] HIGH-009: Утечка памяти в setInterval (код)
- [ ] HIGH-010: Middleware в orders.ts (код)
- [ ] HIGH-011: Обработка ошибки удаления товара (код)
- [ ] HIGH-012: Синтаксическая ошибка в kanban.ts (код)
- [ ] HIGH-013: Несуществующая _e в catch блоке (код)
- [ ] HIGH-014: Отсутствует import в pages.ts (код)
- [ ] HIGH-015: Неверная схема таблицы carts (sql)
- [ ] HIGH-016: referralStats не определён (код)
- [ ] HIGH-017: Неверные таблицы в leaderboard.ts (код)
- [ ] HIGH-018: Неверное поле в balance.ts (код)
- [ ] HIGH-019: Неверное поле в support/customers.ts (код)
- [ ] HIGH-020: Неверные поля в manager-stats.ts (код)
- [ ] HIGH-021: Отсутствует таблица order_history (sql)
- [ ] HIGH-022: Неверный JOIN в recommendations.ts (код)
- [ ] HIGH-023: Консолидация admin_logs (sql/код)
- [ ] HIGH-024: SQL инъекция в dashboard-stats.ts (код)
- [ ] HIGH-025: Парсинг ctx.match в bot/handlers.ts (код)
- [ ] HIGH-026: Проверка productIds в compare.ts (код)
- [ ] HIGH-027: Неверные поля в export-orders.ts (код)
- [ ] HIGH-028: Timeout для broadcast.ts (код)

## 🟡 СРЕДНИЕ (31)

- [ ] MED-001: Несогласованность типов orders.id
- [ ] MED-002: Неиспользуемые параметры
- [ ] MED-003: console.log в production
- [ ] MED-004: Дублирование generate_referral_code
- [ ] MED-005: saved_for_later создаётся 4 раза
- [ ] MED-006: compare_items с разными схемами
- [ ] MED-007: Отсутствие метатегов SEO
- [ ] MED-008: Жёсткокодированные URL
- [ ] MED-009: Отсутствие error boundary
- [ ] MED-010: Неверный redirect в next.config.js
- [ ] MED-011: tailwind.config.js incomplete
- [ ] MED-012: Отсутствует проверка на аутентификацию
- [ ] MED-013: Неправильный тип для product.promotion
- [ ] MED-014: CROSS JOIN LATERAL проблема
- [ ] MED-015: Устаревший Link синтаксис
- [ ] MED-016: Отсутствует loading state
- [ ] MED-017: Отсутствует pagination в users.ts
- [ ] MED-018: Хардкод URL в keyboards.ts
- [ ] MED-019: Отсутствует очистка cart
- [ ] MED-020: ab_tests создаётся дважды
- [ ] MED-021: useSearchParams в Pages Router
- [ ] MED-022: 'use client' в kanban.tsx
- [ ] MED-023: Отсутствует middleware.ts
- [ ] MED-024: Отсутствует проверка initData expiry
- [ ] MED-025: Хардкод DATABASE_URL в import-csv.js
- [ ] MED-026: Отсутствует загрузка изображений
- [ ] MED-027: Отсутствует error handling в cron
- [ ] MED-028: Отсутствует таблица settings
- [ ] MED-029: Дублирование логики авторизации
- [ ] MED-030: Toast компонент import error
- [ ] MED-031: Неоптимальное использование индексов

## ⚪ НИЗКИЕ (14)

- [ ] LOW-001: Несогласованный стиль миграций
- [ ] LOW-002: Закомментированный код
- [ ] LOW-003: Магические числа
- [ ] LOW-004: Неполный .gitignore
- [ ] LOW-005: _e не объявлен (дублирует HIGH-005)
- [ ] LOW-006: Отсутствует favicon
- [ ] LOW-007: TypeScript strict unused
- [ ] LOW-008: Отсутствует JSDoc
- [ ] LOW-009: Старый синтаксис Link
- [ ] LOW-010: Отсутствует robots.txt
- [ ] LOW-011: optimizePackageImports неверный
- [ ] LOW-012: vercel.json cron endpoints
- [ ] LOW-013: ESLint правила
- [ ] LOW-014: Dockerfile .env* в .dockerignore

## 📦 НЕЗАВЕРШЁННЫЕ ФИЧИ (7)

- [ ] FEAT-001: Система изображений (Supabase upload)
- [ ] FEAT-002: A/B тестирование
- [ ] FEAT-003: Геймификация
- [ ] FEAT-004: GPS трекинг курьера
- [ ] FEAT-005: Уведомления о снижении цен
- [ ] FEAT-006: Страница баланса
- [ ] FEAT-007: Real-time чат (WebSocket)
