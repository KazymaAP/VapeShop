# 🔍 АНАЛИЗ КОДА: ГОТОВНОСТЬ К ВНЕДРЕНИЮ РОЛЕВЫХ УЛУЧШЕНИЙ

**Дата:** 2026-04-03  
**Версия:** 1.0  
**Статус:** ✅ Готово к реализации  

---

## 📊 ТЕКУЩАЯ СТРУКТУРА ПРОЕКТА

### ✅ ЧТО УЖЕ ЕСТЬ (можно переиспользовать)

#### Authentication & Roles
- ✅ Таблица `users` с полем `role` (admin, manager, seller, customer)
- ✅ `lib/auth.ts` с функциями:
  - `getTelegramIdFromRequest()` – извлечение ID
  - `parseInitData()` – парсинг данных WebApp
  - `getUserRole()` – получение роли из БД
  - `requireAuth(handler, allowedRoles)` – middleware
- ⚠️ TODO: HMAC-SHA256 верификация initData

#### Notifications
- ✅ `lib/notifications.ts` с функциями:
  - `sendNotification(telegramId, text, extra, eventType)` – отправка с логированием
  - `broadcastNotification(role, text)` – рассылка по ролям
  - `notifyAdminsNewOrder()`, `notifyBuyerOrderCreated()`, `notifyBuyerOrderStatus()`
- ✅ Таблица `notification_settings` с типами уведомлений
- ✅ Таблица `notification_history` для логирования

#### Admin API
- ✅ `pages/api/admin/users.ts` – GET/PUT (GET список, PUT роль/блокировка)
- ✅ `pages/api/admin/stats.ts` – GET (доход, кол-во заказов, товары с низким запасом)
- ✅ `pages/api/admin/products.ts` – GET/POST/PUT/DELETE (CRUD с историей в product_history)
- ✅ `pages/api/admin/orders.ts` – GET/PUT (список + изменение статуса с уведомлениями)
- ✅ `pages/api/admin/orders-kanban.ts` – GET (группировка по статусам)
- ✅ `pages/api/admin/broadcast.ts` – POST (рассылка по ролям или всем)
- ✅ `pages/api/admin/faq.ts` – GET/POST (FAQ)
- ✅ `pages/api/admin/pages.ts` – GET/POST (CMS)
- ✅ `pages/api/admin/pickup-points.ts` – GET/POST/PUT/DELETE (самовывоз)
- ⚠️ NEEDS: requireAuth на все эндпоинты

#### Components
- ✅ `components/Toast.tsx` – система уведомлений (hook `useToast()`)
- ✅ `components/AdminSidebar.tsx` – боковая панель админки
- ✅ `components/ProductCard.tsx` – карточка товара
- ✅ `components/ActivationModal.tsx` – окно активации товаров
- ✅ `components/DeliverySelector.tsx` – выбор доставки

#### Database
- ✅ Миграции 001-009 с таблицами:
  - users (с role field ✓)
  - products, categories, brands
  - orders (с 6-digit code, delivery_method ✓)
  - notification_settings, notification_history
  - pickup_points, addresses
  - reviews, wishlist
- ✓ Триггеры на автообновление updated_at
- ✓ Триггер на расчет rating
- ✓ Индексы на часто используемые колонки

---

## ❌ ЧТО НУЖНО ДОБАВИТЬ

### Новые роли
- `super_admin` – выше админа (управление админами, логи, настройки)
- `support` – саппорт (поиск клиентов, редактирование заказов, база знаний)
- `courier` – курьер (доставка, отметка о выполнении)

### Новые таблицы (миграция 010)
1. `audit_log` – логирование действий (user_id, action, target_type, target_id, details, ip, user_agent, created_at)
2. `promotions` – расписание акций (id, name, type, value, start_date, end_date, applicable_products[], categories[], is_active)
3. `gift_certificates` – подарочные сертификаты (id, code, amount, recipient_id, used_at, created_at)
4. `user_balance` – баланс пользователя (user_id, balance, last_updated)
5. `saved_for_later` – отложенные товары (user_id, product_id, saved_at)
6. `compare_items` – сравнение товаров (user_id, product_ids[], created_at)
7. `support_tickets` – обращения саппорта (id, user_id, subject, message, status, created_at, resolved_at)
8. `courier_performance` – статистика курьеров (courier_id, deliveries_today, deliveries_week, rating)
9. `chat_messages` – сообщения WebSocket чата (id, from_user_id, to_user_id, message, is_read, created_at)
10. `product_history` – история изменений товаров (id, product_id, admin_id, field, old_value, new_value, changed_at)
11. `manager_notes_history` – история заметок менеджеров (id, order_id, manager_id, note, created_at)

### Новые колонки
- `orders.manager_notes` – заметки менеджера
- `products.old_price` – цена до скидки
- `users.balance` – баланс в рублях (для бонусов)
- `wishlist.notify_on_discount` – уведомлять при скидке

### Новые npm пакеты
```json
{
  "socket.io-client": "^4.5.0",
  "socket.io": "^4.5.0",
  "exceljs": "^4.3.0",
  "papaparse": "^5.4.0",
  "recharts": "^2.8.0",
  "leaflet": "^1.9.0",
  "react-leaflet": "^4.2.0",
  "date-fns": "^2.30.0",
  "react-hook-form": "^7.48.0",
  "zod": "^3.22.0"
}
```

---

## 📈 СЛОЖНОСТЬ РЕАЛИЗАЦИИ ПО СПРИНТАМ

### Sprint 1: Super-Admin + Admin (2-3 дня)
| Фича | Сложность | API | UI | БД |
|------|-----------|-----|-----|-----|
| Super-admin система | ⭐⭐⭐ | 2-3 ч | 3-4 ч | 1 ч |
| Audit logs | ⭐⭐ | 1 ч | 2 ч | 1 ч |
| RBAC (управление ролями) | ⭐⭐⭐⭐ | 3-4 ч | 3-4 ч | 1 ч |
| Массовое редактирование товаров | ⭐⭐⭐ | 2 ч | 2-3 ч | - |
| Дашборд с графиками (recharts) | ⭐⭐⭐ | 2 ч | 3-4 ч | - |
| Экспорт в Excel | ⭐⭐ | 2 ч | 1 ч | - |
| **Итого Sprint 1** | | **13-14 ч** | **14-16 ч** | **3 ч** |

### Sprint 2: Manager + Customer (2-3 дня)
| Фича | Сложность | API | UI | БД |
|------|-----------|-----|-----|-----|
| Расширенный канбан (3.1) | ⭐⭐⭐ | 2 ч | 2-3 ч | - |
| Умный поиск заказов (3.2) | ⭐⭐ | 1 ч | 1 ч | - |
| Комментарии к заказам (3.3) | ⭐⭐ | 1 ч | 1 ч | 1 ч |
| Шаблонные ответы (3.4) | ⭐⭐ | 1 ч | 1 ч | 1 ч |
| Трекинг заказа (4.1) | ⭐⭐⭐ | 1.5 ч | 2-3 ч | - |
| Реферальная система (4.2) | ⭐⭐⭐ | 2 ч | 2 ч | 2 ч |
| Push-уведомления (4.3) | ⭐⭐ | 1 ч | - | - |
| Отложенная корзина (4.4) | ⭐⭐ | 1 ч | 1 ч | 1 ч |
| Быстрый повтор заказа (4.5) | ⭐ | 0.5 ч | 0.5 ч | - |
| Сравнение товаров (4.6) | ⭐⭐ | 1.5 ч | 2 ч | 1 ч |
| Отзывы с фото (4.7) | ⭐⭐⭐ | 2 ч | 2 ч | 1 ч |
| Кэшбэк за отзывы (4.8) | ⭐⭐ | 1 ч | 0.5 ч | - |
| Умные рекомендации (4.9) | ⭐⭐⭐ | 2 ч | 2 ч | - |
| **Итого Sprint 2** | | **20-21 ч** | **20-22 ч** | **7 ч** |

### Sprint 3: Courier + Support (1-2 дня)
| Фича | Сложность | API | UI | БД |
|------|-----------|-----|-----|-----|
| Mini App для курьеров (5.1) | ⭐⭐⭐⭐ | - | 4-5 ч | - |
| Список заказов курьеру (5.2) | ⭐⭐ | 1 ч | 1 ч | - |
| Отметка доставки (5.3) | ⭐⭐⭐ | 2 ч | 2 ч | - |
| Push-уведомления курьеру (5.4) | ⭐ | 0.5 ч | - | - |
| Отчёт курьера (5.5) | ⭐⭐ | 1 ч | 1.5 ч | 1 ч |
| Поиск клиента (6.1) | ⭐⭐ | 1 ч | 1 ч | - |
| Редактирование заказов (6.2) | ⭐⭐ | 1.5 ч | 1.5 ч | - |
| Шаблонные ответы саппорта (6.3) | ⭐ | 0.5 ч | 0.5 ч | 1 ч |
| История обращений (6.4) | ⭐⭐ | 1 ч | 1 ч | - |
| Отправка промокодов (6.5) | ⭐ | 0.5 ч | 0.5 ч | - |
| **Итого Sprint 3** | | **9-10 ч** | **14-16 ч** | **2 ч** |

### Sprint 4: Общие улучшения (1-2 дня)
| Фича | Сложность | Время |
|------|-----------|-------|
| Адаптивный дизайн (7.1) | ⭐⭐⭐ | 3-4 ч |
| Переключатель темы (7.2) | ⭐⭐ | 1 ч |
| Lazy loading (7.3) | ⭐⭐ | 2-3 ч |
| SEO оптимизация (7.4) | ⭐ | 1-2 ч |
| Аналитика (7.5) | ⭐⭐ | 2 ч |
| A/B тестирование (7.6) | ⭐⭐⭐ | 2-3 ч |
| Telegram Premium (7.7) | ⭐⭐ | 1-2 ч |
| Геймификация (7.8) | ⭐⭐⭐ | 2-3 ч |
| Дизайн улучшения (7.9) | ⭐⭐ | 2 ч |
| **Итого Sprint 4** | | **17-22 ч** |

---

## 🎯 ЗАВИСИМОСТИ И ПОРЯДОК РЕАЛИЗАЦИИ

```
1. Миграция 010 (новые таблицы) ← начало
   ↓
2. lib/auth.ts обновление (новые роли: super_admin, support, courier)
   ↓
3. Admin API (requireAuth везде + новые эндпоинты)
   ↓
4. Manager API (заказы, комментарии, шаблоны)
   ↓
5. Customer API (реферралы, баланс, wishlist)
   ↓
6. Courier API (доставка, отметка)
   ↓
7. Support API (поиск, редактирование)
   ↓
8. UI страницы (все роли)
   ↓
9. WebSocket интеграция (чат)
   ↓
10. Общие улучшения (тема, SEO, аналитика)
```

---

## 🔐 ПРОВЕРКИ БЕЗОПАСНОСТИ

Для каждого эндпоинта обязательно:
- ✓ `requireAuth` с проверкой роли
- ✓ Валидация input (zod schema)
- ✓ Логирование в `audit_log` всех действий админов/менеджеров
- ✓ Проверка принадлежности (может ли этот пользователь редактировать данные)
- ✓ Rate limiting на sensitive операции

---

## 🚀 РЕКОМЕНДУЕМЫЙ ПОРЯДОК РАБОТЫ

1. **День 1 утро:** Написать миграцию 010, обновить lib/auth.ts, создать API скелеты
2. **День 1 после обеда:** Реализовать Sprint 1 APIs (super-admin, audit, графики, excel)
3. **День 2 утро:** UI для Sprint 1, интеграция с компонентами
4. **День 2 после обеда:** Sprint 2 APIs (manager, customer фичи)
5. **День 3 утро:** UI для Sprint 2
6. **День 3 после обеда:** Sprint 3 (courier, support)
7. **День 4 утро:** Sprint 4 (общие улучшения)
8. **День 4 после обеда:** Тестирование, баг-фиксы, документация

---

## 📦 НОВЫЕ NPM ПАКЕТЫ (установить сразу)

```bash
npm install socket.io-client socket.io exceljs papaparse recharts leaflet react-leaflet date-fns react-hook-form zod

# или по отдельности:
npm install --save socket.io-client
npm install --save exceljs
npm install --save papaparse
npm install --save recharts
npm install --save leaflet react-leaflet
npm install --save date-fns
npm install --save react-hook-form zod
npm install --save-dev socket.io
```

---

## ✅ КОНТРОЛЬНЫЙ ЛИСТ АНАЛИЗА

- [x] Таблица users имеет роль - ✅ Yes
- [x] lib/auth.ts имеет основную логику - ✅ Yes
- [x] lib/notifications.ts имеет функции - ✅ Yes
- [x] Admin API имеют requireAuth - ⚠️ Partial (NEEDS checking)
- [x] Components готовы к переиспользованию - ✅ Yes
- [x] Миграции 001-009 готовы - ✅ Yes
- [x] БД индексы добавлены - ✅ Yes
- [ ] Миграция 010 нужна - ❌ TODO
- [ ] Новые роли нужны - ❌ TODO
- [ ] npm пакеты нужны - ❌ TODO

---

## 📊 ИТОГОВАЯ СТАТИСТИКА

| Метрика | Значение |
|---------|----------|
| **Кол-во нових API эндпоинтов** | ~40+ |
| **Кол-во новых таблиц в БД** | 11 |
| **Кол-во новых React компонентов** | ~20 |
| **Кол-во новых страниц** | ~15 |
| **Кол-во новых roles** | 3 (super_admin, support, courier) |
| **Общая оценка сложности** | ⭐⭐⭐⭐ (HIGH) |
| **Ориентировочное время** | 60-70 часов разработки |
| **Рекомендуемый период** | 4 недели (1 неделя на спринт) |

---

**Документ подготовлен:** Copilot CLI  
**Дата:** 2026-04-03  
**Статус:** ✅ Ready for Implementation Plan
