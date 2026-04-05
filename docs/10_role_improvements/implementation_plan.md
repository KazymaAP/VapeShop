# 📋 ПЛАН РЕАЛИЗАЦИИ: 4 СПРИНТА ПО РОЛЕВЫМ УЛУЧШЕНИЯМ

**Версия:** 1.0  
**Дата:** 2026-04-03  
**Объём:** 4 спринта x 1 неделя = 4 недели  
**Общее время:** 60-70 часов разработки

---

## 🎯 СПРИНТ 1: СУПЕР-АДМИН + АДМИН (неделя 1)

**Цель:** Создать систему управления администраторами, логирование, графики и экспорт для админов.

### Задачи Sprint 1

#### 1.1 Миграция БД (День 1 утро, 2-3 часа)

**Файл:** `db/migrations/010_role_improvements_part1.sql`

Создать таблицы:

```sql
-- 1. audit_log (логирование всех действий)
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(telegram_id),
  action VARCHAR(255) NOT NULL, -- 'create', 'update', 'delete', 'export', etc.
  target_type VARCHAR(100), -- 'product', 'order', 'user', 'promo', etc.
  target_id VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  details TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- 2. promotions (расписание акций)
CREATE TABLE promotions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50), -- 'percent', 'fixed', 'buy_x_get_y'
  discount_value DECIMAL(10,2),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  applicable_product_ids INT[], -- массив product_id
  applicable_categories INT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_by BIGINT REFERENCES users(telegram_id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. gift_certificates (подарочные сертификаты)
CREATE TABLE gift_certificates (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  recipient_id BIGINT REFERENCES users(telegram_id),
  created_by BIGINT REFERENCES users(telegram_id),
  used_at TIMESTAMP,
  used_by_id BIGINT REFERENCES users(telegram_id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. product_history (история изменения товаров)
CREATE TABLE product_history (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id),
  admin_id BIGINT NOT NULL REFERENCES users(telegram_id),
  field_name VARCHAR(100),
  old_value VARCHAR(500),
  new_value VARCHAR(500),
  changed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_product_history_product ON product_history(product_id);

-- 5. Add new column: role = 'super_admin'
-- Уже существуют роли: 'admin', 'manager', 'customer'
-- Добавить в enum или проверить: 'super_admin', 'support', 'courier'

-- 6. Добавить колонки в существующие таблицы
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manager_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manager_id BIGINT REFERENCES users(telegram_id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS old_price DECIMAL(10,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_support_agent BOOLEAN DEFAULT FALSE;
ALTER TABLE wishlist ADD COLUMN IF NOT EXISTS notify_on_discount BOOLEAN DEFAULT FALSE;
```

**Status:** TODO

#### 1.2 Обновить lib/auth.ts (День 1 утро-вечер, 1 час)

**Файл:** `lib/auth.ts`

Добавить функции:

```typescript
// Новые роли
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'support' | 'courier' | 'customer';

// Проверка super_admin
export async function isSuperAdmin(telegramId: string): Promise<boolean> {
  const user = await db.query('SELECT role FROM users WHERE telegram_id = $1', [telegramId]);
  return user.rows[0]?.role === 'super_admin';
}

// Проверка support
export async function isSupport(telegramId: string): Promise<boolean> {
  const user = await db.query('SELECT is_support_agent FROM users WHERE telegram_id = $1', [
    telegramId,
  ]);
  return user.rows[0]?.is_support_agent === true;
}

// Проверка courier
export async function isCourier(telegramId: string): Promise<boolean> {
  const user = await db.query('SELECT role FROM users WHERE telegram_id = $1', [telegramId]);
  return user.rows[0]?.role === 'courier';
}
```

**Status:** TODO

#### 1.3 API: Audit Logs (День 1 вечер, 1.5 часа)

**Файл:** `pages/api/admin/audit-logs.ts`

```typescript
// GET /api/admin/audit-logs?limit=50&offset=0&user_id=123&action=update
// Требует: super_admin или admin
// Возвращает: список действий с фильтрацией
```

**Status:** TODO

#### 1.4 API: RBAC (управление ролями) (День 1 вечер - День 2 утро, 3-4 часа)

**Файл:** `pages/api/admin/rbac.ts`

```typescript
// GET /api/admin/rbac/roles – список ролей и их прав
// POST /api/admin/rbac/roles – создать роль
// PUT /api/admin/rbac/roles/[role] – обновить роль
// DELETE /api/admin/rbac/roles/[role] – удалить роль (только super_admin)

// Структура роли:
interface Role {
  id: string;
  name: string;
  permissions: string[]; // ['view_orders', 'edit_orders', 'delete_users', etc.]
  created_by: string;
  created_at: Date;
}
```

**Status:** TODO

#### 1.5 API: Массовое редактирование товаров (День 2, 2 часа)

**Файл:** `pages/api/admin/products/bulk-update.ts`

```typescript
// POST /api/admin/products/bulk-update
// Body: {
//   product_ids: [1, 2, 3],
//   updates: {
//     price_change: { type: 'percent', value: 10 }, // +10%
//     category_id: 5,
//     status: 'active'
//   }
// }

// Возвращает: { updated_count: 3, errors: [] }
```

**Status:** TODO

#### 1.6 API: Дашборд с графиками (День 2, 2-3 часа)

**Файл:** `pages/api/admin/dashboard-advanced.ts`

```typescript
// GET /api/admin/dashboard-advanced?period=month
// Возвращает: {
//   revenue_by_day: [ { date, amount }, ... ],
//   top_products: [ { id, name, count, revenue }, ... ],
//   top_categories: [ ... ],
//   sales_map: { city: count, ... },
//   kpi: { total_revenue, total_orders, avg_order, growth_percent }
// }

// Использовать: GROUP BY для агрегации, индексы для скорости
```

**Status:** TODO

#### 1.7 API: Экспорт в Excel (День 2, 2 часа)

**Файл:** `pages/api/admin/orders/export.ts`

```typescript
// GET /api/admin/orders/export?format=xlsx&fields=order_id,total,status,date
// Использовать: exceljs для создания .xlsx
// Возвращает: файл для скачивания
```

**Status:** TODO

#### 1.8 UI: Дашборд суперадмина (День 2-3, 3-4 часа)

**Файл:** `pages/admin/super/index.tsx`

Компоненты:

- Таблица администраторов (с возможностью добавить/удалить)
- Таблица audit_log с фильтрами
- Графики из recharts (выручка, заказы, товары)
- Кнопка "Экспорт в Excel"

**Status:** TODO

#### 1.9 UI: Управление ролями (День 3, 2-3 часа)

**Файл:** `pages/admin/super/roles.tsx`

Компоненты:

- Таблица ролей
- Модальное окно создания/редактирования роли
- Чекбоксы для прав (permissions)

**Status:** TODO

---

## 🎯 СПРИНТ 2: МЕНЕДЖЕР + ПОКУПАТЕЛЬ (неделя 2)

**Цель:** Расширить функционал менеджеров для работы с заказами и улучшить опыт покупателей.

### Задачи Sprint 2

#### 2.1 Миграция БД (1 час)

**Файл:** `db/migrations/010_role_improvements_part2.sql`

Таблицы:

```sql
-- 1. manager_notes_history
CREATE TABLE manager_notes_history (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id),
  manager_id BIGINT NOT NULL REFERENCES users(telegram_id),
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. saved_for_later
CREATE TABLE saved_for_later (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(telegram_id),
  product_id INT NOT NULL REFERENCES products(id),
  saved_at TIMESTAMP DEFAULT NOW()
);

-- 3. compare_items
CREATE TABLE compare_items (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(telegram_id),
  product_ids INT[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. referral_stats
CREATE TABLE referral_stats (
  id SERIAL PRIMARY KEY,
  referrer_id BIGINT NOT NULL REFERENCES users(telegram_id),
  referee_id BIGINT NOT NULL REFERENCES users(telegram_id),
  bonus_amount DECIMAL(10,2),
  order_id INT REFERENCES orders(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. template_responses
CREATE TABLE template_responses (
  id SERIAL PRIMARY KEY,
  created_by BIGINT NOT NULL REFERENCES users(telegram_id),
  title VARCHAR(255),
  content TEXT,
  category VARCHAR(100), -- 'support', 'manager', 'courier'
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Status:** TODO

#### 2.2 API: Комментарии к заказам (2 часа)

**Файл:** `pages/api/orders/[id]/notes.ts`

```typescript
// GET /api/orders/[id]/notes – получить историю заметок
// POST /api/orders/[id]/notes – добавить заметку (только менеджер)
// PUT /api/orders/[id]/notes/[note_id] – редактировать (только автор)
// DELETE /api/orders/[id]/notes/[note_id] – удалить (только автор или admin)
```

**Status:** TODO

#### 2.3 API: Реферральная система (2-3 часа)

**Файл:** `pages/api/user/referral.ts`

```typescript
// GET /api/user/referral – получить реферальную ссылку, статистику
// POST /api/user/referral/use?code=ABC123 – использовать реферальный код
// GET /api/user/balance – получить баланс
// POST /api/user/balance/use – списать бонусы на заказ

// При создании заказа + referrer_id:
// - Начислить 5% от суммы referrer'у
// - Сохранить в referral_stats
```

**Status:** TODO

#### 2.4 API: Отложенная корзина (1.5 часа)

**Файл:** `pages/api/cart/saved.ts`

```typescript
// GET /api/cart/saved – получить отложенные товары
// POST /api/cart/[item_id]/save-for-later – переместить в отложено
// POST /api/cart/saved/[item_id]/restore – вернуть в корзину
// DELETE /api/cart/saved/[item_id] – удалить
```

**Status:** TODO

#### 2.5 API: Сравнение товаров (1.5 часа)

**Файл:** `pages/api/products/compare.ts`

```typescript
// POST /api/products/compare – сохранить для сравнения
// GET /api/products/compare – получить список сравнения
// DELETE /api/products/compare/[product_id] – удалить из сравнения
```

**Status:** TODO

#### 2.6 API: Трекинг заказа (1.5 часа)

**Файл:** `pages/api/orders/[id]/tracking.ts`

```typescript
// GET /api/orders/[id]/tracking
// Возвращает: {
//   status: 'readyship',
//   status_history: [ { status, changed_at, by_user }, ... ],
//   expected_delivery: '2026-04-05',
//   delivery_method: 'courier',
//   courier_info: { name, phone, location: { lat, lng } },
//   pickup_point: { name, address, hours },
//   tracking_url: 'https://...'
// }
```

**Status:** TODO

#### 2.7 UI: Профиль покупателя - вкладки (2-3 часа)

**Файл:** `pages/profile.tsx` (обновить)

Добавить вкладки:

- Мои заказы (существует, расширить с трекингом)
- Избранное (существует)
- Отложенное (NEW) – saved_for_later
- Сравнение (NEW) – compare_items
- Баланс и рефералы (NEW) – referral_stats, user_balance
- Настройки уведомлений

**Status:** TODO

#### 2.8 UI: Страница сравнения (1.5 часа)

**Файл:** `pages/compare.tsx`

Компоненты:

- Таблица характеристик товаров
- Кнопка "Удалить из сравнения"
- Кнопка "Добавить все в корзину"

**Status:** TODO

#### 2.9 UI: Трекинг заказа (2-3 часа)

**Файл:** `pages/tracking/[orderId].tsx`

Компоненты:

- Timeline с статусами
- Карта курьера (если courier)
- Информация о самовывозе (если pickup)
- История изменений

**Status:** TODO

#### 2.10 UI: Расширенный канбан менеджера (2-3 часа)

**Файл:** `pages/admin/kanban.tsx` (обновить)

Улучшения:

- Карточка заказа: номер, сумма, кол-во товаров, дата, статус оплаты
- Кнопка "Связаться с клиентом" → открыть чат/Telegram
- История изменений при наведении
- Комментарии менеджера в карточке

**Status:** TODO

---

## 🎯 СПРИНТ 3: КУРЬЕР + САППОРТ (неделя 3)

**Цель:** Создать интерфейсы для курьеров и службы поддержки.

### Задачи Sprint 3

#### 3.1 Миграция БД (1 час)

**Файл:** `db/migrations/010_role_improvements_part3.sql`

Таблицы:

```sql
-- 1. courier_performance
CREATE TABLE courier_performance (
  id SERIAL PRIMARY KEY,
  courier_id BIGINT NOT NULL REFERENCES users(telegram_id),
  deliveries_today INT DEFAULT 0,
  deliveries_week INT DEFAULT 0,
  rating FLOAT DEFAULT 5.0,
  earnings DECIMAL(10,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. courier_deliveries (tasks)
CREATE TABLE courier_deliveries (
  id SERIAL PRIMARY KEY,
  courier_id BIGINT NOT NULL REFERENCES users(telegram_id),
  order_id INT NOT NULL REFERENCES orders(id),
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  photo_url VARCHAR(500),
  signature_url VARCHAR(500),
  notes TEXT,
  status VARCHAR(50), -- 'assigned', 'in_progress', 'completed', 'failed'
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. support_tickets
CREATE TABLE support_tickets (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(telegram_id),
  subject VARCHAR(255),
  message TEXT,
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  assigned_to BIGINT REFERENCES users(telegram_id),
  related_order_id INT REFERENCES orders(id),
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- 4. support_ticket_replies
CREATE TABLE support_ticket_replies (
  id SERIAL PRIMARY KEY,
  ticket_id INT NOT NULL REFERENCES support_tickets(id),
  user_id BIGINT NOT NULL REFERENCES users(telegram_id),
  message TEXT,
  attachment_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. chat_messages (WebSocket чат)
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  from_user_id BIGINT NOT NULL REFERENCES users(telegram_id),
  to_user_id BIGINT NOT NULL REFERENCES users(telegram_id),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_chat_messages_users ON chat_messages(from_user_id, to_user_id);
```

**Status:** TODO

#### 3.2 API: Список заказов для курьера (1 час)

**Файл:** `pages/api/courier/deliveries.ts`

```typescript
// GET /api/courier/deliveries?date=2026-04-03
// Возвращает: список заказов на день с адресами, контактами, приоритетами
// POST /api/courier/deliveries/[id]/start – начать доставку
// POST /api/courier/deliveries/[id]/complete – завершить с фото и подписью
```

**Status:** TODO

#### 3.3 API: Отметка о доставке с фото (2-3 часа)

**Файл:** `pages/api/courier/deliveries/[id]/complete.ts`

```typescript
// POST /api/courier/deliveries/[id]/complete
// Body: { photo_base64, signature_base64, notes }
// Возвращает: { status: 'completed', delivery_proof_url }

// Сохранить фото на Supabase и обновить courier_deliveries
```

**Status:** TODO

#### 3.4 API: Поиск клиента (1 час)

**Файл:** `pages/api/support/search-customer.ts`

```typescript
// GET /api/support/search-customer?phone=+7900...&telegram_id=123
// Возвращает: { user_id, name, phone, email, orders: [...] }
```

**Status:** TODO

#### 3.5 API: Support tickets (1.5 часа)

**Файл:** `pages/api/support/tickets.ts`

```typescript
// GET /api/support/tickets – получить список
// POST /api/support/tickets/[id]/reply – ответить на обращение
// PUT /api/support/tickets/[id] – обновить статус (assign, resolve)
```

**Status:** TODO

#### 3.6 UI: Курьер - список доставок (2-3 часа)

**Файл:** `pages/courier/deliveries.tsx`

Компоненты:

- Список заказов на день (карточки с адресом, контактом)
- Карта с маршрутом
- Кнопка "Начать" / "Завершить"
- Статистика (кол-во доставлено, бонусы)

**Status:** TODO

#### 3.7 UI: Курьер - отметка доставки (2 часа)

**Файл:** `pages/courier/deliveries/[id]/complete.tsx`

Компоненты:

- Загрузка фото (камера или галерея)
- Поле для подписи (Canvas)
- Поле для заметок
- Кнопка "Доставлено"

**Status:** TODO

#### 3.8 UI: Саппорт - поиск клиента (1.5 часа)

**Файл:** `pages/support/search.tsx`

Компоненты:

- Input для поиска (по телефону или telegram_id)
- Карточка клиента с его заказами
- Кнопка "Открыть обращение"

**Status:** TODO

#### 3.9 UI: Саппорт - управление обращениями (2-3 часа)

**Файл:** `pages/support/tickets.tsx`

Компоненты:

- Таблица/список обращений
- Модальное окно с историей переписки
- Поле для ответа
- Кнопка "Отметить как решено"

**Status:** TODO

---

## 🎯 СПРИНТ 4: ОБЩИЕ УЛУЧШЕНИЯ (неделя 4)

**Цель:** Оптимизация, дизайн, аналитика и интеграции.

### Задачи Sprint 4

#### 4.1 Адаптивный дизайн (3-4 часа)

**Файлы:** все pages/admin/\*, pages/

- Проверить на мобильном (375px, 768px, 1024px)
- Переделать таблицы на мобильных в карточки
- Оптимизировать touch targets (минимум 44x44px)

**Status:** TODO

#### 4.2 Переключатель темы (1 час)

**Файл:** `components/ThemeToggle.tsx` (NEW)

- Toggle в navbar
- Сохранять в localStorage
- Использовать CSS variables для цветов

**Status:** TODO

#### 4.3 SEO оптимизация (1-2 часа)

**Файл:** `lib/seo.ts` (NEW)

- Meta tags на все страницы
- Open Graph для шаринга
- Robots.txt и sitemap.xml

**Status:** TODO

#### 4.4 Аналитика (2 часа)

**Файл:** `lib/analytics.ts` (NEW)

- Интеграция с Amplitude или Google Analytics
- Отслеживание событий: view_product, add_to_cart, purchase, etc.
- Custom events для ролей

**Status:** TODO

#### 4.5 A/B тестирование (2-3 часа)

**Файл:** `lib/ab-testing.ts` (NEW)

- Простая система для показа разных версий главной
- Сохранение выбора в localStorage
- Метрики по вариантам

**Status:** TODO

#### 4.6 Telegram Premium интеграция (1-2 часа)

**Файл:** `lib/telegram-premium.ts` (NEW)

- Проверка isPremium в useTelegramWebApp()
- Функция для получения скидки Premium пользователю
- Бэдж "Premium" на товарах

**Status:** TODO

#### 4.7 Геймификация (2-3 часа)

**Файлы:** `lib/gamification.ts`, `pages/profile.tsx`

- Уровни пользователя (bronze, silver, gold, platinum)
- Бейджи за достижения (first_purchase, 10_orders, referrer, etc.)
- Лидерборд рефереров

**Status:** TODO

#### 4.8 WebSocket интеграция для чата (3-4 часа)

**Файлы:** `lib/websocket.ts`, `pages/admin/chat.tsx`, `pages/courier/chat.tsx`

- Настроить socket.io сервер на Vercel (или альтернатива)
- Компонент ChatWindow для общения менеджер ↔ курьер
- Real-time уведомления о новых сообщениях

**Status:** TODO

#### 4.9 Дизайн улучшения (2-3 часа)

**Файлы:** все компоненты

- Новые иконки (Lucide React)
- Анимации переходов
- Loading skeletons
- Error boundaries

**Status:** TODO

#### 4.10 Документация и тестирование (2-3 часа)

**Файлы:** docs/10_role_improvements/\*

- Инструкция по тестированию каждой роли
- Тестовые сценарии
- API документация (если Swagger)

**Status:** TODO

---

## 📊 ЗАВИСИМОСТИ МЕЖДУ СПРИНТАМИ

```
Sprint 1 (Super-admin)
├─ Миграция 010 (FOUNDATION)
├─ lib/auth.ts обновление
├─ API эндпоинты (audit, rbac, bulk-update, dashboard, export)
└─ UI дашборд суперадмина

Sprint 2 (Manager + Customer)
├─ Зависит от: Sprint 1 (новые роли в auth.ts)
├─ API: комментарии, реферралы, отложенное, сравнение, трекинг
├─ UI: профиль, сравнение, трекинг, расширенный канбан
└─ Интеграция с уведомлениями (lib/notifications.ts)

Sprint 3 (Courier + Support)
├─ Зависит от: Sprint 1, 2 (auth, notifications)
├─ API: доставка, поиск клиента, tickets
├─ UI: курьер-приложение, саппорт
└─ Интеграция с чатом (socket.io)

Sprint 4 (Общие улучшения)
├─ Зависит от: Sprint 1, 2, 3 (все API и UI готовы)
├─ WebSocket чат (должен быть ready)
├─ Аналитика и A/B тестирование
└─ Финальная оптимизация
```

---

## 🚀 РЕКОМЕНДУЕМАЯ SCHEDULE

### Неделя 1 (Sprint 1)

- **Пн утро:** Миграция 010, обновление lib/auth.ts
- **Пн день:** API для audit_log, rbac
- **Пн вечер - Вт утро:** API для bulk-update, dashboard, export
- **Вт день:** UI дашборд суперадмина
- **Вт вечер - Ср утро:** UI управления ролями, тестирование
- **Ср день-вечер:** Баг-фиксы, documentation

### Неделя 2 (Sprint 2)

- **Пн утро:** Миграция часть 2, API для комментариев, реферралов
- **Пн день:** API для saved_for_later, compare, tracking
- **Пн вечер - Вт утро:** UI профиля, сравнения, трекинга
- **Вт день:** Расширение канбана менеджера, интеграция с уведомлениями
- **Вт вечер - Ср утро:** Тестирование, баг-фиксы
- **Ср день:** Documentation

### Неделя 3 (Sprint 3)

- **Пн утро:** Миграция часть 3, API для курьеров
- **Пн день:** API для саппорта, chat_messages
- **Пн вечер - Вт утро:** UI курьера (список, завершение)
- **Вт день:** UI саппорта (поиск, tickets)
- **Вт вечер - Ср утро:** WebSocket интеграция, тестирование
- **Ср день:** Documentation

### Неделя 4 (Sprint 4)

- **Пн утро:** Адаптивный дизайн, переключатель темы
- **Пн день:** SEO, аналитика, A/B тестирование
- **Пн вечер - Вт утро:** Telegram Premium, геймификация
- **Вт день:** WebSocket чат (полная реализация)
- **Вт вечер - Ср утро:** Design polish, animations
- **Ср день:** Final testing & documentation
- **Ср вечер - Чт:** Deploy, monitoring

---

## ✅ КОНТРОЛЬНЫЙ ЛИСТ СПРИНТОВ

### Sprint 1

- [ ] Миграция 010 применена
- [ ] lib/auth.ts обновлена (новые роли)
- [ ] Все 6 API эндпоинтов работают
- [ ] UI дашборда готово
- [ ] requireAuth проверена на всех эндпоинтах
- [ ] Тестирование super-admin функций
- [ ] Documentation

### Sprint 2

- [ ] Миграция часть 2 применена
- [ ] API для менеджера работают
- [ ] API для покупателя работают
- [ ] UI профиля расширена (все вкладки)
- [ ] Уведомления интегрированы
- [ ] Тестирование ролей manager & customer
- [ ] Documentation

### Sprint 3

- [ ] Миграция часть 3 применена
- [ ] API для курьера работают
- [ ] API для саппорта работают
- [ ] UI курьера готово
- [ ] UI саппорта готово
- [ ] WebSocket чат готов (базовый)
- [ ] Тестирование ролей courier & support
- [ ] Documentation

### Sprint 4

- [ ] Адаптивный дизайн проверен
- [ ] Тема переключается
- [ ] SEO оптимизирована
- [ ] Аналитика работает
- [ ] A/B тестирование готово
- [ ] Telegram Premium интегрирована
- [ ] Геймификация работает
- [ ] WebSocket чат full-featured
- [ ] Final testing & deploy

---

## 📦 ФИНАЛЬНЫЙ СПИСОК ФАЙЛОВ

**Новые миграции:**

- `db/migrations/010_role_improvements_part1.sql`
- `db/migrations/010_role_improvements_part2.sql`
- `db/migrations/010_role_improvements_part3.sql`

**Обновленные файлы:**

- `lib/auth.ts`
- `lib/notifications.ts`
- `pages/profile.tsx`
- `pages/admin/kanban.tsx`
- `package.json`

**Новые API (~40+ эндпоинтов):**

- `pages/api/admin/audit-logs.ts`
- `pages/api/admin/rbac.ts`
- `pages/api/admin/products/bulk-update.ts`
- `pages/api/admin/dashboard-advanced.ts`
- `pages/api/admin/orders/export.ts`
- `pages/api/admin/super/*.ts`
- `pages/api/orders/*/notes.ts`
- `pages/api/user/referral.ts`
- `pages/api/cart/saved.ts`
- `pages/api/products/compare.ts`
- `pages/api/orders/*/tracking.ts`
- `pages/api/courier/*.ts`
- `pages/api/support/*.ts`
- И ещё ~25 эндпоинтов

**Новые UI страницы (~15+ страниц):**

- `pages/admin/super/*.tsx`
- `pages/compare.tsx`
- `pages/tracking/[orderId].tsx`
- `pages/courier/*.tsx`
- `pages/support/*.tsx`
- И обновленные: profile.tsx, admin/kanban.tsx

**Новые компоненты (~20+ компонентов):**

- Все компоненты для каждой страницы

**Новые утилиты:**

- `lib/websocket.ts`
- `lib/analytics.ts`
- `lib/ab-testing.ts`
- `lib/gamification.ts`
- `lib/seo.ts`
- `components/ThemeToggle.tsx`
- И остальные

**Документация:**

- `docs/10_role_improvements/analysis.md` ✅
- `docs/10_role_improvements/implementation_plan.md` ✅
- `docs/10_role_improvements/testing_guide.md` (TODO)
- `docs/10_role_improvements/README.md` (TODO)

---

**План подготовлен:** Copilot CLI  
**Дата:** 2026-04-03  
**Версия:** 1.0  
**Статус:** ✅ Ready for Implementation
