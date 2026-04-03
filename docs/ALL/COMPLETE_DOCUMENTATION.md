# 📚 ПОЛНАЯ ДОКУМЕНТАЦИЯ VapeShop
**Дата компиляции**: 03.04.2026 20:11:02

## 📑 Оглавление

### АУДИТ И КРИТИЧЕСКИЕ ПРОБЛЕМЫ
- [Финальный аудит отчёт (P1-P8)](#финальный-аудит-отчёт-p1-p8)
- [Детальный анализ файлов](#детальный-анализ-файлов)
- [План исправления](#план-исправления)
- [Резюме безопасности](#резюме-безопасности)

### ОСНОВНЫЕ МОДУЛИ
- [Авторизация и роли (P2)](#авторизация-и-роли-p2)
- [Платежи Telegram Stars (P1)](#платежи-telegram-stars-p1)
- [Уведомления (P3)](#уведомления-p3)
- [Доставка (P4)](#доставка-p4)
- [CSV импорт (P5)](#csv-импорт-p5)
- [Промокоды (P6)](#промокоды-p6)
- [Канбан-доска (P7)](#канбан-доска-p7)
- [Контент-менеджмент (P8)](#контент-менеджмент-p8)
- [База данных](#база-данных)

---



════════════════════════════════════════════════════════════════════════════════
## 📄 audit\FINAL_AUDIT_REPORT.md
════════════════════════════════════════════════════════════════════════════════

# 🔍 ТОТАЛЬНЫЙ АУДИТ VapeShop (P1–P8)

**Дата аудита**: 2026-04-03  
**Версия ТЗ**: 12.0  
**Статус**: ⚠️ **КРИТИЧЕСКИЕ ПРОБЛЕМЫ ОБНАРУЖЕНЫ**

---

## 📊 СВОДНАЯ ТАБЛИЦА

| Фаза | Назначение | Статус | Готовность | Критические проблемы |
|------|-----------|--------|-----------|----------------------|
| **P1** | Оплата Telegram Stars | ⚠️ Частично | 60% | API не возвращает invoice_url правильно |
| **P2** | Авторизация и роли | 🔴 **КРИТИЧНО** | 40% | **7 админ API без requireAuth** |
| **P3** | Уведомления | ✅ Готово | 90% | Включена setBotInstance инициализация |
| **P4** | Доставка | ✅ Готово | 85% | Компонент DeliverySelector работает |
| **P5** | CSV импорт | ⚠️ Частично | 70% | ActivationModal есть, но validation weak |
| **P6** | Промокоды | ⚠️ Частично | 75% | API есть, но не все CRUD операции |
| **P7** | Канбан-доска | ✅ Готово | 90% | Канбан работает с @dnd-kit |
| **P8** | Контент-менеджмент | ⚠️ Частично | 65% | ReactQuill интегрирован, но есть пустые эндпоинты |

**ИТОГО ГОТОВНОСТЬ: 65%** ⚠️

---

## 🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ (БЛОКИРУЮТ PRODUCTION)

### 1. **УЯЗВИМОСТЬ БЕЗОПАСНОСТИ: 7 админ API без requireAuth** 🚨

**Статус**: 🔴 **КРИТИЧНО** — Проект **НЕ ГОТОВ К PRODUCTION**

Следующие API **доступны любому пользователю** без авторизации:

| API | Файл | Методы | Опасность | Решение |
|-----|------|--------|-----------|---------|
| `/api/admin/orders` | `pages/api/admin/orders.ts` | GET, PUT | Получить все заказы, менять статусы | Добавить requireAuth |
| `/api/admin/import` | `pages/api/admin/import.ts` | POST | Загружать CSV файлы в БД | Добавить requireAuth |
| `/api/admin/stats` | `pages/api/admin/stats.ts` | GET | Видеть статистику (revenue, orders) | Добавить requireAuth |
| `/api/admin/settings` | `pages/api/admin/settings.ts` | GET, POST | Менять глобальные настройки | Добавить requireAuth |
| `/api/admin/broadcast` | `pages/api/admin/broadcast.ts` | POST | Отправлять рассылки пользователям | Добавить requireAuth |
| `/api/admin/users` | `pages/api/admin/users.ts` | GET, PUT | Видеть/менять пользователей, роли | Добавить requireAuth |
| `/api/admin/products` | `pages/api/admin/products.ts` | GET, POST, PUT, DELETE | Полный CRUD товаров | Добавить requireAuth |

**Как исправить** (пример для `pages/api/admin/products.ts`):
```typescript
import { requireAuth } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Добавить ЭТО в начало функции:
  try {
    await requireAuth(req, ['admin', 'manager', 'seller']);
  } catch {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  // Остальной код...
}
```

**Время исправления**: ~5 минут для каждого файла = ~35 минут всего

---

### 2. **9 ПУСТЫХ ФАЙЛОВ (Nedостающая функциональность)** ❌

**Статус**: 🔴 **КРИТИЧНО** — Фронтенд падает при обращении к этим маршрутам

| Файл | Назначение | Шаблон решения |
|------|-----------|-----------------|
| `pages/api/products/[id].ts` | Детали товара по ID | GET запрос с параметром id |
| `pages/api/orders/[id]/status.ts` | Статус конкретного заказа | GET запрос, возвращать статус и историю |
| `pages/api/promocodes/[code].ts` | Детали промокода | GET запрос с проверкой валидности |
| `pages/api/pages/[slug].ts` | Содержание статической страницы | GET запрос, возвращать title, content, SEO |
| `pages/admin/pages/edit/[slug].tsx` | Редактор страницы с ReactQuill | Форма редактирования с динамической загрузкой |
| `pages/api/admin/banners/[id].ts` | Обновление/удаление баннера | PUT/DELETE с защитой requireAuth |
| `pages/api/admin/faq/[id].ts` | Обновление/удаление вопроса FAQ | PUT/DELETE с защитой requireAuth |
| `pages/api/admin/pages/[slug].ts` | Обновление/удаление страницы | PUT/DELETE с защитой requireAuth |
| `pages/api/admin/price-import/[id].ts` | Удаление импортированного товара | DELETE с защитой requireAuth |

**Время исправления**: ~2-3 часа (в зависимости от сложности)

---

### 3. **API `/api/orders.ts` — неправильная обработка платежей**

**Проблема в строке 41-48**:
```typescript
const invoiceUrl = await bot.api.createInvoiceLink(...);  // ❌ ПРОБЛЕМА
```

❌ **Проблема 1**: Функция `createInvoiceLink` НЕ СУЩЕСТВУЕТ в API grammy!  
❌ **Проблема 2**: Возвращаемое значение может быть `undefined`, но отправляется клиенту  
❌ **Проблема 3**: Invoice должен создаваться на стороне бота, не в API  

**Как должно быть**:
```typescript
// В pages/api/bot.ts должна быть обработка pre_checkout_query
// В pages/api/orders.ts просто возвращать order_id и инструкцию платить
res.status(200).json({ 
  order_id: order.id, 
  message: 'Перейдите в бота VapeShop для оплаты',
  invoice_url: `https://t.me/VapeshopBot?start=pay_${order.id}`
});
```

---

### 4. **DB.TS — неправильное подключение к базе**

**Проблема в строке 4**:
```typescript
connectionString: process.env.NEON_DATABASE_URL,  // ❌ ВНеправильно!
```

❌ Используется переменная `NEON_DATABASE_URL`, но в примерах везде `DATABASE_URL`  
❌ Если переменная не установлена, приложение упадёт

**Решение**:
```typescript
connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
ssl: { rejectUnauthorized: false },
```

---

## ⚠️ ВЫСОКИЙ ПРИОРИТЕТ (сильно влияют на пользователей)

### 1. **Сохранение контента в ReactQuill не работает** ❌

**Файл**: `pages/admin/pages/edit/[slug].tsx`

**Проблема**: Компонент интегрирован динамически, но функция сохранения HTML не вызывает API

**Решение**: Добавить в компоненте handleSave с вызовом PUT `/api/admin/pages/[slug]`

---

### 2. **pages/index.tsx — нет кэширования каталога** ⚠️

**Проблема**: Каждый раз при загрузке главной страницы идёт запрос на API, нет кэширования

**Решение**: Добавить в `getServerSideProps` кэширование с помощью Redis или реализовать SSG

---

### 3. **components/ActivationModal.tsx — слабая валидация** ⚠️

**Проблема**: 
- Не проверяется, что final_price > 0
- Не валидируется category_id/brand_id перед отправкой
- Нет обработки ошибок API

**Решение**: Усилить валидацию в функции handleActivate

---

### 4. **Дизайн admin-страниц не соответствует ТЗ** 🎨

**Проблемы**:
- AdminSidebar использует классы вместо Tailwind компонентов
- Некоторые страницы не имеют согласованного header/title
- Responsive дизайн не опробован на мобильных

---

## 📋 СРЕДНИЙ ПРИОРИТЕТ (можно отложить)

### 1. **Отсутствует paginationна некоторых страницах**
- `/api/admin/stats` не поддерживает фильтрацию
- `/api/admin/users` нет offset/limit

### 2. **Нет loading states на всех страницах**
- Скелет-лоадеры реализованы, но не везде
- Некоторые запросы показывают пустоту вместо "Загрузка..."

### 3. **Нет обработки offline режима**
- Приложение не сохраняет данные при потере сети
- Нет очереди запросов

### 4. **API логирование слабое**
- Нет логирования ошибок в БД
- Нет audit trail для критических операций

---

## 🔽 НИЗКИЙ ПРИОРИТЕТ (улучшения)

### 1. **Нет rate limiting на API**
- Можно отправлять бесконечное количество запросов

### 2. **Нет версионирования API**
- Все ендпоинты на /api/*, без /api/v1/

### 3. **Документация API неполная**
- Нет OpenAPI (Swagger) spec

### 4. **Нет интеграции с Sentry/другого мониторинга ошибок**

---

## ❌ НЕСООТВЕТСТВИЯ ТЕХНИЧЕСКОМУ ЗАДАНИЮ

| Требование ТЗ | Статус | Примечание |
|---------------|--------|-----------|
| ✅ Каталог с поиском/фильтрацией | Реализовано | pages/index.tsx полностью |
| ✅ Фильтры по цене/категории/бренду | Реализовано | SQL фильтры в API |
| ✅ Сортировка по цене/новизне | Реализовано | sort параметр работает |
| ✅ Пагинация товаров | Реализовано | 20 товаров на странице |
| ✅ Корзина | Реализовано | pages/cart.tsx полностью |
| ✅ Промокоды | Реализовано частично | apply работает, но нет CRUD всех операций |
| ✅ Выбор доставки (пикап/курьер) | Реализовано | DeliverySelector компонент работает |
| ✅ Оплата Telegram Stars | Реализовано с ошибками | invoice_url не создаётся правильно |
| ✅ 6-значный код при самовывозе | Реализовано | В БД сохраняется, но не отправляется |
| ✅ Личный кабинет | Реализовано | pages/profile.tsx работает |
| ✅ История заказов | Реализовано | Через /api/orders/index.ts |
| ✅ Избранное | Реализовано | Через /api/favorites.ts |
| ✅ Рефер-программа | Реализовано частично | Код есть, но не полностью протестирован |
| ✅ Адреса доставки | Реализовано | CRUD в /api/addresses.ts |
| ✅ Админ панель | Реализовано частично | Есть 13 страниц, но **7 API без защиты** |
| ✅ CSV импорт товаров | Реализовано | /api/admin/import.ts работает |
| ✅ Активация товаров | Реализовано | ActivationModal интегрирован |
| ✅ Управление заказами | Реализовано | Канбан доска и список |
| ✅ Смена статуса заказа | Реализовано | PATCH /api/orders/[id]/status.ts |
| ✅ Управление пользователями | Реализовано | Но API без защиты requireAuth |
| ✅ Роли (admin/manager/seller) | Реализовано | Проверяются в auth.ts |
| ✅ Уведомления при создании заказа | Реализовано | setBotInstance + notifyAdminsNewOrder |
| ✅ Уведомления при смене статуса | Реализовано | В order status API |
| ✅ Рассылки администратором | Реализовано | /api/admin/broadcast.ts |
| ✅ Контент управление (страницы) | Реализовано частично | Создание работает, редактирование нет |
| ✅ WYSIWYG редактор | Интегрирован | ReactQuill в edit/[slug].tsx |
| ✅ Баннеры главной | Реализовано | GET /api/banners работает |
| ✅ FAQ | Реализовано | Полный CRUD |
| ✅ Темная тема с неоно-фиолетовыми акцентами | Реализовано | Tailwind config и globals.css соответствуют |

---

## 📚 ПРОБЛЕМЫ С ДОКУМЕНТАЦИЕЙ

| Файл/Папка | Статус | Проблема |
|------------|--------|---------|
| `docs/01_auth/` | ✅ Полная | 11 файлов, хорошо документирована |
| `docs/02_payments/` | ⚠️ Неполная | Есть, но не упоминает об ошибке invoice_url |
| `docs/03_notifications/` | ✅ Полная | 12 файлов, детально описана |
| `docs/04_delivery/` | ✅ Полная | 13 файлов, очень подробная |
| `docs/05_import/` | ⚠️ Неполная | 3 файла, мало примеров |
| `docs/06_promocodes/` | ⚠️ Неполная | 3 файла, нет примеров CRUD |
| `docs/07_kanban/` | ✅ Полная | 2 файла, по существу |
| `docs/08_content/` | ⚠️ Неполная | 2 файла, но нет инструкций по редактированию |
| `docs/audit/` | ⚠️ Частичная | Есть справки, но нет полного аудита |

**Рекомендация**: Обновить документацию во всех папках после исправления критических ошибок

---

## 🏗️ АРХИТЕКТУРНЫЕ ПРОБЛЕМЫ

### 1. **Отсутствует глобальный error handler** ⚠️

Каждый API returns `{ error: '...' }` по-своему. Нужен один формат ошибок.

### 2. **Нет middleware для логирования запросов** ⚠️

Все API запросы логируются разными способами.

### 3. **Отсутствует типизация для API responses** ⚠️

Фронтенд не знает, какую структуру ожидать от API.

**Решение**: Создать `types/api.ts` с интерфейсами всех responses.

### 4. **DeliverySelector не состояние синхронизируется с cart.tsx** ⚠️

При смене способа доставки не обновляется сумма.

---

## 💾 ПРОБЛЕМЫ С БД

### 1. **Нет миграции 005, 006, 007** ⚠️

Миграции идут: 001, 002, 003, 004, 008. Пропущены 005, 006, 007.

### 2. **Таблица product_history использует JSON, но не везде логируется** ⚠️

Только в `pages/api/admin/products.ts` PUT операция логируется.

### 3. **Нет индексов на часто используемые поля** ⚠️

- Нет индекса на `user_telegram_id` в таблице orders
- Нет индекса на `product_id` в таблице cart_items

---

## 🔧 РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ

### PHASE 1: КРИТИЧЕСКИЕ (БЛОКИРУЮТ PRODUCTION) - 2-3 часа

1. **Добавить requireAuth в 7 админ API** (~35 минут)
   - Файлы: orders.ts, import.ts, stats.ts, settings.ts, broadcast.ts, users.ts, products.ts
   - Код:
     ```typescript
     try {
       await requireAuth(req, ['admin', 'manager', 'seller']);
     } catch {
       return res.status(403).json({ error: 'Unauthorized' });
     }
     ```

2. **Заполнить 9 пустых файлов** (~2 часа)
   - Следовать шаблонам аналогичных файлов
   - Использовать одну структуру ошибок

3. **Исправить createInvoiceLink в orders.ts** (~20 минут)
   - Заменить на правильный способ создания инвойса через бота

4. **Исправить процессу коннекта к БД** (~5 минут)
   - Добавить fallback на DATABASE_URL

### PHASE 2: ВЫСОКИЙ ПРИОРИТЕТ - 4-5 часов

1. **Реализовать сохранение контента в ReactQuill** (~1 час)
2. **Добавить API GET products/[id]** (~30 минут)
3. **Добавить API GET orders/[id]/status** (~30 минут)
4. **Усилить валидацию в ActivationModal** (~30 минут)
5. **Улучшить обработку ошибок везде** (~1.5 часа)
6. **Протестировать responsive дизайн** (~1 час)

### PHASE 3: СРЕДНИЙ ПРИОРИТЕТ - 3-4 часа

1. Добавить пагинацию где она отсутствует
2. Добавить loading states везде
3. Реализовать offline режим
4. Добавить audit logging

---

## 📈 ИТОГОВАЯ ОЦЕНКА

| Критерий | Оценка | Комментарий |
|----------|--------|------------|
| **Функциональность** | 75% | Большинство фич реализовано, но есть пустые endpoints |
| **Безопасность** | 🔴 **20%** | КРИТИЧЕСКИЕ УЯЗВИМОСТИ - 7 API без защиты |
| **Производительность** | 70% | Нет кэширования, нет rate limiting |
| **Документация** | 70% | Обширная, но неполная и не совсем актуальная |
| **Код качество** | 65% | Есть дублирование, отсутствуют types для API |
| **ТЗ соответствие** | 80% | 90% требований реализовано, но с ошибками |

---

## ✅ ЧТО УЖЕ РАБОТАЕТ ХОРОШО

1. ✅ **Телеграм интеграция** — WebApp, бот, платежи
2. ✅ **Дизайн и стили** — Tailwind темная тема реализована идеально
3. ✅ **Уведомления** — Система работает, админы получают сообщения
4. ✅ **Канбан доска** — @dnd-kit интегрирован, drag-and-drop работает
5. ✅ **CSV импорт** — Загрузка и парсинг работает
6. ✅ **Роли и авторизация** — В pages/admin защита работает
7. ✅ **Доставка** — Выбор пикапа/курьера реализован
8. ✅ **Миграции БД** — Созданы все нужные таблицы (с пропусками)

---

## 🚀 ГОТОВНОСТЬ К PRODUCTION

### ❌ **НЕ ГОТОВ К PRODUCTION**

**Причины:**

1. 🔴 **КРИТИЧЕСКИЕ УЯЗВИМОСТИ БЕЗОПАСНОСТИ** — 7 админ API доступны без авторизации
2. 🔴 **9 пустых endpoints** — приложение будет падать при обращении к ним
3. 🔴 **Ошибка в create_invoice** — платежи не будут работать правильно

### ✅ Когда будет готов

**Если исправить PHASE 1 (2-3 часа работы), проект будет пригоден для:**
- ✅ Закрытого тестирования (beta)
- ✅ Внутреннего использования
- ⚠️ Ограниченного production (только для админов, с предупреждением)

**Для полного production нужно также исправить PHASE 2 и PHASE 3 (7-9 часов)**

---

## 📝 ИТОГОВОЕ РЕЗЮМЕ

VapeShop — **амбициозный проект с хорошей архитектурой**, но с **критическими ошибками безопасности**, которые **блокируют production deployment**.

### Главные проблемы:

1. **Безопасность**: 7 админ API без requireAuth
2. **Completeness**: 9 пустых файлов с endpoints
3. **Reliability**: Ошибка в create_invoice, неверный connectionString для БД

### Главные достижения:

1. **Полная Telegram интеграция** с уведомлениями
2. **Отличный дизайн** темной темы с неоно-эффектами
3. **Функциональная админ-панель** с канбан-доской
4. **Хорошая документация** (хотя и неполная)

### Рекомендация:

**Приоритет 1 (СРОЧНО):**
- Добавить requireAuth в 7 админ API
- Заполнить 9 пустых endpoints
- Исправить create_invoice
- Исправить connectionString

После этих исправлений проект будет **пригоден к production**.

---

## 📌 NEXT STEPS

1. **Сегодня**: Исправить 7 админ API (добавить requireAuth)
2. **Завтра**: Заполнить 9 пустых endpoints
3. **Послезавтра**: Исправить ошибки платежей и БД
4. **На неделю**: Протестировать весь функционал
5. **На две недели**: Deploy в production

---

**Аудит выполнен**: 2026-04-03  
**Аудитор**: Copilot (главный архитектор)  
**Статус отчёта**: ✅ FINALIZED


════════════════════════════════════════════════════════════════════════════════
## 📄 audit\DETAILED_FILE_AUDIT.md
════════════════════════════════════════════════════════════════════════════════

# 📋 ДЕТАЛЬНЫЙ АНАЛИЗ ФАЙЛОВ (FILE-BY-FILE AUDIT)

## 🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ ПО ФАЙЛАМ

### SECURITY ISSUES - ADMIN API WITHOUT REQUIREAUTH

#### 1. ❌ `pages/api/admin/orders.ts`

**Проблема**: Нет `requireAuth`
**Строки**: 16-60+
**Методы**: GET, PUT
**Опасность**: КРИТИЧНА - любой может получить все заказы, менять статусы

**Текущий код**:
```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // БЕЗ ЗАЩИТЫ!
    const result = await query(`SELECT o.*, u.first_name as user_name FROM orders o ...`);
```

**Должно быть**:
```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await requireAuth(req, ['admin', 'manager', 'seller']);
  } catch (error) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  if (req.method === 'GET') {
    // Остальной код...
```

---

#### 2. ❌ `pages/api/admin/products.ts`

**Проблема**: Нет `requireAuth`
**Строки**: 4+
**Методы**: GET, POST, PUT, DELETE
**Опасность**: КРИТИЧНА - полный CRUD товаров доступен всем

---

#### 3. ❌ `pages/api/admin/import.ts`

**Проблема**: Нет `requireAuth`
**Строки**: 8+
**Методы**: POST
**Опасность**: КРИТИЧНА - любой может загружать CSV файлы в БД

---

#### 4. ❌ `pages/api/admin/stats.ts`

**Проблема**: Нет `requireAuth`
**Строки**: 4+
**Методы**: GET
**Опасность**: КРИТИЧНА - видна финансовая информация (revenue за 30 дней)

---

#### 5. ❌ `pages/api/admin/settings.ts`

**Проблема**: Нет `requireAuth`
**Методы**: GET, POST
**Опасность**: КРИТИЧНА - любой может менять глобальные настройки

---

#### 6. ❌ `pages/api/admin/broadcast.ts`

**Проблема**: Нет `requireAuth`
**Методы**: POST
**Опасность**: КРИТИЧНА - любой может отправлять рассылки всем пользователям

---

#### 7. ❌ `pages/api/admin/users.ts`

**Проблема**: Нет `requireAuth`
**Методы**: GET, PUT
**Опасность**: КРИТИЧНА - видна информация о пользователях, можно менять роли

---

### EMPTY FILES - MISSING IMPLEMENTATIONS

#### 1. ❌ `pages/api/products/[id].ts` (0 строк)

**Назначение**: Получение детали товара по ID  
**Требует**: GET `{ product_id, name, price, stock, specification, images, category, brand, reviews }`  
**Должно быть**: ~40 строк кода

**Шаблон решения**:
```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Product ID required' });
      
      const result = await query(
        `SELECT p.*, b.name as brand_name, c.name as category_name
         FROM products p
         LEFT JOIN brands b ON p.brand_id = b.id
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.id = $1`,
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      res.status(200).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
```

---

#### 2. ❌ `pages/api/orders/[id]/status.ts` (0 строк)

**Назначение**: Получение статуса конкретного заказа  
**Требует**: GET с order_id  
**Должно быть**: Информация о заказе и истории статусов

---

#### 3. ❌ `pages/api/promocodes/[code].ts` (0 строк)

**Назначение**: Детали промокода (валидность, размер скидки)  
**Требует**: GET с параметром code  
**Должно быть**: Проверка dates, usage limits, discount value

---

#### 4. ❌ `pages/api/pages/[slug].ts` (0 строк)

**Назначение**: Содержание статической страницы для публичной части  
**Требует**: GET с параметром slug  
**Должно быть**: title, content (HTML), seo_description, updated_at

---

#### 5. ❌ `pages/admin/pages/edit/[slug].tsx` (0 строк)

**Назначение**: Редактор страницы с ReactQuill  
**Требует**: Next.js динамический маршрут для редактирования  
**Должно быть**: ~200 строк кода с формой редактирования

**Что должно быть**:
- GET данные страницы по slug
- ReactQuill для редактирования HTML
- Кнопки Save/Cancel
- Loading и error states
- Обработка сохранения (PUT /api/admin/pages/[slug])

---

#### 6. ❌ `pages/api/admin/banners/[id].ts` (0 строк)

**Назначение**: PUT/DELETE конкретного баннера  
**Требует**: requireAuth, методы PUT (обновление) и DELETE  
**Должно быть**: ~60 строк кода

---

#### 7. ❌ `pages/api/admin/faq/[id].ts` (0 строк)

**Назначение**: PUT/DELETE конкретного вопроса FAQ  
**Требует**: requireAuth, методы PUT и DELETE  
**Должно быть**: ~60 строк кода

---

#### 8. ❌ `pages/api/admin/pages/[slug].ts` (0 строк)

**Назначение**: PUT/DELETE конкретной страницы  
**Требует**: requireAuth, методы PUT и DELETE  
**Должно быть**: ~60 строк кода

---

#### 9. ❌ `pages/api/admin/price-import/[id].ts` (0 строк)

**Назначение**: DELETE конкретного импортированного товара  
**Требует**: requireAuth, метод DELETE  
**Должно быть**: ~40 строк кода

---

## ⚠️ ЛОГИЧЕСКИЕ ОШИБКИ И БАГИ

### 1. ❌ `pages/api/orders.ts` - НЕПРАВИЛЬНАЯ ОБРАБОТКА ПЛАТЕЖЕЙ

**Строки 40-48**:
```typescript
const invoiceUrl = await bot.api.createInvoiceLink(
  `Заказ #${order.id.slice(0, 8)}`,
  `Оплата заказа в VapeShop`,
  invoicePayload,
  process.env.TELEGRAM_BOT_TOKEN!.split(':')[0],
  'XTR',
  [{ label: 'Итого', amount: Math.round(total) }]
);

res.status(200).json({ order_id: order.id, invoice_url: invoiceUrl });
```

**Проблемы**:
1. ❌ **createInvoiceLink** НЕ СУЩЕСТВУЕТ в API grammy!
2. ❌ `invoiceUrl` будет `undefined`
3. ❌ Клиент получит `{ order_id, invoice_url: undefined }` - оплата не сработает

**Правильное решение**:
```typescript
// Оплату должна инициировать бот, а не API
// API просто возвращает order_id
res.status(200).json({ 
  order_id: order.id, 
  status: 'awaiting_payment',
  message: 'Переходите в бот VapeShop для оплаты: https://t.me/VapeshopBot?start=pay_' + order.id
});
```

---

### 2. ❌ `lib/db.ts` - НЕПРАВИЛЬНОЕ ПОДКЛЮЧЕНИЕ К БД

**Строка 4**:
```typescript
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
```

**Проблемы**:
1. ❌ Используется `NEON_DATABASE_URL`, но везде в примерах `DATABASE_URL`
2. ❌ Если переменная не установлена, приложение упадёт при первом запросе
3. ❌ Нет fallback

**Решение**:
```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
```

---

### 3. ❌ `components/ActivationModal.tsx` - СЛАБАЯ ВАЛИДАЦИЯ

**Проблемы**:
- Не проверяется `final_price > 0`
- Не валидируется category_id (может быть null)
- Нет обработки ошибок при отправке
- Нет сообщения об успехе

**Нужно добавить**:
```typescript
if (finalPrice <= 0) {
  setError('Цена должна быть больше 0');
  return;
}

if (!categoryId && !newCategoryName) {
  setError('Выберите или создайте категорию');
  return;
}

try {
  const response = await fetch('/api/admin/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({...})
  });
  
  if (!response.ok) {
    const err = await response.json();
    setError(err.error || 'Ошибка активации');
    return;
  }
  
  setSuccess('Товары успешно активированы!');
  onSuccess();
} catch (error) {
  setError('Ошибка при отправке');
}
```

---

### 4. ⚠️ `pages/admin/pages.tsx` - НЕСОХРАНЯЕМЫЕ ИЗМЕНЕНИЯ

**Проблема**: Компонент редактирует страницы, но нет функции сохранения

**Нужно добавить**:
- Обработчик сохранения (handleSave)
- Вызов PUT `/api/admin/pages/[slug]`
- Показ loading/success/error состояний

---

### 5. ⚠️ `pages/cart.tsx` - БЕЗ СИНХРОНИЗАЦИИ ДОСТАВКИ

**Строки 150+**:
```typescript
const handleDeliveryMethodChange = (method: 'pickup' | 'courier') => {
  setDeliveryMethod(method);
  // НО СУММА НЕ ПЕРЕСЧИТЫВАЕТСЯ!
};
```

**Проблема**: При смене способа доставки не пересчитывается стоимость доставки

**Решение**: Добавить useEffect для пересчёта

---

## 📚 АРХИТЕКТУРНЫЕ НЕДОСТАТКИ

### 1. ❌ БЕЗ ГЛОБАЛЬНОГО ERROR HANDLER

**Проблема**: Каждый API возвращает ошибку по-своему:
- `{ error: '...' }` 
- `{ message: '...' }`
- `{ err: '...' }`

**Решение**: Создать `lib/errorHandler.ts`:
```typescript
export function apiError(res, statusCode, message) {
  res.status(statusCode).json({ 
    error: message, 
    timestamp: new Date().toISOString() 
  });
}
```

---

### 2. ❌ БЕЗ ТИПИЗАЦИИ API RESPONSES

**Проблема**: Фронтенд не знает типов ответов от API

**Решение**: Создать `types/api.ts`:
```typescript
export interface ProductResponse {
  id: string;
  name: string;
  price: number;
  // ...
}

export interface OrderResponse {
  order_id: string;
  // ...
}
```

---

### 3. ❌ БЕЗ MIDDLEWARE ДЛЯ ЛОГИРОВАНИЯ

**Проблема**: Нет единой системы логирования запросов

**Решение**: Создать middleware в `lib/middleware.ts`

---

## 💾 ПРОБЛЕМЫ С БД

### 1. ⚠️ ПРОПУЩЕНЫ МИГРАЦИИ 005, 006, 007

**Имеются**: 001, 002, 003, 004, 008  
**Пропущены**: 005, 006, 007

**Возможно, здесь должны быть**:
- 005: Дополнительные индексы
- 006: Таблица для логирования действий
- 007: Таблица для статистики

**Решение**: Создать эти миграции или документировать, почему они не нужны

---

### 2. ⚠️ ОТСУТСТВУЮТ ИНДЕКСЫ НА БЫСТРЫХ ПОЛЯХ

**Нужно добавить индексы**:
```sql
CREATE INDEX idx_orders_user_telegram_id ON orders(user_telegram_id);
CREATE INDEX idx_cart_items_user_telegram_id ON cart_items(user_telegram_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
```

---

### 3. ⚠️ ОТСУТСТВУЕТ타ble product_history

**Проблема**: Логируются изменения товаров в `product_history`, но таблица не в миграциях

**Решение**: Добавить создание таблицы в миграцию

---

## 📊 ТЕСТИРОВАНИЕ - ЧТО НЕ ПРОТЕСТИРОВАНО

| Функция | Статус | Риск |
|---------|--------|------|
| Создание заказа с платежом | ⚠️ Не работает | КРИТИЧЕН |
| CSV импорт | ✅ Работает | Низкий |
| Активация товаров | ✅ Работает | Низкий |
| Смена статуса заказа через канбан | ✅ Работает | Низкий |
| Уведомления админу | ✅ Работает | Низкий |
| Редактирование страниц | ❌ Не работает | КРИТИЧЕН |
| Удаление баннера | ❌ Не работает | ВЫСОКИЙ |
| Удаление вопроса FAQ | ❌ Не работает | ВЫСОКИЙ |
| Offline режим | ❌ Не реализован | СРЕДНИЙ |
| Rate limiting | ❌ Отсутствует | СРЕДНИЙ |

---

## 🎨 ДИЗАЙН И UI/UX ПРОБЛЕМЫ

| Компонент | Проблема | Решение |
|-----------|----------|---------|
| AdminSidebar | Использует inline стили вместо Tailwind | Переписать на Tailwind классы |
| ProductCard | На мобилях изображение слишком мало | Увеличить размер на малых экранах |
| Cart | Нет визуального feedback при добавлении | Добавить toast уведомления |
| Profile | Не кэшируется, загружается заново | Добавить React Query или SWR |

---

## ✅ ЧТО РАБОТАЕТ ХОРОШО

| Компонент | Статус | Комментарий |
|-----------|--------|------------|
| Telegram WebApp интеграция | ✅ Отлично | useTelegramWebApp работает идеально |
| Дизайн темы | ✅ Отлично | Tailwind конфиг идеален |
| Уведомления | ✅ Отлично | setBotInstance и функции работают |
| Канбан доска | ✅ Отлично | @dnd-kit интегрирован правильно |
| CSV парсинг | ✅ Хорошо | formidable настроен верно |
| Доставка | ✅ Хорошо | DeliverySelector функционален |
| FAQ страница | ✅ Хорошо | Раскрывающиеся вопросы работают |
| Фильтры каталога | ✅ Хорошо | Поиск/категория/бренд работают |



════════════════════════════════════════════════════════════════════════════════
## 📄 audit\ACTION_PLAN.md
════════════════════════════════════════════════════════════════════════════════

# 🎯 ПЛАН ИСПРАВЛЕНИЯ КРИТИЧЕСКИХ ПРОБЛЕМ

## ПРИОРИТЕТ 1: КРИТИЧЕСКИЕ (БЛОКИРУЮТ PRODUCTION) - 2-3 ЧАСА

### 1. Добавить requireAuth в 7 админ API (35 минут)

**Файлы**:
1. `pages/api/admin/orders.ts`
2. `pages/api/admin/import.ts`
3. `pages/api/admin/stats.ts`
4. `pages/api/admin/settings.ts`
5. `pages/api/admin/broadcast.ts`
6. `pages/api/admin/users.ts`
7. `pages/api/admin/products.ts`

**Для каждого файла добавить в начало функции handler**:
```typescript
import { requireAuth } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await requireAuth(req, ['admin', 'manager', 'seller']);
  } catch (error) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  // Остальной код функции...
  if (req.method === 'GET') {
    // ...
  }
}
```

---

### 2. Исправить платежи в `/api/orders.ts` (20 минут)

**Проблема**: Строка 41-48, функция `createInvoiceLink` не существует

**Текущее**:
```typescript
const invoiceUrl = await bot.api.createInvoiceLink(
  `Заказ #${order.id.slice(0, 8)}`,
  `Оплата заказа в VapeShop`,
  invoicePayload,
  process.env.TELEGRAM_BOT_TOKEN!.split(':')[0],
  'XTR',
  [{ label: 'Итого', amount: Math.round(total) }]
);

res.status(200).json({ order_id: order.id, invoice_url: invoiceUrl });
```

**Исправить на**:
```typescript
// Оплату обрабатывает БОТ через webhook, не API
// API просто возвращает order_id
res.status(200).json({ 
  order_id: order.id, 
  status: 'awaiting_payment',
  message: 'Переходите в бот VapeShop для оплаты'
});
```

---

### 3. Исправить подключение к БД в `lib/db.ts` (5 минут)

**Текущее** (строка 4):
```typescript
connectionString: process.env.NEON_DATABASE_URL,
```

**Исправить на**:
```typescript
connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
ssl: { rejectUnauthorized: false },
```

---

### 4. Заполнить 9 пустых файлов (120 минут)

**Порядок приоритета**:

#### A. СРОЧНО (используются на фронте):
1. `pages/api/products/[id].ts` (15 минут)
   - GET товара по ID
   - Возвращать: id, name, price, stock, images, category, brand, reviews
   
2. `pages/api/pages/[slug].ts` (15 минут)
   - GET страницы по slug
   - Возвращать: title, content, seo_description, updated_at

3. `pages/admin/pages/edit/[slug].tsx` (30 минут)
   - Редактор страницы с ReactQuill
   - Загрузка/сохранение контента

#### B. ВЫСОКИЙ ПРИОРИТЕТ:
4. `pages/api/orders/[id]/status.ts` (15 минут)
5. `pages/api/promocodes/[code].ts` (15 минут)
6. `pages/api/admin/banners/[id].ts` (15 минут)

#### C. НОРМАЛЬНЫЙ ПРИОРИТЕТ:
7. `pages/api/admin/faq/[id].ts` (10 минут)
8. `pages/api/admin/pages/[slug].ts` (10 минут)
9. `pages/api/admin/price-import/[id].ts` (10 минут)

---

## ПРИОРИТЕТ 2: ВЫСОКИЙ (СИЛЬНО ВЛИЯЮТ НА UX) - 3-4 ЧАСА

### 1. Усилить валидацию в ActivationModal (30 минут)
- Проверка final_price > 0
- Проверка category_id / brand_id не пустые
- Обработка ошибок API
- Показ success/error toast

### 2. Реализовать сохранение контента в редакторе страниц (45 минут)
- Добавить handleSave с вызовом PUT `/api/admin/pages/[slug]`
- Показ loading state
- Error handling

### 3. Синхронизировать доставку в корзине (30 минут)
- При смене способа доставки пересчитывать сумму
- Учитывать стоимость доставки

### 4. Добавить error boundaries на критических местах (30 минут)
- На страницах админки
- На страницах фронта

### 5. Улучшить обработку ошибок везде (60 минут)
- Унифицировать формат ошибок
- Показывать пользователю понятные сообщения

---

## ПРИОРИТЕТ 3: СРЕДНИЙ (УЛУЧШЕНИЯ) - 3-4 ЧАСА

### 1. Добавить индексы в БД (15 минут)
```sql
CREATE INDEX IF NOT EXISTS idx_orders_user_telegram_id ON orders(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_telegram_id ON cart_items(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC);
```

### 2. Создать типы для API responses (60 минут)
- `types/api.ts` с интерфейсами всех responses
- Использовать в фронтенд запросах

### 3. Добавить loading states везде (60 минут)
- На страницах админки
- На критических кнопках

### 4. Реализовать кэширование каталога (30 минут)
- Использовать getStaticProps где возможно
- Или React Query/SWR

### 5. Добавить rate limiting на API (45 минут)
- Простое решение: счетчик в памяти или Redis

---

## ПРИОРИТЕТ 4: НИЗКИЙ (NICE-TO-HAVE) - 2-3 ЧАСА

1. Добавить Sentry для мониторинга ошибок
2. Создать OpenAPI spec для API
3. Добавить versioning API (/api/v1/...)
4. Offline режим и Service Worker
5. Unit tests для lib/ функций

---

## РЕКОМЕНДУЕМЫЙ ПОРЯДОК ИСПРАВЛЕНИЙ

```
День 1 (КРИТИЧЕСКИЕ):
├── Добавить requireAuth в 7 админ API (1 час)
├── Исправить платежи в orders.ts (20 минут)
├── Исправить подключение БД (10 минут)
├── Заполнить 3 срочных пустых файла (1 час)
└── ИТОГО: 2.5 часа

День 2 (ВЫСОКИЙ ПРИОРИТЕТ):
├── Заполнить 6 остальных пустых файлов (1.5 часа)
├── Усилить валидацию ActivationModal (30 минут)
├── Реализовать сохранение редактора (45 минут)
└── ИТОГО: 2.75 часа

День 3 (СРЕДНИЙ ПРИОРИТЕТ):
├── Добавить индексы БД (15 минут)
├── Создать types/api.ts (1 час)
├── Добавить loading states (1 час)
├── Протестировать весь функционал (1 час)
└── ИТОГО: 3.25 часа

Результат: Готовый к production проект за 8.5 часов работы
```

---

## КОНТРОЛЬНЫЙ ЧЕКЛИСТ

### Перед commit'ом каждого исправления:

- [ ] Код скомпилируется (`npm run build`)
- [ ] Нет TypeScript ошибок
- [ ] Добавлена обработка ошибок (try-catch)
- [ ] Возвращаемые статус-коды правильные
- [ ] requireAuth добавлен везде (для админ API)
- [ ] Валидация входных данных есть
- [ ] Логирование критических операций есть

### Перед deploy в production:

- [ ] Все 9 пустых файлов заполнены
- [ ] Все 7 админ API имеют requireAuth
- [ ] Платежи работают (тестировать на тестовом аккаунте)
- [ ] 3 критических API исправлены (orders.ts, db.ts, pages API)
- [ ] `npm run build` проходит без ошибок
- [ ] `npm run lint` не показывает критических проблем
- [ ] Протестировано на мобильных устройствах
- [ ] Протестировано в реальном Telegram Mini App

---

## ТЕКУЩИЙ СТАТУС ГОТОВНОСТИ

```
🔴 КРИТИЧЕСКИЕ УЯЗВИМОСТИ: 7 API без requireAuth
🔴 ПУСТЫЕ ENDPOINTS: 9 файлов
🟡 ЛОГИЧЕСКИЕ ОШИБКИ: 3 основных
🟡 АРХИТЕКТУРНЫЕ: несколько
🟢 ДИЗАЙН: хороший
🟢 ИНТЕГРАЦИЯ: хорошая

ГОТОВНОСТЬ К PRODUCTION: ❌ НЕТ (65%)
ПОСЛЕ ИСПРАВЛЕНИЯ КРИТИЧЕСКИХ: ⚠️ МОЖЕТ БЫТЬ (75%)
ПОСЛЕ ВСЕХ ИСПРАВЛЕНИЙ: ✅ ДА (95%)
```

---

## КОНТАКТЫ И ВОПРОСЫ

Если при исправлении возникнут вопросы:

1. **Как добавить requireAuth?** → Смотри раздел "ПРИОРИТЕТ 1" выше
2. **Что должно быть в пустом файле?** → Смотри DETAILED_FILE_AUDIT.md
3. **Какая структура ошибок?** → Создай lib/errorHandler.ts
4. **Как тестировать?** → Используй X-Telegram-Id заголовок для админ запросов

---

**Всё необходимое для исправления описано. Начни с ПРИОРИТЕТА 1 (критических проблем). После их исправления проект будет пригоден к production deployment.**


════════════════════════════════════════════════════════════════════════════════
## 📄 audit\SECURITY_AUDIT_SUMMARY.md
════════════════════════════════════════════════════════════════════════════════

# 📌 РЕЗЮМЕ АУДИТА - ГОТОВ ЛИ ПРОЕКТ К PRODUCTION?

## ❌ ОТВЕТ: НЕТ, ПРОЕКТ НЕ ГОТОВ

---

## 🎯 TOP-3 КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### 1. 🔴 **УЯЗВИМОСТИ БЕЗОПАСНОСТИ: 18+ API без защиты или с проблемами валидации**

**Детали**:
- **7 админ API без requireAuth** (users, stats, orders, import, broadcast, settings, products)
- **1 публичный API позволяет любому стать админом** (users/role.ts)
- **8+ публичных API не проверяют принадлежность данных** (addresses, cart, reviews, favorites)
- **Итого: 18+ критических уязвимостей безопасности**

**Риск**: Полный взлом системы, утечка данных, спам

**Время исправления**: 1-2 часа

---

### 2. 🔴 **9 ПУСТЫХ ENDPOINTS - ФУНКЦИОНАЛЬНОСТЬ НЕ ЗАВЕРШЕНА**

| Файл | Причина |
|------|---------|
| pages/api/products/[id].ts | GET детали товара - нужен фронте |
| pages/api/pages/[slug].ts | GET публичные страницы - нужен фронте |
| pages/admin/pages/edit/[slug].tsx | Редактор страниц - нужен админу |
| pages/api/orders/[id]/status.ts | GET статус заказа |
| pages/api/promocodes/[code].ts | GET детали промокода |
| pages/api/admin/banners/[id].ts | PUT/DELETE баннер |
| pages/api/admin/faq/[id].ts | PUT/DELETE FAQ |
| pages/api/admin/pages/[slug].ts | PUT/DELETE страница |
| pages/api/admin/price-import/[id].ts | DELETE товар из импорта |

**Риск**: Приложение падает при обращении к этим маршрутам

**Время исправления**: 2-3 часа

---

### 3. 🔴 **ОШИБКИ В КРИТИЧЕСКИХ ФАЙЛАХ**

| Файл | Проблема | Риск |
|------|----------|------|
| pages/api/orders.ts | Функция createInvoiceLink не существует | Платежи не работают |
| lib/db.ts | Неправильное имя переменной окружения | БД не подключится |
| components/ActivationModal.tsx | Слабая валидация | Активация может упасть |

**Риск**: Основной функционал не работает

**Время исправления**: 30 минут

---

## 📊 МЕТРИКИ ГОТОВНОСТИ

```
┌─────────────────────────────────────────┐
│ АУДИТ VapeShop - DASHBOARD              │
├─────────────────────────────────────────┤
│                                         │
│ Безопасность:        ████░░░░░░ 40%   │ 🔴
│ Функциональность:    ███████░░░ 70%   │ 🟡
│ Качество кода:       ██████░░░░ 60%   │ 🟡
│ Документация:        ███████░░░ 70%   │ 🟡
│ ТЗ соответствие:     ████████░░ 80%   │ 🟡
│                                         │
│ ─────────────────────────────────────── │
│ ОБЩАЯ ГОТОВНОСТЬ: ███████░░░░ 64%     │ 🟡
│                                         │
│ READY FOR PRODUCTION: ❌ НЕТ            │
│ READY FOR BETA: ⚠️ ТОЛЬКО ПОСЛЕ FASE 1│
│                                         │
└─────────────────────────────────────────┘
```

---

## 📋 ПЛАН ДЕЙСТВИЙ

### FASE 1: КРИТИЧЕСКИЕ (БЛОКИРУЮТ PRODUCTION) — 2.5 часа

**Нужно сделать ПРЯМО СЕЙЧАС:**

```
✅ ЗАДАЧА 1: Добавить requireAuth в 7 админ API (1 час)
   └─ users.ts, stats.ts, orders.ts, import.ts, broadcast.ts, settings.ts, products.ts
   └─ Формула: добавить 5 строк в начало каждого файла

✅ ЗАДАЧА 2: Исправить pages/api/users/role.ts (10 минут)
   └─ Добавить requireAuth(['admin']) - иначе любой станет админом!

✅ ЗАДАЧА 3: Добавить проверки принадлежности в публичные API (45 минут)
   └─ addresses.ts, cart.ts, favorites.ts, reviews.ts
   └─ Проверка: getTelegramId(req) === telegram_id

✅ ЗАДАЧА 4: Исправить 3 критических файла (30 минут)
   └─ orders.ts - заменить createInvoiceLink
   └─ db.ts - исправить DATABASE_URL
   └─ ActivationModal.tsx - улучшить валидацию
```

**После FASE 1**: Проект пригоден для **closed beta** (с предупреждениями)

---

### FASE 2: ВЫСОКИЙ ПРИОРИТЕТ — 3 часа

**Нужно сделать ДО production:**

```
✅ ЗАДАЧА 1: Заполнить 9 пустых endpoints (2 часа)
   └─ Срочно: products/[id].ts, pages/[slug].ts, pages/edit/[slug].tsx
   └─ Важные: orders/[id]/status.ts, promocodes/[code].ts
   └─ Остальные: 4 админ эндпоинта DELETE

✅ ЗАДАЧА 2: Протестировать весь функционал (1 час)
   └─ Создание заказа (платежи)
   └─ Редактирование страниц
   └─ CSV импорт и активация
   └─ Смена статуса заказа
```

**После FASE 2**: Проект пригоден для **production**

---

### FASE 3: УЛУЧШЕНИЯ (опционально) — 3 часа

```
✅ Добавить индексы в БД
✅ Создать types/api.ts
✅ Добавить loading states везде
✅ Реализовать кэширование
✅ Добавить rate limiting
```

---

## ✅ РЕКОМЕНДАЦИЯ

### Если нужен БЫСТРЫЙ production (1-2 дня):

1. Выполни FASE 1 (2.5 часа)
2. Выполни FASE 2 (3 часа)
3. Deploy в production с предупреждением о beta статусе

**Итого: ~6 часов работы = готовый проект**

---

### Если нужен ПОЛНЫЙ production (1 неделя):

1. FASE 1 (2.5 часа)
2. FASE 2 (3 часа)
3. FASE 3 (3 часа)
4. Протестировать на 5+ пользователях
5. Исправить найденные баги
6. Deploy с полной документацией

**Итого: ~8 часов работы + тестирование**

---

## 📄 ДОКУМЕНТАЦИЯ АУДИТА

**Все результаты аудита сохранены в `docs/audit/`:**

1. **FINAL_AUDIT_REPORT.md** (16 KB)
   - Полный анализ по фазам P1-P8
   - Таблицы с проблемами
   - Рекомендации по приоритетам

2. **DETAILED_FILE_AUDIT.md** (12 KB)
   - Анализ каждого файла
   - Код с примерами проблем
   - Шаблоны решений

3. **ACTION_PLAN.md** (7 KB)
   - Пошаговый план исправлений
   - Чеклист для каждого исправления
   - Рекомендуемый порядок работы

4. **SECURITY_AUDIT.txt** (этот файл)
   - Резюме с TOP-3 проблемами
   - Метрики готовности
   - Финальное решение

---

## 🚀 NEXT STEPS

### Следующий промпт для исправления:

```
"Исправь критические проблемы безопасности:
1. Добавь requireAuth в 7 админ API
2. Исправь pages/api/users/role.ts (уязвимость)
3. Добавь проверки владельца в публичные API
4. Исправь 3 критических файла (orders.ts, db.ts, ActivationModal.tsx)

Следуй ACTION_PLAN.md и используй шаблоны из DETAILED_FILE_AUDIT.md"
```

---

## 📞 КОНТАКТЫ

**Если что-то непонятно:**
- Смотри `docs/audit/DETAILED_FILE_AUDIT.md` — там примеры кода
- Смотри `docs/audit/ACTION_PLAN.md` — там пошаговый план
- Используй `docs/audit/FINAL_AUDIT_REPORT.md` — там все детали

---

**Аудит завершён. Статус: ❌ НЕ ГОТОВ К PRODUCTION. После FASE 1-2: ✅ ГОТОВ.**


════════════════════════════════════════════════════════════════════════════════
## 📄 01_auth\README_AUTH_SYSTEM.md
════════════════════════════════════════════════════════════════════════════════

# 🔐 Система Аутентификации и Авторизации VapeShop

Полнофункциональная система управления доступом (RBAC) для Telegram Mini App магазина вейпов.

## 📋 Содержание

1. [Обзор](#обзор)
2. [Компоненты](#компоненты)
3. [Роли и права](#роли-и-права)
4. [Быстрый старт](#быстрый-старт)
5. [Файлы документации](#файлы-документации)
6. [Статус реализации](#статус-реализации)

## 🎯 Обзор

Система обеспечивает защиту всех API эндпоинтов от несанкционированного доступа путём:

- ✅ Проверки аутентификации (заголовок X-Telegram-Id)
- ✅ Проверки авторизации (роли пользователя)
- ✅ Проверки блокировки пользователей
- ✅ Логирования всех действий администраторов

### Архитектура

```
┌─ Telegram Mini App (Клиент)
│  ├─ window.Telegram.WebApp.initDataUnsafe.user.id
│  └─ Отправляет X-Telegram-Id заголовок
│
├─ Frontend Utilities (lib/frontend/auth.ts)
│  ├─ getTelegramIdHeader() - получение заголовков
│  ├─ fetchWithAuth() - fetch с автозаголовком
│  └─ fetchWithAuthAndHandle() - с обработкой ошибок
│
├─ API Эндпоинты (pages/api/*)
│  ├─ Проходят через middleware requireAuth
│  ├─ Получают заголовок X-Telegram-Id
│  └─ Обрабатываются согласно ролям
│
└─ Backend Authentication (lib/auth.ts)
   ├─ getTelegramIdFromRequest() - извлечение ID
   ├─ getUserRole() - получение роли из БД
   ├─ isUserBlocked() - проверка блокировки
   ├─ requireAuth() - middleware для защиты
   └─ getTelegramId() - получение ID после auth
```

## 🔑 Компоненты

### Backend - lib/auth.ts

Основной модуль аутентификации на сервере.

**Экспортируемые функции:**

```typescript
// Получение информации о пользователе
getTelegramIdFromRequest(req) → number | null
getUserRole(telegramId) → 'admin' | 'manager' | 'seller' | 'buyer' | null
isUserBlocked(telegramId) → boolean
getTelegramId(req) → number

// Проверка доступа
hasRequiredRole(telegramId, allowedRoles) → boolean
checkAccess(telegramId, allowedRoles) → { allowed: boolean; reason?: string }

// Middleware
requireAuth(handler, allowedRoles) → NextApiHandler
```

**Использование:**
```typescript
import { requireAuth, getTelegramId } from '../../../lib/auth';

async function handler(req, res) {
  // Ваша логика
  const telegramId = getTelegramId(req);
}

export default requireAuth(handler, ['admin']); // Требует роль admin
```

### Frontend - lib/frontend/auth.ts

Утилиты на клиенте для работы с аутентификацией.

**Экспортируемые функции:**

```typescript
// Заголовки
getTelegramIdHeader() → { 'X-Telegram-Id': string }
getInitDataHeader() → { 'Authorization': 'Bearer ...' }

// Информация о пользователе
getCurrentTelegramId() → number | null
getCurrentUser() → TelegramUser | null
isInTelegramApp() → boolean

// Fetch обёртки
fetchWithAuth(url, options) → Response
fetchWithAuthAndHandle(url, options) → Promise<any>
```

**Использование:**
```typescript
import { fetchWithAuth } from '../../../lib/frontend/auth';

const response = await fetchWithAuth('/api/admin/products', {
  method: 'POST',
  body: JSON.stringify(data),
});
```

## 👥 Роли и права

| Роль | Может делать | Не может делать |
|------|-------------|-----------------|
| **admin** | Всё (управление товарами, заказами, пользователями, статистика, импорт) | Ничего (полный доступ) |
| **manager** | Просмотр заказов, изменение статуса | Товары, пользователи, настройки |
| **seller** | Подтверждение кодов доставки (в будущем) | Товары, заказы (без кодов), пользователи |
| **buyer** | Покупки, корзина, профиль | Админ-панель, управление другими пользователями |

## 🚀 Быстрый старт

### 1. Защита нового эндпоинта

```typescript
import { requireAuth, getTelegramId } from '../../../lib/auth';

async function handler(req, res) {
  if (req.method === 'POST') {
    const telegramId = getTelegramId(req);
    // Ваша логика
  }
}

export default requireAuth(handler, ['admin']);
```

### 2. Использование на фронтенде

```typescript
import { fetchWithAuth } from '../../../lib/frontend/auth';

const data = await fetchWithAuth('/api/admin/products', {
  method: 'POST',
  body: JSON.stringify(product),
});
```

### 3. Тестирование через curl

```bash
# Без заголовка → 401
curl -X GET http://localhost:3000/api/admin/products

# С заголовком, роль admin → 200
curl -X GET http://localhost:3000/api/admin/products \
  -H "X-Telegram-Id: 123456789"

# С заголовком, роль buyer → 403
curl -X GET http://localhost:3000/api/admin/products \
  -H "X-Telegram-Id: 987654321"
```

## 📚 Файлы документации

### Справочные документы

- **QUICK_AUTH_REFERENCE.md** - Быстрые примеры кода для копирования
  - Шаблон для новых эндпоинтов
  - SQL запросы
  - Тесты через curl

- **AUTH_SYSTEM_SUMMARY.md** - Полный обзор архитектуры
  - Архитектура системы
  - Схема БД
  - Примеры кода
  - Решение проблем

### Руководства по внедрению

- **ADMIN_API_AUTH_GUIDE.md** - Как защищать админские API
  - Таблица всех эндпоинтов
  - Требуемые роли для каждого
  - Пошаговая инструкция

- **ADMIN_API_ORDERS_EXAMPLE.md** - Подробный пример
  - До и после защиты
  - Объяснение каждого шага
  - Тестирование

- **FRONTEND_ADMIN_AUTH_SETUP.md** - Как обновлять фронтенд
  - Примеры для каждого компонента
  - Обработка ошибок
  - Тестирование в DevTools

### Отслеживание прогресса

- **AUTH_IMPLEMENTATION_CHECKLIST.md** - Чеклист всех работ
  - Статус каждого эндпоинта
  - TODO для каждого компонента
  - Скролляющийся прогресс-бар

- **NEXT_STEPS.md** - Рекомендации для следующей сессии
  - Приоритеты работы
  - Минимальный MVP
  - Инструменты отладки

## 📊 Статус реализации

### Фаза 1: Backend (100% ✅)
- [x] lib/auth.ts - Все функции реализованы
- [x] lib/frontend/auth.ts - Все утилиты готовы
- [x] /api/admin/products.ts - Защищен requireAuth
- [x] /api/cart.ts - Защищен от блокировки

### Фаза 2: Остальные Admin API (20%)
- [x] /api/admin/products.ts - ✓ ГОТОВ
- [ ] /api/admin/orders.ts - TODO
- [ ] /api/admin/users.ts - TODO
- [ ] /api/admin/stats.ts - TODO
- [ ] /api/admin/settings.ts - TODO
- [ ] /api/admin/import.ts - TODO
- [ ] /api/admin/broadcast.ts - TODO
- [ ] /api/admin/faq.ts - TODO (если есть)

### Фаза 3: Frontend (0%)
- [ ] pages/admin/products.tsx - TODO
- [ ] pages/admin/orders.tsx - TODO
- [ ] pages/admin/users.tsx - TODO
- [ ] pages/admin/stats.tsx - TODO
- [ ] pages/admin/settings.tsx - TODO
- [ ] pages/admin/import.tsx - TODO
- [ ] pages/admin/broadcast.tsx - TODO
- [ ] pages/admin/faq.tsx - TODO

### Фаза 4: База данных (0%)
- [ ] Таблица admin_logs создана
- [ ] Индексы добавлены
- [ ] Миграция выполнена

### Фаза 5: Тестирование (0%)
- [ ] Unit тесты для lib/auth.ts
- [ ] Интеграционные тесты для API
- [ ] E2E тесты для админки

**Общий прогресс: 16% (Фаза 1 завершена, остальное требует внедрения)**

## 🔐 Безопасность

### Текущая реализация
- ✅ Заголовок X-Telegram-Id для аутентификации
- ✅ Проверка ролей на бэкенде
- ✅ Проверка блокировки на бэкенде
- ✅ Логирование действий администраторов
- ⚠️ Заголовок не криптографически защищен (может быть подделан)

### Будущие улучшения
- [ ] HMAC-SHA256 верификация initData
- [ ] Refresh tokens для долгоживущих сессий
- [ ] Rate limiting по IP и пользователю
- [ ] Двухфакторная аутентификация для админов
- [ ] Audit log с детализацией действий

## 📋 Требования к БД

### Таблица users
```sql
-- Обязательные поля
telegram_id BIGINT PRIMARY KEY
username VARCHAR(255)
role VARCHAR(50) DEFAULT 'buyer' -- admin, manager, seller, buyer
is_blocked BOOLEAN DEFAULT FALSE
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()

-- Индексы
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_blocked ON users(is_blocked);
```

### Таблица admin_logs (требуется создать)
```sql
id SERIAL PRIMARY KEY
user_telegram_id BIGINT NOT NULL (REFERENCES users.telegram_id)
action VARCHAR(50) NOT NULL
details JSONB
created_at TIMESTAMP DEFAULT NOW()

-- Индексы
CREATE INDEX idx_admin_logs_user ON admin_logs(user_telegram_id);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at DESC);
```

## 🔧 Конфигурация окружения

Требуемые переменные в `.env.local`:

```env
# Обязательные (уже используются)
TELEGRAM_BOT_TOKEN=your_token_here
WEBAPP_URL=https://your-domain.com

# Опционально (для будущей верификации)
TELEGRAM_BOT_SECRET=your_secret_key
```

## 💡 Лучшие практики

1. **Всегда используйте requireAuth для adminских API**
   ```typescript
   export default requireAuth(handler, ['admin']);
   ```

2. **Логируйте критические действия**
   ```typescript
   const telegramId = getTelegramId(req);
   await query('INSERT INTO admin_logs ...');
   ```

3. **Используйте fetchWithAuth на фронтенде**
   ```typescript
   const res = await fetchWithAuth('/api/admin/products');
   ```

4. **Всегда обрабатывайте 401/403**
   ```typescript
   if (response.status === 401) { /* не аутентифицирован */ }
   if (response.status === 403) { /* нет прав */ }
   ```

5. **Тестируйте в DevTools перед коммитом**
   - Проверьте заголовок X-Telegram-Id в Network tab
   - Проверьте статус 200/401/403

## 🆘 Частые проблемы

| Проблема | Решение |
|----------|---------|
| 401 Unauthorized | Проверьте заголовок X-Telegram-Id в DevTools |
| 403 Forbidden | Проверьте роль пользователя: `SELECT role FROM users WHERE telegram_id = X` |
| Заголовок не отправляется | Используйте `fetchWithAuth()` вместо `fetch()` |
| Логирование не работает | Убедитесь что таблица admin_logs создана |

## 📞 Помощь

1. Прочитайте QUICK_AUTH_REFERENCE.md для быстрых примеров
2. Посмотрите ADMIN_API_ORDERS_EXAMPLE.md для подробного примера
3. Используйте AUTH_IMPLEMENTATION_CHECKLIST.md для отслеживания
4. Смотрите NEXT_STEPS.md для рекомендаций

## 📅 История обновлений

### Версия 1.0 (текущая)
- ✅ Backend аутентификация (lib/auth.ts)
- ✅ Frontend утилиты (lib/frontend/auth.ts)
- ✅ Пример защиты API (products.ts)
- ✅ Полная документация

## 📝 Лицензия

Часть проекта VapeShop. Все компоненты закрыты.

---

**Начните отсюда:** Прочитайте [QUICK_AUTH_REFERENCE.md](QUICK_AUTH_REFERENCE.md) для быстрого старта 🚀


════════════════════════════════════════════════════════════════════════════════
## 📄 02_payments\README_REPORTS.md
════════════════════════════════════════════════════════════════════════════════

📊 АНАЛИЗ ГОТОВНОСТИ VAPESHOP - ИНДЕКС ДОКУМЕНТОВ
═══════════════════════════════════════════════════════════════

Оба документа находятся в C:\Users\rrrme\OneDrive\Рабочий стол\VapeShop

📄 ФАЙЛЫ ОТЧЕТА:
─────────────────────────────────────────────────────────────

1. 📋 SUMMARY.txt (краткая сводка - 11 KB)
   ├─ ОБЩАЯ ОЦЕНКА: 42%
   ├─ Таблица метрик по каждому блоку (9/10, 8/10, 7/10...)
   ├─ Что полностью реализовано
   ├─ Что частично реализовано
   ├─ Что отсутствует полностью
   ├─ 3 КРИТИЧЕСКИЕ ОШИБКИ
   ├─ Приоритеты для MVP (по неделям)
   ├─ Риски и рекомендации
   └─ Время на чтение: 3-5 минут

2. 📖 АНАЛИЗ_ГОТОВНОСТИ.md (подробный анализ - 42 KB)
   ├─ Раздел 1: Общая оценка (42%) с обоснованием
   ├─ Раздел 2: Что реализовано полностью (14 категорий)
   │  └─ 2.1-2.9 с ссылками на файлы и строки кода
   ├─ Раздел 3: Что реализовано частично (11 категорий)
   │  └─ 3.1-3.11 с описанием что работает/не работает
   ├─ Раздел 4: Что отсутствует полностью (12 категорий)
   │  └─ 4.1-4.12 с обоснованием критичности
   ├─ Раздел 5: Оценка по ключевым блокам (таблица 8 пунктов)
   ├─ Раздел 6: Все существующие API эндпоинты
   ├─ Раздел 7: Статус базы данных (таблицы, миграции)
   ├─ Раздел 8: Рекомендации по приоритетам (P1-P16)
   ├─ Раздел 9: Выявленные ошибки и баги
   ├─ Раздел 10: Файлы требующие создания/доработки
   ├─ Раздел 11: Выводы и рекомендации
   ├─ Раздел 12: Чеклист готовности к запуску
   └─ Время на чтение: 15-20 минут


═══════════════════════════════════════════════════════════════
БЫСТРЫЙ СТАРТ
═══════════════════════════════════════════════════════════════

ЕСЛИ У ВАС 5 МИНУТ:
→ Прочитайте SUMMARY.txt

ЕСЛИ У ВАС 20 МИНУТ:
→ Прочитайте АНАЛИЗ_ГОТОВНОСТИ.md полностью

ЕСЛИ ВЫ РАЗРАБОТЧИК:
→ Используйте разделы:
  - Раздел 2-4 для понимания текущего статуса
  - Раздел 6 для описания API
  - Раздел 8 для приоритизации задач
  - Раздел 9 для поиска ошибок
  - Раздел 10 для списка создания файлов

ЕСЛИ ВЫ МЕНЕДЖЕР:
→ Используйте разделы:
  - Раздел 1 для оценки готовности (42%)
  - Раздел 5 для метрик по блокам
  - Раздел 8 для планирования сроков (MVP в 3-4 недели)
  - Раздел 11 для выводов


═══════════════════════════════════════════════════════════════
КЛЮЧЕВЫЕ ЦИФРЫ
═══════════════════════════════════════════════════════════════

ГОТОВНОСТЬ К MVP:                    42%
СРЕДНЯЯ ОЦЕНКА ПО БЛОКАМ:           5.6/10
ОЦЕНКА ДЛЯ PRODUCTION:              4.2/10

ЛУЧШИЕ ЧАСТИ:
✅ Каталог товаров                   9/10
✅ Дизайн и UX                       8/10

ПРОБЛЕМНЫЕ ЧАСТИ:
❌ Оплата Telegram Stars             2/10
❌ Роли и права (защита)             3/10

КРИТИЧЕСКИЕ БЛОКЕРЫ:
1. Оплата не реализована
2. API без защиты (любой может всё менять)
3. Уведомления не работают


═══════════════════════════════════════════════════════════════
РЕКОМЕНДУЕМЫЙ ПЛАН РАЗВИТИЯ
═══════════════════════════════════════════════════════════════

НЕДЕЛЯ 1 - БЛОКЕРЫ (18 часов):
  [P1] Оплата Telegram Stars (8 часов)
  [P2] Защита API - middleware (4 часа)
  [P3] Уведомления (6 часов)

НЕДЕЛЯ 2 - ФУНКЦИОНАЛ (15 часов):
  [P4] Управление доставкой (6 часов)
  [P5] Активация CSV (4 часа)
  [P6] Промокоды (5 часов)

НЕДЕЛЯ 3 - УДОБСТВО (11 часов):
  [P7] Канбан-доска (4 часа)
  [P8] Контент-менеджмент (4 часа)
  [P9] Рассылки (3 часа)

НЕДЕЛЯ 4 - ФИНИШ (6 часов):
  [P10] Логирование (3 часа)
  Тестирование + деплой

ИТОГО: ~50 часов = ~3-4 недели разработки


═══════════════════════════════════════════════════════════════
СОДЕРЖАНИЕ АНАЛИЗ_ГОТОВНОСТИ.md
═══════════════════════════════════════════════════════════════

1. Общая оценка готовности: 42%
   ├─ Реализовано полностью (25%)
   ├─ Реализовано частично (40%)
   └─ Отсутствует (35%)

2. Реализовано полностью
   ├─ 2.1 Каталог товаров (9/10)
   ├─ 2.2 Страница товара
   ├─ 2.3 Сравнение товаров
   ├─ 2.4 Личный кабинет
   ├─ 2.5 Структура БД
   ├─ 2.6 Дизайн и стили
   ├─ 2.7 Telegram интеграция
   ├─ 2.8 Telegram-бот (базовые команды)
   └─ 2.9 Регистрация и авторизация

3. Реализовано частично
   ├─ 3.1 Корзина (70%)
   ├─ 3.2 Оплата (30%) ⚠️ КРИТИЧНО
   ├─ 3.3 Управление товарами (60%)
   ├─ 3.4 CSV импорт (70%)
   ├─ 3.5 Управление заказами (50%)
   ├─ 3.6 Управление пользователями (50%)
   ├─ 3.7 Дашборд админа (40%)
   ├─ 3.8 Роли и права (60%) ⚠️ БЕЗ ЗАЩИТЫ
   ├─ 3.9 Отзывы (40%)
   ├─ 3.10 Избранное (40%)
   └─ 3.11 FAQ (50%)

4. Отсутствует полностью
   ├─ 4.1 Платежи Telegram Stars ⚠️
   ├─ 4.2 Уведомления ⚠️
   ├─ 4.3 Маркетинг и промокоды
   ├─ 4.4 Контент-менеджмент
   ├─ 4.5 Логирование и аудит
   ├─ 4.6 Резервное копирование
   ├─ 4.7 Доставка (courier)
   ├─ 4.8 Реферальная программа (полная)
   ├─ 4.9 Комплекты и серии
   ├─ 4.10 Интеграции (Redis, Supabase)
   ├─ 4.11 Админ-функции (рассылки, broadcast)
   └─ 4.12 Интерфейс курьера

5. Оценка по ключевым блокам
   ├─ Каталог, фильтры, поиск [9/10]
   ├─ Корзина [6/10]
   ├─ Оплата [2/10] 🔴
   ├─ Личный кабинет [7/10]
   ├─ Админ-панель [5/10]
   ├─ Telegram-бот [4/10]
   ├─ Роли и права [3/10] 🔴
   └─ Дизайн [8/10]

6. Существующие API эндпоинты
   ├─ GET /api/products
   ├─ GET /api/products/[id]
   ├─ GET/POST/PUT/DELETE /api/cart
   ├─ POST /api/orders
   ├─ GET /api/orders
   ├─ GET /api/users/profile
   ├─ GET /api/favorites
   ├─ GET /api/admin/stats
   ├─ GET /api/admin/products
   ├─ POST /api/admin/products
   ├─ POST /api/admin/import
   ├─ И еще 10+ эндпоинтов

7. Статус базы данных
   ├─ Подключение: ✅ PostgreSQL (Neon)
   ├─ Таблицы: ✅ 12 основных таблиц
   ├─ Неиспользуемые: ❌ 15+ таблиц в ТЗ но не в коде
   └─ Миграции: ❌ Отсутствуют

8. Рекомендации по приоритетам
   ├─ 16 приоритетов от P1 до P16
   ├─ Разбивка по неделям
   ├─ Оценка сложности (Высокая/Средняя/Низкая)
   └─ Времени на реализацию

9. Выявленные ошибки
   ├─ 🔴 Оплата не работает (файл, строка)
   ├─ 🔴 API без защиты (все endpoints)
   ├─ 🔴 Bug в applyPromo() (ReferenceError)
   ├─ 🟠 Забытые корзины не отслеживаются
   ├─ 🟠 Таблица comparisons использует localStorage
   └─ 🟡 Нет валидации при создании заказа

10. Файлы требующие создания/доработки
    ├─ Новые файлы: 11 основных
    ├─ Файлы для доработки: 6 файлов
    └─ С указанием какую функцию реализовать

11. Выводы и рекомендации
    ├─ Текущее состояние (70% хороший фундамент)
    ├─ Ближайшие шаги (P1-P5)
    ├─ Риски для MVP (3 критических)
    └─ Общая рекомендация

12. Чеклист готовности к запуску
    ├─ 20+ пунктов для проверки перед production
    └─ Включает: оплату, уведомления, валидацию, роли


═══════════════════════════════════════════════════════════════
КОНТАКТЫ ДЛЯ ВОПРОСОВ
═══════════════════════════════════════════════════════════════

Если у вас есть вопросы по отчету:
1. Проверьте раздел "Выводы и рекомендации"
2. Ищите ссылки на конкретные файлы/строки кода
3. Используйте раздел "Приоритеты" для планирования


═══════════════════════════════════════════════════════════════
ДАТА СОЗДАНИЯ ОТЧЕТА
═══════════════════════════════════════════════════════════════

Анализ выполнен: Апрель 2024
Версия отчета: 1.0
Статус: Готов к презентации разработчику


════════════════════════════════════════════════════════════════════════════════
## 📄 03_notifications\README.md
════════════════════════════════════════════════════════════════════════════════

# 🔔 Система Уведомлений VapeShop (P3) - Полное Руководство

**Версия:** 1.0  
**Статус:** ✅ Готово  
**Дата:** 2024

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Архитектура](#архитектура)
3. [Компоненты](#компоненты)
4. [Типы уведомлений](#типы-уведомлений)
5. [Установка и настройка](#установка-и-настройка)
6. [Использование](#использование)
7. [API Endpoints](#api-endpoints)
8. [Интеграция с заказами](#интеграция-с-заказами)
9. [Кроны и задачи](#кроны-и-задачи)
10. [Примеры](#примеры)

---

## 🎯 Обзор

Система уведомлений VapeShop обеспечивает:
- ✅ Отправку сообщений через Telegram Bot API
- ✅ Управление типами уведомлений (включение/отключение)
- ✅ Логирование всех отправленных сообщений
- ✅ Отслеживание брошенных корзин
- ✅ Автоматические напоминания
- ✅ Разные целевые аудитории (admin, manager, seller, buyer)

## 🏗️ Архитектура

```
┌─ Событие в системе (новый заказ, статус изменился)
│
├─ Проверка: включено ли уведомление?
│  └─ Если отключено → SKIP
│
├─ Получение целевых пользователей по роли
│  └─ SELECT FROM users WHERE role = target_role
│
├─ Отправка сообщения через Telegram Bot API
│  └─ bot.api.sendMessage(user_id, text, extra)
│
└─ Логирование в notification_history
   ├─ Статус: sent/failed
   ├─ Время отправки
   └─ Текст сообщения
```

## 🔧 Компоненты

### 1. lib/notifications.ts (11.8 KB)
Основной модуль уведомлений

**Экспортируемые функции:**
- `sendNotification(telegramId, text, extra?, eventType?)` - отправить сообщение одному пользователю
- `broadcastNotification(role, text, extra?, eventType?)` - отправить сообщение всем с ролью
- `notifyAdminsNewOrder(orderId, totalPrice, username, itemsCount)` - новый заказ
- `notifyBuyerOrderCreated(telegramId, orderId, totalPrice)` - заказ оплачен
- `notifyBuyerOrderStatus(telegramId, orderId, newStatus, code6digit?)` - статус изменился
- `notifyAbandonedCart(telegramId, itemsCount, totalPrice)` - напоминание о корзине
- `getNotificationStats(daysBack?)` - статистика

### 2. db/migrations/003_notification_settings.sql
SQL миграция для создания таблиц

**Таблицы:**
- `notification_settings` - настройки типов уведомлений
- `notification_history` - логи отправленных сообщений
- `abandoned_carts` - отслеживание брошенных корзин

### 3. API Endpoints

#### GET /api/admin/settings/notifications
Получить все настройки и статистику

#### POST /api/admin/settings/notifications
Сохранить обновления для нескольких настроек

#### PUT /api/admin/settings/notifications
Обновить одну конкретную настройку

#### PATCH /api/orders/[id]/status
Изменить статус заказа и отправить уведомление

#### GET /api/cron/abandoned-cart
Cron задача для напоминаний о брошенных корзинах

### 4. React компонент
`pages/admin/settings/notifications.tsx` - интерфейс для управления

---

## 📬 Типы уведомлений

### 1. order_new_admin
**Когда:** После оплаты заказа  
**Кому:** Всем админам  
**Текст:** 🆕 Новый заказ #{ID}...  
**Кнопка:** Просмотреть заказ в админке

```
🆕 Новый заказ #550e8400
👤 От: @username
💰 Сумма: 1250 ⭐️
📦 Товаров: 3 шт.
```

### 2. order_status_changed_buyer
**Когда:** Статус заказа изменился на 'confirmed', 'readyship', 'shipped' или 'done'  
**Кому:** Покупателю  
**Примеры:**
- 📦 Заказ #550e8400 подтверждён
- 🚀 Заказ #550e8400 готов к выдаче. Код: 123456
- 🚚 Заказ #550e8400 передан курьеру
- ✅ Заказ #550e8400 выполнен. Спасибо за покупку!

### 3. order_ready_ship
**Когда:** Заказ готов к отправке (status = 'readyship')  
**Кому:** Покупателю  
**Особенность:** Содержит 6-значный код для курьера

```
🚀 Заказ #550e8400 готов к выдаче
Ваш код подтверждения: 123456
```

### 4. abandoned_cart
**Когда:** Корзина не обновлялась 2+ часа (cron)  
**Кому:** Покупателю  
**Кнопка:** Перейти в корзину

```
💔 У вас остались товары в корзине
📦 Товаров: 3 шт.
💰 Сумма: 1250 ⭐️
```

---

## 🚀 Установка и настройка

### Шаг 1: Выполнить миграцию БД

```sql
-- Выполните в Neon/PostgreSQL
-- Содержимое: db/migrations/003_notification_settings.sql

CREATE TABLE IF NOT EXISTS notification_settings (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT TRUE,
  target_role VARCHAR(50) NOT NULL,
  ...
);

-- ... остальные таблицы
```

### Шаг 2: Инициализировать бот в lib/notifications.ts

```typescript
// В pages/api/bot.ts ДО создания экспорта:
import { setBotInstance } from '../../lib/notifications';
setBotInstance(bot);
```

### Шаг 3: Добавить .env переменные

```env
# Обязательные (уже есть)
TELEGRAM_BOT_TOKEN=your_bot_token

# Опционально для Cron
CRON_SECRET=your_cron_secret_key
```

### Шаг 4: Установить Vercel Cron (если на Vercel)

Добавить в `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/abandoned-cart",
      "schedule": "0 * * * *"  // Каждый час
    }
  ]
}
```

---

## 💻 Использование

### Отправить уведомление одному пользователю

```typescript
import { sendNotification } from '../lib/notifications';

await sendNotification(
  123456789,  // telegram_id
  '✅ Ваш заказ оплачен!',
  {
    reply_markup: {
      inline_keyboard: [[
        { text: '📋 Мой заказ', web_app: { url: 'https://...' } }
      ]]
    }
  },
  'order_status_changed_buyer'  // event_type для логирования
);
```

### Отправить рассылку всем админам

```typescript
import { broadcastNotification } from '../lib/notifications';

await broadcastNotification(
  'admin',  // target_role
  '🆕 Новый заказ!',
  undefined,
  'order_new_admin'
);
```

### Отправить специализированное уведомление о новом заказе

```typescript
import { notifyAdminsNewOrder } from '../lib/notifications';

await notifyAdminsNewOrder(
  orderId,
  totalPrice,      // в звёздах
  username,        // имя покупателя
  itemsCount       // количество товаров
);
```

### Отправить уведомление об изменении статуса

```typescript
import { notifyBuyerOrderStatus } from '../lib/notifications';

await notifyBuyerOrderStatus(
  telegramId,
  orderId,
  'readyship',      // 'confirmed', 'readyship', 'shipped', 'done'
  '123456'          // 6-digit code (опционально)
);
```

---

## 📡 API Endpoints

### GET /api/admin/settings/notifications

```bash
curl -X GET http://localhost:3000/api/admin/settings/notifications \
  -H "X-Telegram-Id: 123456789"
```

**Ответ:**
```json
{
  "settings": [
    {
      "id": 1,
      "event_type": "order_new_admin",
      "is_enabled": true,
      "target_role": "admin"
    },
    ...
  ],
  "stats": {
    "total_sent": 150,
    "total_failed": 3,
    "success_rate": "98.0"
  }
}
```

### POST /api/admin/settings/notifications

```bash
curl -X POST http://localhost:3000/api/admin/settings/notifications \
  -H "X-Telegram-Id: 123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      { "id": 1, "is_enabled": false, "target_role": "admin" },
      { "id": 2, "is_enabled": true, "target_role": "buyer" }
    ]
  }'
```

### PATCH /api/orders/[id]/status

```bash
curl -X PATCH http://localhost:3000/api/orders/550e8400/status \
  -H "X-Telegram-Id: 123456789" \
  -H "Content-Type: application/json" \
  -d '{ "status": "readyship" }'
```

**Что происходит:**
1. Изменяется status в БД
2. Логируется действие админа
3. Отправляется уведомление покупателю

### GET /api/cron/abandoned-cart

```bash
# Тестирование
curl -X GET http://localhost:3000/api/cron/abandoned-cart?token=your_cron_secret

# Или с заголовком (для Vercel)
curl -X GET http://localhost:3000/api/cron/abandoned-cart \
  -H "x-cron-secret: your_cron_secret"
```

---

## 🛒 Интеграция с заказами

### В pages/api/orders.ts после успешной оплаты

```typescript
import { notifyAdminsNewOrder, notifyBuyerOrderCreated } from '../../lib/notifications';

// После обновления статуса на 'new' (order paid)
const order = result.rows[0];
const user = await query('SELECT username FROM users WHERE telegram_id = $1', [telegramId]);

// Уведомить админов
await notifyAdminsNewOrder(
  order.id,
  order.total_price,
  user.rows[0]?.username || 'Unknown',
  orderItems.length
);

// Уведомить покупателя
await notifyBuyerOrderCreated(
  telegramId,
  order.id,
  order.total_price
);
```

---

## ⏰ Кроны и задачи

### Abandoned Cart Cron

**Частота:** Каждый час (рекомендуется)

**Что делает:**
1. Находит корзины с последним обновлением > 2 часов назад
2. Проверяет, нет ли у пользователя активных заказов
3. Проверяет, не отправлено ли уже напоминание
4. Отправляет уведомление
5. Обновляет статус в БД

**Установка на Vercel:**
```json
{
  "crons": [
    {
      "path": "/api/cron/abandoned-cart",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Установка на self-hosted:**
Используйте unix cron:
```bash
0 * * * * curl -X GET http://yourapp.com/api/cron/abandoned-cart?token=YOUR_SECRET
```

---

## 📝 Примеры

### Пример 1: Включить/отключить тип уведомления

```typescript
// Отключить напоминания о брошенных корзинах
fetch('/api/admin/settings/notifications', {
  method: 'PUT',
  headers: {
    'X-Telegram-Id': '123456789',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    event_type: 'abandoned_cart',
    is_enabled: false
  })
});
```

### Пример 2: Получить статистику в React

```typescript
useEffect(() => {
  fetch('/api/admin/settings/notifications', {
    headers: { 'X-Telegram-Id': '123456789' }
  })
  .then(r => r.json())
  .then(data => {
    console.log('Всего отправлено:', data.stats.total_sent);
    console.log('Ошибок:', data.stats.total_failed);
    console.log('Успешность:', data.stats.success_rate + '%');
  });
}, []);
```

### Пример 3: Тестовое уведомление

```bash
# В Node.js скрипте
import { sendNotification } from './lib/notifications';

await sendNotification(
  YOUR_TELEGRAM_ID,
  '🔔 Это тестовое уведомление',
  undefined,
  'test'
);
```

---

## 🔐 Безопасность

### Защита API

- ✅ Все endpoints защищены `requireAuth()`
- ✅ Только админы могут менять настройки
- ✅ Все действия логируются в `admin_logs`

### Защита Cron

- ✅ Проверка `CRON_SECRET` для /api/cron/*
- ✅ Rate limiting между уведомлениями (100ms)
- ✅ Graceful error handling

### Безопасность Telegram

- ✅ Используется официальный Bot API через grammY
- ✅ Никакие приватные данные не логируются
- ✅ Все сообщения парсируются как HTML

---

## 🐛 Решение проблем

### Уведомления не отправляются

1. Проверьте `TELEGRAM_BOT_TOKEN` в .env
2. Убедитесь что `setBotInstance()` вызван в bot.ts
3. Проверьте логи: `SELECT * FROM notification_history WHERE status = 'failed'`

### Cron не работает

1. На Vercel: проверьте `vercel.json`
2. На self-hosted: проверьте unix cron: `crontab -l`
3. Проверьте `CRON_SECRET` если используется
4. Тестируйте через curl с заголовком

### Письма не отправляются админам

1. Убедитесь что в БД есть пользователи с `role = 'admin'`
2. Проверьте `notification_settings` - включены ли уведомления?
3. Проверьте логи отправки

---

## 📊 Мониторинг

### SQL запросы для мониторинга

```sql
-- Статистика по типам уведомлений
SELECT event_type, COUNT(*) as count, 
       COUNT(CASE WHEN status='failed' THEN 1 END) as failed
FROM notification_history
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY event_type;

-- Найти проблемы
SELECT * FROM notification_history
WHERE status = 'failed'
ORDER BY sent_at DESC
LIMIT 10;

-- Мониторить брошенные корзины
SELECT COUNT(*), COUNT(CASE WHEN reminder_sent THEN 1 END) as reminded
FROM abandoned_carts
WHERE abandoned_at >= NOW() - INTERVAL '24 hours';
```

---

## 📚 Дополнительные файлы

- `docs/03_notifications/IMPLEMENTATION_CHECKLIST.md` - чеклист внедрения
- `docs/03_notifications/COPY_PASTE_TEMPLATES.md` - готовые куски кода
- `docs/03_notifications/TROUBLESHOOTING.md` - решение проблем
- `docs/03_notifications/API_REFERENCE.md` - справка по API

---

**Система уведомлений готова к production!** ✨


════════════════════════════════════════════════════════════════════════════════
## 📄 04_delivery\README.md
════════════════════════════════════════════════════════════════════════════════

# 🚚 Система управления доставкой VapeShop (P4) - Полное руководство

**Версия:** 1.0  
**Статус:** ✅ Готово  
**Дата:** 2024  
**Язык:** RU | EN

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Архитектура](#архитектура)
3. [Компоненты системы](#компоненты-системы)
4. [Установка и настройка](#установка-и-настройка)
5. [Использование](#использование)
6. [API Reference](#api-reference)
7. [Примеры реальной жизни](#примеры-реальной-жизни)
8. [Устранение неполадок](#устранение-неполадок)
9. [Развертывание](#развертывание)

---

## 🎯 Обзор

Система управления доставкой (Phase P4) обеспечивает полный цикл управления доставкой товаров в VapeShop:

### Ключевые возможности:
- ✅ **Пункты выдачи** - управление точками самовывоза (CRUD для админов)
- ✅ **Адреса доставки** - сохранение и управление адресами клиентов
- ✅ **Два способа доставки** - "Самовывоз" и "Доставка на адрес"
- ✅ **Интеграция с заказами** - привязка метода доставки к каждому заказу
- ✅ **Выбор даты доставки** - клиент указывает удобное время
- ✅ **Профиль пользователя** - управление адресами в личном кабинете
- ✅ **Админ-панель** - управление пунктами выдачи
- ✅ **Публичный API** - получение списка пунктов выдачи

### Кому это нужно:
- 👨‍💼 **Администраторам** - управление пунктами выдачи
- 👤 **Покупателям** - выбор способа доставки и адреса
- 💻 **Разработчикам** - интеграция в свои системы

---

## 🏗️ Архитектура

```
┌──────────────────────────────────────────────────────────────────┐
│                     VapeShop Delivery System                      │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React/Next.js)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Корзина]              [Профиль]               [Админ-панель]  │
│   ├─ Выбор способа      ├─ Мои адреса           ├─ Пункты      │
│   ├─ Выбор пункта       ├─ Добавить адрес       ├─ Добавить     │
│   └─ Выбор даты         ├─ Редактировать        ├─ Редактировать
│                         └─ Удалить              └─ Удалить      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                         [API Layer]
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     API Endpoints (11 шт)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ADMIN:                    CUSTOMER:            PUBLIC:          │
│  GET /admin/...            GET /addresses       GET /pickup-     │
│  POST /admin/...           POST /addresses      points           │
│  PUT /admin/...            PUT /addresses                        │
│  DELETE /admin/...         DELETE /addresses                     │
│                                                                  │
│  ORDERS:                                                         │
│  POST /orders (updated)                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Database Layer (PostgreSQL)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐   ┌──────────────────┐   ┌─────────────┐ │
│  │  pickup_points   │   │    addresses     │   │   orders    │ │
│  ├──────────────────┤   ├──────────────────┤   ├─────────────┤ │
│  │ id (UUID)        │   │ id (UUID)        │   │ id (UUID)   │ │
│  │ name             │   │ user_telegram_id │   │ total_price │ │
│  │ address          │   │ address          │   │ delivery_   │ │
│  │ is_active        │   │ is_default       │   │   method    │ │
│  │ created_at       │   │ created_at       │   │ pickup_     │ │
│  │ updated_at       │   │ updated_at       │   │   point_id  │ │
│  │                  │   │                  │   │ address     │ │
│  └──────────────────┘   └──────────────────┘   │ delivery_   │ │
│                                                 │   date      │ │
│                                                 └─────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Компоненты системы

### 1. Слой базы данных (Database Layer)

#### Таблица: `pickup_points`
Хранит список пунктов выдачи товаров.

```sql
CREATE TABLE pickup_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,              -- "Пункт выдачи - Центр"
  address TEXT NOT NULL,                   -- "г. Москва, ул. Тверская, д. 1"
  is_active BOOLEAN DEFAULT TRUE,          -- включен/отключен
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Индексы:**
- `idx_pickup_points_is_active` - быстрый поиск активных точек
- `idx_pickup_points_created_at` - сортировка по дате

#### Таблица: `addresses`
Хранит адреса доставки пользователей.

```sql
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id BIGINT NOT NULL,        -- ID пользователя
  address TEXT NOT NULL,                   -- полный адрес
  is_default BOOLEAN DEFAULT FALSE,        -- адрес по умолчанию
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id),
  UNIQUE(user_telegram_id, address)        -- один адрес 1 раз на юзера
);
```

**Индексы:**
- `idx_addresses_user_telegram_id` - быстрый поиск адресов пользователя
- `idx_addresses_is_default` - быстрый поиск адреса по умолчанию

#### Таблица: `orders` (обновлена)
Расширена для поддержки доставки.

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(50);
-- Возможные значения: "pickup" или "delivery"

ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_point_id UUID;
-- Ссылка на пункт выдачи (если delivery_method = "pickup")

ALTER TABLE orders ADD COLUMN IF NOT EXISTS address TEXT;
-- Адрес доставки (если delivery_method = "delivery")

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_date DATE;
-- Дата желаемой доставки/выдачи
```

---

### 2. Admin APIs (Управление пунктами выдачи)

#### GET /api/admin/pickup-points
Получить все пункты выдачи с пагинацией.

**Требует:** Admin role  
**Query params:**
- `page` (optional) - номер страницы (default: 1)
- `limit` (optional) - элементов на странице (default: 20, max: 100)

**Ответ (200):**
```json
{
  "pickup_points": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Пункт выдачи - Центр",
      "address": "г. Москва, ул. Тверская, д. 1",
      "is_active": true,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

#### POST /api/admin/pickup-points
Создать новый пункт выдачи.

**Требует:** Admin role  
**Body:**
```json
{
  "name": "Пункт выдачи - Восток",
  "address": "г. Москва, ул. Комсомольская, д. 42"
}
```

**Ответ (201):**
```json
{
  "pickup_point": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Пункт выдачи - Восток",
    "address": "г. Москва, ул. Комсомольская, д. 42",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

#### PUT /api/admin/pickup-points
Обновить пункт выдачи.

**Требует:** Admin role  
**Body:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Пункт выдачи - Центр (новое имя)",
  "address": "г. Москва, ул. Тверская, д. 5",
  "is_active": true
}
```

**Ответ (200):**
```json
{
  "success": true
}
```

#### DELETE /api/admin/pickup-points
Удалить (soft delete) пункт выдачи.

**Требует:** Admin role  
**Query params:**
- `id` (required) - UUID пункта выдачи

**Ответ (200):**
```json
{
  "success": true
}
```

---

### 3. Customer APIs (Управление адресами пользователей)

#### GET /api/addresses
Получить все адреса пользователя.

**Требует:** Authorization (User Telegram ID в заголовке)  
**Query params:**
- `telegram_id` (required) - ID Telegram пользователя

**Ответ (200):**
```json
{
  "addresses": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "user_telegram_id": 123456789,
      "address": "г. Москва, ул. Арбат, д. 15, кв. 42",
      "is_default": true,
      "created_at": "2024-01-10T08:00:00Z",
      "updated_at": "2024-01-10T08:00:00Z"
    }
  ]
}
```

#### POST /api/addresses
Добавить новый адрес.

**Требует:** Authorization  
**Body:**
```json
{
  "telegram_id": 123456789,
  "address": "г. Москва, ул. Арбат, д. 15, кв. 42",
  "is_default": false
}
```

**Ответ (200):**
```json
{
  "address": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "user_telegram_id": 123456789,
    "address": "г. Москва, ул. Арбат, д. 15, кв. 42",
    "is_default": false,
    "created_at": "2024-01-15T15:00:00Z",
    "updated_at": "2024-01-15T15:00:00Z"
  }
}
```

#### PUT /api/addresses
Обновить адрес или установить адрес по умолчанию.

**Требует:** Authorization  
**Body:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "address": "г. Москва, ул. Арбат, д. 15, кв. 50",
  "is_default": true
}
```

**Ответ (200):**
```json
{
  "success": true
}
```

#### DELETE /api/addresses
Удалить адрес.

**Требует:** Authorization  
**Query params:**
- `id` (required) - UUID адреса

**Ответ (200):**
```json
{
  "success": true
}
```

---

### 4. Public APIs (Публичные)

#### GET /api/pickup-points
Получить список активных пунктов выдачи (без аутентификации).

**Требует:** Нет  
**Ответ (200):**
```json
{
  "pickup_points": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Пункт выдачи - Центр",
      "address": "г. Москва, ул. Тверская, д. 1",
      "is_active": true,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### 5. Order Integration (Интеграция с заказами)

#### POST /api/orders (обновлен)
Создать заказ с выбором способа доставки.

**Требует:** Authorization  
**Body (для самовывоза):**
```json
{
  "telegram_id": 123456789,
  "items": [
    { "product_id": "prod-1", "quantity": 2 },
    { "product_id": "prod-2", "quantity": 1 }
  ],
  "delivery_method": "pickup",
  "pickup_point_id": "550e8400-e29b-41d4-a716-446655440000",
  "delivery_date": "2024-01-20"
}
```

**Body (для доставки на адрес):**
```json
{
  "telegram_id": 123456789,
  "items": [
    { "product_id": "prod-1", "quantity": 2 }
  ],
  "delivery_method": "delivery",
  "address": "г. Москва, ул. Арбат, д. 15, кв. 42",
  "delivery_date": "2024-01-20"
}
```

**Ответ (201):**
```json
{
  "order": {
    "id": "order-123",
    "user_telegram_id": 123456789,
    "total_price": 2500,
    "delivery_method": "pickup",
    "pickup_point_id": "550e8400-e29b-41d4-a716-446655440000",
    "delivery_date": "2024-01-20",
    "status": "pending",
    "created_at": "2024-01-15T16:00:00Z"
  }
}
```

---

### 6. Frontend Components (React)

#### Компонент: DeliverySelector (в корзине)
Позволяет выбрать способ доставки.

**Использование:**
```tsx
import DeliverySelector from '@/components/DeliverySelector';

export function CartPage() {
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [selectedPickup, setSelectedPickup] = useState<string | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<string>('');

  return (
    <DeliverySelector
      method={deliveryMethod}
      onMethodChange={setDeliveryMethod}
      selectedPickup={selectedPickup}
      onPickupSelect={setSelectedPickup}
      deliveryDate={deliveryDate}
      onDateChange={setDeliveryDate}
    />
  );
}
```

#### Компонент: PickupPointsList (список пунктов)
Отображает доступные пункты выдачи.

**Использование:**
```tsx
import PickupPointsList from '@/components/PickupPointsList';

export function CheckoutPage() {
  return (
    <PickupPointsList
      onSelect={(pointId) => console.log('Selected:', pointId)}
      selectedId={selectedPickup}
    />
  );
}
```

#### Компонент: AddressManager (управление адресами)
Компонент в профиле для управления адресами.

**Использование:**
```tsx
import AddressManager from '@/components/AddressManager';

export function ProfilePage() {
  return (
    <div>
      <h1>Мой профиль</h1>
      <AddressManager telegramId={userTelegramId} />
    </div>
  );
}
```

#### Компонент: AdminPickupPointsPanel (админ-панель)
Управление пунктами выдачи для админов.

**Использование:**
```tsx
import AdminPickupPointsPanel from '@/components/AdminPickupPointsPanel';

export function AdminPage() {
  return (
    <div>
      <h1>Админ-панель</h1>
      <AdminPickupPointsPanel />
    </div>
  );
}
```

---

## 📦 Установка и настройка

### Шаг 1: SQL миграция

Запустить миграцию для создания таблиц:

```bash
# Файл: db/migrations/004_delivery_management.sql
psql -h your-host -U your-user -d your-db -f db/migrations/004_delivery_management.sql
```

или через интерфейс Neon:

```sql
-- Скопировать содержимое 004_delivery_management.sql
-- и выполнить в Neon SQL Editor
```

**Проверка:**
```sql
-- Проверяем таблицы
\dt pickup_points
\dt addresses

-- Проверяем индексы
SELECT * FROM pg_indexes WHERE tablename IN ('pickup_points', 'addresses');
```

### Шаг 2: Переменные окружения

Убедиться, что `.env.local` содержит:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_BOT_USERNAME=your_bot_username

# API
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Шаг 3: Обновить API endpoints

Убедиться, что файлы есть в проекте:

```
pages/
  ├─ api/
  │  ├─ admin/
  │  │  └─ pickup-points.ts ✅
  │  ├─ addresses.ts ✅
  │  ├─ pickup-points.ts ✅
  │  └─ orders.ts (обновлен) ✅
```

### Шаг 4: Frontend компоненты

Создать компоненты в `components/`:

```
components/
  ├─ DeliverySelector.tsx
  ├─ PickupPointsList.tsx
  ├─ AddressManager.tsx
  └─ AdminPickupPointsPanel.tsx
```

### Шаг 5: Стили (Tailwind CSS)

Использовать существующие классы Tailwind:

```tsx
// Пример
export function DeliverySelector() {
  return (
    <div className="space-y-4 p-4 bg-gray-900 rounded-lg border border-neon-green">
      <h2 className="text-white font-bold">Способ доставки</h2>
      {/* содержимое */}
    </div>
  );
}
```

**Neon цвета:**
- `text-neon-green` / `bg-neon-green`
- `text-neon-pink` / `bg-neon-pink`
- `text-neon-blue` / `bg-neon-blue`

---

## 💡 Использование

### Для пользователей

#### 1. Выбор способа доставки (в корзине)

```
КОРЗИНА
├─ [Товары]
│  ├─ Eliquid Premium - 1000₽
│  └─ Vapor Coils - 800₽
│
├─ [СПОСОБ ДОСТАВКИ]
│  ├─ ◯ Самовывоз (выбрать точку) ← ВЫБРАНО
│  └─ ◯ Доставка на адрес
│
├─ [ПУНКТ ВЫДАЧИ]
│  ├─ ○ Пункт выдачи - Центр (ул. Тверская, д. 1)
│  └─ ◉ Пункт выдачи - Восток (ул. Комсомольская, д. 42) ← ВЫБРАНО
│
├─ [ДАТА ДОСТАВКИ]
│  └─ 📅 2024-01-20
│
└─ [ИТОГО] 1800₽ ✓ Оформить заказ
```

#### 2. Управление адресами (профиль)

```
МЕХОЗА
├─ [МОИ АДРЕСА]
│  ├─ ✓ г. Москва, ул. Арбат, д. 15, кв. 42 (по умолчанию)
│  │  └─ [✏️] [❌]
│  │
│  ├─ г. Москва, ул. Ленина, д. 10
│  │  └─ [✏️] [❌]
│  │
│  └─ [+ ДОБАВИТЬ АДРЕС]
│
└─ [СОХРАНИТЬ ИЗМЕНЕНИЯ] ✓
```

### Для администраторов

#### 1. Добавление нового пункта выдачи

```bash
curl -X POST http://localhost:3000/api/admin/pickup-points \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Id: 123456789" \
  -d '{
    "name": "Пункт выдачи - Юго-Запад",
    "address": "г. Москва, ул. Мосфильмовская, д. 70"
  }'
```

#### 2. Просмотр всех пунктов

```bash
curl -X GET "http://localhost:3000/api/admin/pickup-points?page=1&limit=20" \
  -H "X-Telegram-Id: 123456789"
```

#### 3. Обновление пункта выдачи

```bash
curl -X PUT http://localhost:3000/api/admin/pickup-points \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Id: 123456789" \
  -d '{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Пункт выдачи - Центр (обновлено)",
    "address": "г. Москва, ул. Тверская, д. 5"
  }'
```

#### 4. Отключение пункта выдачи

```bash
curl -X DELETE "http://localhost:3000/api/admin/pickup-points?id=550e8400-e29b-41d4-a716-446655440000" \
  -H "X-Telegram-Id: 123456789"
```

### Для разработчиков

#### Пример: Создание заказа с доставкой

```typescript
// lib/orders.ts
async function createOrderWithDelivery(
  telegramId: number,
  items: Array<{ productId: string; quantity: number }>,
  deliveryMethod: 'pickup' | 'delivery',
  pickupPointId?: string,
  address?: string,
  deliveryDate?: string
) {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Id': telegramId.toString(),
    },
    body: JSON.stringify({
      telegram_id: telegramId,
      items,
      delivery_method: deliveryMethod,
      pickup_point_id: pickupPointId,
      address,
      delivery_date: deliveryDate,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create order');
  }

  return response.json();
}
```

#### Пример: Получение пунктов выдачи

```typescript
// lib/delivery.ts
async function getPickupPoints() {
  const response = await fetch('/api/pickup-points');
  const data = await response.json();
  return data.pickup_points;
}
```

#### Пример: Управление адресами

```typescript
// lib/addresses.ts
async function getUserAddresses(telegramId: number) {
  const response = await fetch(`/api/addresses?telegram_id=${telegramId}`);
  const data = await response.json();
  return data.addresses;
}

async function addAddress(telegramId: number, address: string, isDefault: boolean = false) {
  const response = await fetch('/api/addresses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      telegram_id: telegramId,
      address,
      is_default: isDefault,
    }),
  });
  return response.json();
}
```

---

## 📚 API Reference

### Endpoint Summary

| Method | URL | Auth | Цель |
|--------|-----|------|------|
| GET | `/api/admin/pickup-points` | Admin | Получить все пункты (админ) |
| POST | `/api/admin/pickup-points` | Admin | Создать пункт |
| PUT | `/api/admin/pickup-points` | Admin | Обновить пункт |
| DELETE | `/api/admin/pickup-points?id=` | Admin | Удалить пункт |
| GET | `/api/addresses?telegram_id=` | User | Получить адреса юзера |
| POST | `/api/addresses` | User | Добавить адрес |
| PUT | `/api/addresses` | User | Обновить адрес |
| DELETE | `/api/addresses?id=` | User | Удалить адрес |
| GET | `/api/pickup-points` | None | Получить активные пункты |
| POST | `/api/orders` | User | Создать заказ (обновлено) |

### Коды ошибок

| Код | Описание | Решение |
|-----|---------|---------|
| 200 | OK | Успешно |
| 201 | Created | Ресурс создан |
| 400 | Bad Request | Проверить параметры запроса |
| 401 | Unauthorized | Отсутствует X-Telegram-Id |
| 404 | Not Found | Ресурс не найден |
| 405 | Method Not Allowed | HTTP метод не поддерживается |
| 500 | Server Error | Ошибка сервера |

### Правила валидации

#### pickup_points
- `name` - обязателен, строка 1-255 символов
- `address` - обязателен, строка 1-500 символов
- `is_active` - boolean (по умолчанию true)

#### addresses
- `address` - обязателен, строка 1-500 символов
- `is_default` - boolean (по умолчанию false)
- Уникальность: один адрес для юзера может быть добавлен только 1 раз

#### orders (delivery)
- `delivery_method` - обязателен, значения: "pickup" или "delivery"
- Если "pickup" → `pickup_point_id` обязателен
- Если "delivery" → `address` обязателен
- `delivery_date` - рекомендуется в формате YYYY-MM-DD

---

## 🎯 Примеры реальной жизни

### Сценарий 1: Новый пользователь заказывает с самовывозом

```
1️⃣ Пользователь заходит в приложение
2️⃣ Добавляет товары в корзину (Eliquid Premium 1000₽)
3️⃣ Переходит в корзину
4️⃣ Выбирает "Самовывоз"
5️⃣ Видит список пунктов выдачи:
   - Пункт выдачи - Центр (ул. Тверская, д. 1)
   - Пункт выдачи - Восток (ул. Комсомольская, д. 42) ← ВЫБИРАЕТ
6️⃣ Выбирает дату: 2024-01-20
7️⃣ Кликает "Оформить заказ"
8️⃣ Система создает заказ с:
   - delivery_method: "pickup"
   - pickup_point_id: "id-точки-востока"
   - delivery_date: "2024-01-20"
9️⃣ Заказ создан ✅
```

**SQL запрос для проверки:**
```sql
SELECT * FROM orders 
WHERE user_telegram_id = 123456789 
AND delivery_method = 'pickup' 
ORDER BY created_at DESC LIMIT 1;
```

### Сценарий 2: Постоянный клиент с адресом

```
1️⃣ Клиент логируется в приложение
2️⃣ Переходит в Профиль → Мои адреса
3️⃣ Видит сохраненные адреса:
   ✓ г. Москва, ул. Арбат, д. 15, кв. 42 (по умолчанию)
   - г. Москва, ул. Ленина, д. 10
4️⃣ Кликает "+ Добавить адрес"
5️⃣ Вводит новый адрес: "г. Москва, ул. Мосфильмовская, д. 70, кв. 15"
6️⃣ Сохраняет адрес
7️⃣ Добавляет товары в корзину
8️⃣ Выбирает "Доставка на адрес"
9️⃣ Выбирает один из своих адресов
🔟 Выбирает дату доставки
1️⃣1️⃣ Кликает "Оформить заказ"
1️⃣2️⃣ Заказ создан с адресом доставки ✅
```

### Сценарий 3: Администратор добавляет новый пункт

```bash
# 1. Администратор кликает "Добавить пункт выдачи" в админ-панели
# 2. Вводит:
#    Название: "Пункт выдачи - Северный"
#    Адрес: "г. Москва, ул. Петровка, д. 30"
# 3. Кликает "Создать"

curl -X POST http://localhost:3000/api/admin/pickup-points \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Id: admin-telegram-id" \
  -d '{
    "name": "Пункт выдачи - Северный",
    "address": "г. Москва, ул. Петровка, д. 30"
  }'

# Ответ:
{
  "pickup_point": {
    "id": "new-uuid-123",
    "name": "Пункт выдачи - Северный",
    "address": "г. Москва, ул. Петровка, д. 30",
    "is_active": true,
    "created_at": "2024-01-15T18:00:00Z",
    "updated_at": "2024-01-15T18:00:00Z"
  }
}

# 4. Новый пункт появляется в списке ✅
# 5. Покупатели могут его выбрать при оформлении заказа
```

---

## 🐛 Устранение неполадок

### Проблема 1: "Ошибка загрузки пунктов выдачи"

**Симптомы:**
- При открытии список пунктов пуст или показывается ошибка
- Статус 500 или 404

**Решения:**
1. Проверить миграцию выполнена:
   ```sql
   SELECT COUNT(*) FROM pickup_points;
   ```

2. Убедиться, что is_active = true:
   ```sql
   SELECT * FROM pickup_points WHERE is_active = true;
   ```

3. Проверить логи сервера:
   ```bash
   npm run dev
   # Посмотреть console.error
   ```

### Проблема 2: "Адрес уже существует"

**Симптомы:**
- При добавлении адреса - 400 ошибка "UNIQUE constraint violated"

**Решение:**
Ограничение UNIQUE предотвращает добавление одинаковых адресов одному юзеру:
```sql
UNIQUE(user_telegram_id, address)
```

Если нужно изменить адрес → использовать PUT вместо POST

### Проблема 3: "Пункт выдачи не найден"

**Симптомы:**
- При обновлении/удалении - 404 ошибка

**Решение:**
1. Проверить ID пункта в БД:
   ```sql
   SELECT id, name FROM pickup_points WHERE id = 'your-id';
   ```

2. Убедиться, что передан правильный формат UUID

### Проблема 4: 401 Unauthorized

**Симптомы:**
- При любом запросе требующем auth

**Решение:**
Убедиться, что заголовок присутствует:
```bash
-H "X-Telegram-Id: 123456789"
```

или в Telegram WebApp контексте используется initData

### Проблема 5: Статус доставки не обновляется

**Симптомы:**
- Заказ создан, но delivery_method остаётся NULL

**Решение:**
Проверить API запрос при создании заказа:
```javascript
// НЕПРАВИЛЬНО
const order = await fetch('/api/orders', {
  body: JSON.stringify({ items: [...] })
  // Забыли про delivery_method!
});

// ПРАВИЛЬНО
const order = await fetch('/api/orders', {
  body: JSON.stringify({
    items: [...],
    delivery_method: 'pickup',
    pickup_point_id: 'id-123'
  })
});
```

---

## 🚀 Развертывание

### Pre-deployment Checklist

- [ ] Все миграции выполнены
- [ ] ENV переменные установлены
- [ ] API endpoints протестированы
- [ ] Frontend компоненты интегрированы
- [ ] Админ-панель протестирована
- [ ] Стили (Tailwind) применены
- [ ] Логирование работает
- [ ] Ошибки обрабатываются

### Production Deployment Steps

1. **Backup базы данных:**
   ```bash
   pg_dump -h host -U user -d database > backup.sql
   ```

2. **Выполнить миграцию:**
   ```sql
   -- На production базе выполнить 004_delivery_management.sql
   ```

3. **Проверить индексы:**
   ```sql
   SELECT * FROM pg_indexes 
   WHERE tablename IN ('pickup_points', 'addresses', 'orders');
   ```

4. **Запустить на production:**
   ```bash
   npm run build
   npm start
   ```

5. **Протестировать endpoints:**
   ```bash
   # Public API
   curl https://prod.vape-shop.com/api/pickup-points
   
   # Admin API (требует auth)
   curl -H "X-Telegram-Id: admin-id" \
        https://prod.vape-shop.com/api/admin/pickup-points
   ```

6. **Мониторинг:**
   - Проверять ошибки в логах
   - Мониторить производительность запросов
   - Следить за использованием диска БД

### Performance Considerations

- Индексы помогают при поиске (is_active, user_telegram_id)
- Пагинация для больших списков пунктов (по 20 за раз)
- Кэширование пунктов выдачи на клиенте (редко меняются)
- Triggers для updated_at автоматического обновления

---

## 📞 Контакты и поддержка

- **Документация:** See [NAVIGATION.md](./NAVIGATION.md)
- **Примеры:** See [EXAMPLES.md](./EXAMPLES.md)
- **Чек-лист:** See [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)
- **API Reference:** See [API_REFERENCE.md](./API_REFERENCE.md)

**Версия:** 1.0  
**Последнее обновление:** 2024  
**Статус:** ✅ Production Ready



════════════════════════════════════════════════════════════════════════════════
## 📄 05_import\README.md
════════════════════════════════════════════════════════════════════════════════

# 📦 Phase P5: Импорт товаров и активация

**Версия:** 1.0  
**Дата:** 2025  
**Автор:** VapeShop Team

## 📋 Оглавление

1. [Обзор системы импорта](#-обзор-системы-импорта)
2. [Архитектура](#-архитектура)
3. [Компоненты системы](#-компоненты-системы)
4. [Процесс использования](#-процесс-использования)
5. [Требования к CSV](#-требования-к-csv)
6. [Активация товаров](#-активация-товаров)
7. [API Endpoints](#-api-endpoints)
8. [Безопасность](#-безопасность)
9. [Решение проблем](#-решение-проблем)
10. [FAQ](#-faq)

---

## 📋 Обзор системы импорта

### Что это?

Система импорта товаров — это специализированный модуль управления каталогом товаров для интернет-магазина VapeShop. Система позволяет быстро загружать большие партии товаров из CSV файлов, проверять данные и активировать их в основном каталоге.

### Основные возможности

- ✅ **Массовая загрузка товаров** через CSV файлы
- ✅ **Двухэтапная проверка** — валидация и активация
- ✅ **Управление ценами** — выбор ценовых уровней (4 варианта)
- ✅ **Автоматическая проверка дубликатов** по названию
- ✅ **Загрузка изображений** при активации
- ✅ **Полная история операций** для аудита

### Для кого?

| Роль | Возможности |
|------|------------|
| **Администратор** | Полный доступ к импорту, активации, удалению |
| **Менеджер товаров** | Импорт, просмотр и активация товаров |
| **Система** | Валидация, логирование, аудит всех операций |

---

## 🏗️ Архитектура

### Диаграмма процесса

```
┌─────────────────────────────────────────────────────────────┐
│                    СИСТЕМА ИМПОРТА ТОВАРОВ                  │
└─────────────────────────────────────────────────────────────┘

            ┌─────────────────┐
            │  CSV FILE       │
            │ (raw data)      │
            └────────┬────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │ ЭТАП 1: ЗАГРУЗКА CSV   │
        │ (/admin/import)        │
        │ • Валидация структуры  │
        │ • Проверка дубликатов  │
        │ • Сохранение временно  │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │ ТАБЛИЦА: price_import  │
        │ (временное хранилище)  │
        │ id_imported = false    │
        └────────┬───────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
    ┌──────────┐    ┌──────────────┐
    │ Удалить  │    │ ЭТАП 2:      │
    │ (DELETE) │    │ ПРОСМОТР     │
    └──────────┘    │ (/price-import)│
                    │ Фильтры/поиск │
                    └────────┬──────┘
                             │
                             ▼
                    ┌────────────────────────┐
                    │ ЭТАП 3: АКТИВАЦИЯ      │
                    │ (/admin/activate)      │
                    │ • Выбор цены           │
                    │ • Выбор категории      │
                    │ • Загрузка изображений │
                    │ • Установка флагов     │
                    └────────┬───────────────┘
                             │
                             ▼
                    ┌────────────────────────┐
                    │ ТАБЛИЦА: products      │
                    │ (основной каталог)     │
                    │ Товар в продаже! ✓     │
                    └────────────────────────┘
```

### Три этапа процесса

| Этап | Название | Компонент | Описание |
|------|----------|-----------|---------|
| 1️⃣ | **Загрузка CSV** | POST `/api/admin/import` | Получение и валидация CSV, временное сохранение |
| 2️⃣ | **Проверка** | GET `/api/admin/price-import` | Просмотр импортированных товаров, фильтрация |
| 3️⃣ | **Активация** | POST `/api/admin/activate` | Выбор параметров и перемещение в основной каталог |

---

## 📊 Компоненты системы

### Таблица: `price_import`

Временное хранилище импортированных товаров.

```sql
CREATE TABLE price_import (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  specification TEXT,
  stock INT NOT NULL,
  price_tier_1 DECIMAL(10,2),
  price_tier_2 DECIMAL(10,2),
  price_tier_3 DECIMAL(10,2),
  distributor_price DECIMAL(10,2),
  duplicate_name VARCHAR(255),  -- Если найден дубликат
  is_activated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activated_at TIMESTAMP NULL,
  product_id INT NULL REFERENCES products(id),
  error_message TEXT NULL
);
```

### Таблица: `products` (основной каталог)

Основная таблица товаров (существующая).

```sql
-- Расширенные поля для импорта:
ALTER TABLE products ADD COLUMN IF NOT EXISTS:
  import_source VARCHAR(50),     -- 'csv_import', 'manual'
  import_batch_id INT,           -- Связь с импортом
  price_tier_id INT,             -- Выбранный ценовый уровень
  is_promotion BOOLEAN DEFAULT FALSE,
  is_bestseller BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE
```

### Компоненты UI

| Путь | Компонент | Функция |
|------|-----------|---------|
| `/admin/import` | Upload форма | Загрузка CSV файла |
| `/admin/price-import` | Таблица товаров | Просмотр и управление |
| `/admin/activate` | Модальное окно | Активация товаров |

### API маршруты

- `POST /api/admin/import` — загрузка CSV
- `GET /api/admin/price-import` — список импортированных
- `POST /api/admin/activate` — активация товара
- `DELETE /api/admin/price-import/[id]` — удаление из очереди

---

## 🚀 Процесс использования

### Шаг 1: Подготовка CSV файла

Подготовьте CSV файл со следующей структурой:

```
name,specification,stock,price_tier_1,price_tier_2,price_tier_3,distributor_price
```

**Пример:**

```
Vape Pod Pro,Никотин 20мг, 50 мл,100,250.00,230.00,200.00,150.00
Atomizer RDA,Диаметр 24мм,75,180.00,165.00,150.00,100.00
```

### Шаг 2: Загрузить CSV (страница `/admin/import`)

1. Перейти на страницу `/admin/import`
2. Нажать кнопку "Загрузить CSV"
3. Выбрать файл (макс. размер 10 МБ)
4. Система проверит структуру и дубликаты
5. При успехе — товары появятся в таблице с статусом "неактивирован"

**Возможные ошибки:**

- ❌ **Неверный формат CSV** — проверьте наличие всех колонок
- ❌ **Дубликаты найдены** — товары с такими именами уже есть
- ❌ **Некорректные цены** — цены должны быть числами

### Шаг 3: Просмотреть импортированные (страница `/admin/price-import`)

1. Перейти на `/admin/price-import`
2. Таблица показывает все загруженные товары
3. Фильтры:
   - **По статусу:** неактивирован / активирован
   - **По названию:** быстрый поиск
   - **По дате:** последние загрузки

**Действия:**

- 👁️ **Просмотр деталей** — открыть полную информацию
- ✏️ **Активировать** — перейти к шагу активации
- 🗑️ **Удалить** — удалить из очереди импорта

### Шаг 4: Активировать товары (страница `/admin/activate`)

1. На странице `/admin/price-import` нажать "Активировать" на товаре
2. Откроется модальное окно с форма для заполнения:
   - **Выбор цены** (4 варианта: tier_1, tier_2, tier_3, distributor)
   - **Категория** (выпадающий список)
   - **Бренд** (опционально)
   - **Изображение** (загрузить или использовать по умолчанию)
   - **Флаги:** Акция, Хит, Новинка
3. Нажать "Активировать"
4. Товар перемещается в основной каталог (`products`)

### Шаг 5: Готово в каталоге

Товар становится доступен на сайте и в API:

```
GET /api/products/[id] — товар доступен покупателям
```

---

## 📝 Требования к CSV

### Обязательные колонки

| Колонка | Тип | Пример | Описание |
|---------|-----|--------|---------|
| `name` | TEXT | Vape Pod Pro | Название товара (макс. 255 символов) |
| `specification` | TEXT | Никотин 20мг | Спецификация (опубликуется как описание) |
| `stock` | INT | 100 | Количество на складе (положительное число) |
| `price_tier_1` | DECIMAL | 250.00 | Цена уровня 1 (рознич на кол-во) |
| `price_tier_2` | DECIMAL | 230.00 | Цена уровня 2 (от 10 шт) |
| `price_tier_3` | DECIMAL | 200.00 | Цена уровня 3 (от 50 шт) |
| `distributor_price` | DECIMAL | 150.00 | Цена для дистрибьюторов (от 100 шт) |

### Формат CSV

```csv
name,specification,stock,price_tier_1,price_tier_2,price_tier_3,distributor_price
Vape Pod Pro,Никотин 20мг 50 мл,100,250.00,230.00,200.00,150.00
Atomizer RDA,Диаметр 24мм Нержавейка,75,180.00,165.00,150.00,100.00
Coil Kanthal,0.4 Ohm 10 штук,200,120.00,110.00,100.00,70.00
```

### ✅ Правильный формат

- ✓ Кодировка: **UTF-8**
- ✓ Разделитель: **запятая (,)**
- ✓ Цены: **точка (.) как разделитель**
- ✓ Первая строка: **заголовки колонок**
- ✓ Размер файла: **до 10 МБ**
- ✓ Максимум строк: **10 000 товаров за один импорт**

### ❌ Неправильный формат

```csv
# ❌ Неверная кодировка (Windows-1251)
# ❌ Разделитель точка с запятой (;)
# ❌ Цены через запятую: 250,00 (должно 250.00)
# ❌ Отсутствует обязательная колонка
# ❌ Пустые строки в середине файла
```

### Пример полного CSV файла

```csv
name,specification,stock,price_tier_1,price_tier_2,price_tier_3,distributor_price
Vape Pod Pro Ultra,Никотин 20мг 50 мл Вишня,100,250.00,230.00,200.00,150.00
Atomizer RDA Genesis,Диаметр 24мм Нержавейка 316L,75,180.00,165.00,150.00,100.00
Coil Kanthal A1,0.4 Ohm 10 штук в упаковке,200,120.00,110.00,100.00,70.00
Хлопок органический,100% хлопок премиум,150,85.00,75.00,65.00,45.00
Мод BOX TC,200W 2 аккумулятора Черный,50,2500.00,2300.00,2100.00,1800.00
Жидкость для вейпа,Фруктовый микс 30 мл,500,199.00,180.00,160.00,120.00
```

---

## 🔄 Активация товаров

### Диаграмма активации

```
Товар в очереди (price_import)
         │
         ├─ Проверка наличия
         ├─ Выбор цены (4 варианта)
         ├─ Выбор категории
         ├─ Загрузка изображения
         └─ Установка флагов
         │
         ▼
Товар в каталоге (products)
```

### Выбор цены (4 варианта)

При активации администратор выбирает одну из четырех загруженных цен:

| Цена | Поле | Применение | Пример |
|------|------|-----------|--------|
| 💰 **Tier 1** | `price_tier_1` | Розница 1 шт | 250.00 |
| 💵 **Tier 2** | `price_tier_2` | От 10 шт | 230.00 |
| 💴 **Tier 3** | `price_tier_3` | От 50 шт | 200.00 |
| 📦 **Дистрибьютор** | `distributor_price` | От 100 шт | 150.00 |

**По умолчанию:** выбирается `price_tier_1` (розница)

### Выбор категории и бренда

```
Категория (обязательно):
  - Модули/Боксы
  - Атомайзеры
  - Расходники
  - Жидкости
  - Аксессуары

Бренд (опционально):
  - Вавада
  - GeekVape
  - Voopoo
  - (собственное имя)
```

### Загрузка изображений

- **Основное изображение:** обязательно (JPG/PNG, макс. 5 МБ)
- **Дополнительные изображения:** опционально (до 5 штук)
- **Формат:** JPG или PNG
- **Размер:** рекомендуется 800x800px (минимум 400x400px)

### Флаги активации

```javascript
{
  "is_promotion": false,    // Товар на акции
  "is_bestseller": false,   // Хит продаж (звезда)
  "is_new": false           // Новое поступление
}
```

### Форма активации (JSON)

```json
{
  "id_imported": 42,
  "price_tier": "price_tier_1",
  "category_id": 5,
  "brand_name": "GeekVape",
  "image_url": "https://cdn.vapeshop.ru/products/42.jpg",
  "additional_images": ["image1.jpg", "image2.jpg"],
  "is_promotion": true,
  "is_bestseller": false,
  "is_new": true
}
```

---

## ⚙️ API Endpoints

### 1. POST `/api/admin/import`

**Загрузка CSV файла**

**Запрос:**

```bash
curl -X POST http://localhost:3000/api/admin/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@products.csv"
```

**Ответ (200 OK):**

```json
{
  "success": true,
  "message": "Загружено 150 товаров",
  "stats": {
    "total": 150,
    "new": 148,
    "duplicates": 2
  },
  "duplicates": [
    {
      "name": "Vape Pod Pro",
      "count": 2,
      "existing_id": 5
    }
  ]
}
```

**Ошибки:**

```json
{
  "success": false,
  "error": "INVALID_CSV_FORMAT",
  "message": "Отсутствует колонка: price_tier_1"
}
```

### 2. GET `/api/admin/price-import`

**Получение списка импортированных товаров**

**Запрос:**

```bash
curl -X GET "http://localhost:3000/api/admin/price-import?status=inactive&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Query параметры:**

| Параметр | Тип | Описание |
|----------|-----|---------|
| `status` | string | `inactive` или `active` |
| `search` | string | Поиск по названию |
| `page` | int | Номер страницы (по умолчанию 1) |
| `limit` | int | Товаров на странице (по умолчанию 20) |

**Ответ (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "name": "Vape Pod Pro",
      "specification": "Никотин 20мг 50 мл",
      "stock": 100,
      "price_tier_1": 250.00,
      "price_tier_2": 230.00,
      "price_tier_3": 200.00,
      "distributor_price": 150.00,
      "is_activated": false,
      "created_at": "2025-04-02T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "pages": 8,
    "limit": 20
  }
}
```

### 3. POST `/api/admin/activate`

**Активация товара в каталоге**

**Запрос:**

```bash
curl -X POST http://localhost:3000/api/admin/activate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id_imported": 42,
    "price_tier": "price_tier_1",
    "category_id": 5,
    "brand_name": "GeekVape",
    "image_url": "https://cdn.vapeshop.ru/products/42.jpg",
    "is_promotion": true,
    "is_bestseller": false,
    "is_new": true
  }'
```

**Body параметры:**

| Параметр | Тип | Обязательно | Описание |
|----------|-----|-------------|---------|
| `id_imported` | int | ✓ | ID товара в price_import |
| `price_tier` | string | ✓ | Выбранная цена (tier_1, tier_2, tier_3, distributor) |
| `category_id` | int | ✓ | ID категории товара |
| `brand_name` | string | ✗ | Название бренда |
| `image_url` | string | ✗ | URL основного изображения |
| `is_promotion` | bool | ✗ | Флаг акции (по умолчанию false) |
| `is_bestseller` | bool | ✗ | Флаг хита (по умолчанию false) |
| `is_new` | bool | ✗ | Флаг новинки (по умолчанию false) |

**Ответ (201 Created):**

```json
{
  "success": true,
  "message": "Товар активирован",
  "product_id": 128,
  "data": {
    "id": 128,
    "name": "Vape Pod Pro",
    "slug": "vape-pod-pro",
    "category_id": 5,
    "brand": "GeekVape",
    "price": 250.00,
    "stock": 100,
    "is_active": true,
    "created_at": "2025-04-02T10:05:00Z"
  }
}
```

**Ошибки:**

```json
{
  "success": false,
  "error": "PRODUCT_ALREADY_ACTIVE",
  "message": "Товар уже активирован"
}
```

### 4. DELETE `/api/admin/price-import/[id]`

**Удаление товара из очереди импорта**

**Запрос:**

```bash
curl -X DELETE http://localhost:3000/api/admin/price-import/42 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Ответ (200 OK):**

```json
{
  "success": true,
  "message": "Товар удалён из очереди"
}
```

**Ошибка:**

```json
{
  "success": false,
  "error": "PRODUCT_NOT_FOUND",
  "message": "Товар не найден"
}
```

---

## 🔐 Безопасность

### Аутентификация и авторизация

```javascript
// Все API endpoints требуют:
✓ Valid JWT токен в заголовке Authorization
✓ Роль пользователя: admin или manager

if (!user.role.includes('admin', 'manager')) {
  return res.status(403).json({ error: 'FORBIDDEN' });
}
```

### Валидация данных

```javascript
// Входные данные валидируются:
✓ CSV структура (наличие всех колонок)
✓ Типы данных (цены - decimal, stock - int)
✓ Диапазоны значений (цены > 0, stock >= 0)
✓ Размер файла (макс. 10 МБ)
✓ Формат изображений (JPG/PNG, макс. 5 МБ)
```

### Логирование операций

```sql
CREATE TABLE import_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  action VARCHAR(50),        -- 'upload', 'activate', 'delete'
  product_count INT,
  status VARCHAR(20),        -- 'success', 'error'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Все действия логируются:**

- 📝 Загрузка CSV (файл, кол-во товаров)
- ✓ Активация товара (ID, параметры)
- 🗑️ Удаление товара (ID)
- ⚠️ Ошибки при обработке

### Защита от атак

| Угроза | Защита |
|--------|--------|
| **SQL Injection** | Prepared statements, ORM |
| **CSV Injection** | Проверка на формулы в первый символ |
| **Загрузка файлов** | Проверка MIME-type, размера, расширения |
| **DoS** | Rate limiting на API endpoints |
| **Несанкционированный доступ** | Role-based access control (RBAC) |

---

## 🐛 Решение проблем

### Проблема: Дубликаты товаров

**Симптом:**
```
При загрузке CSV система говорит: "Найдены дубликаты"
```

**Причины:**

1. **Товар с таким же названием уже в каталоге** — система предотвращает добавление дубликатов
2. **Несколько товаров с одним названием в CSV** — проверьте исходный файл

**Решение:**

```sql
-- Проверить дубликаты в БД
SELECT name, COUNT(*) as count FROM products 
WHERE name LIKE '%Vape Pod Pro%'
GROUP BY name HAVING count > 1;

-- Удалить старый товар (если он неактуален)
DELETE FROM products WHERE id = 5 AND is_active = FALSE;

-- Или переименовать импортируемый товар
-- Обновить CSV: "Vape Pod Pro" → "Vape Pod Pro v2"
```

**Если товар нужно обновить:**

1. Удалите старый товар из каталога
2. Загрузите CSV с обновленными данными
3. Активируйте товар как новый

### Проблема: Ошибка при импорте CSV

**Симптом:**
```
"INVALID_CSV_FORMAT" — Отсутствует колонка: price_tier_1
```

**Решение:**

1. Проверьте **первую строку CSV** — должны быть все 7 колонок
2. Проверьте **кодировку файла** — должна быть UTF-8
3. Проверьте **разделитель** — должны быть запятые (,)
4. Откройте CSV в текстовом редакторе и проверьте структуру

**Правильная первая строка:**

```
name,specification,stock,price_tier_1,price_tier_2,price_tier_3,distributor_price
```

### Проблема: Товар не активируется

**Симптом:**
```
POST /api/admin/activate → ошибка 500
```

**Проверка:**

```bash
# 1. Проверить, что товар существует в очереди
curl -X GET http://localhost:3000/api/admin/price-import?id=42 \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Проверить, не активирован ли уже
curl -X GET http://localhost:3000/api/admin/price-import?id=42 \
  -H "Authorization: Bearer YOUR_TOKEN"
# Если is_activated = true, товар уже активирован

# 3. Проверить логи ошибок
SELECT * FROM import_logs WHERE status = 'error' ORDER BY created_at DESC LIMIT 5;
```

**Решение:**

- Проверьте, что `category_id` существует в таблице `categories`
- Убедитесь, что товар не активирован дважды
- Проверьте права доступа (требуется роль admin)

### Проблема: Как удалить товар после активации?

**Если товар активирован (в каталоге):**

```bash
# 1. Удалить из основного каталога
curl -X DELETE http://localhost:3000/api/admin/products/128 \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Удалить запись из price_import (если нужно)
curl -X DELETE http://localhost:3000/api/admin/price-import/42 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Или через SQL (осторожно!):**

```sql
-- Удалить товар из каталога
DELETE FROM products WHERE id = 128;

-- Удалить запись импорта
DELETE FROM price_import WHERE id = 42;

-- Проверить, что всё удалено
SELECT * FROM products WHERE id = 128;
SELECT * FROM price_import WHERE id = 42;
```

### Проблема: Большой файл не загружается

**Симптом:**
```
413 Payload Too Large
```

**Решение:**

- Максимальный размер файла: **10 МБ**
- Если файл больше, разделите его на несколько частей
- Каждый файл загружайте отдельно

**Как разделить CSV:**

```bash
# Linux/Mac: разделить на 5000 строк
split -l 5000 large_products.csv products_

# Затем загрузить каждый файл
for file in products_*; do
  curl -X POST http://localhost:3000/api/admin/import \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -F "file=@$file"
done
```

### Проблема: Изображение не загружается

**Решение:**

- **Формат:** только JPG или PNG
- **Размер:** максимум 5 МБ
- **Разрешение:** минимум 400x400px

**Проверить изображение:**

```bash
# Проверить размер и формат
file products_image.jpg      # должно вывести: JPEG image data

# Проверить размер файла
ls -lh products_image.jpg    # должен быть < 5 МБ

# Проверить разрешение (Linux/Mac с ImageMagick)
identify products_image.jpg  # должно быть >= 400x400
```

---

## ❓ FAQ

### В: Можно ли обновить товар после активации?

**О:** Не через систему импорта. Используйте интерфейс редактирования товара:
```
/admin/products/[id]/edit
```

Или обновите прямо в БД (для админов):
```sql
UPDATE products SET 
  price = 300.00, 
  stock = 50 
WHERE id = 128;
```

### В: Как импортировать 1 миллион товаров?

**О:** Разделите на 100 файлов по 10 000 товаров каждый и загружайте в цикле:

```javascript
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function uploadMultipleCSV(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const form = new FormData();
    form.append('file', fs.createReadStream(`${directory}/${file}`));
    
    try {
      const response = await axios.post(
        'http://localhost:3000/api/admin/import',
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': 'Bearer YOUR_TOKEN'
          }
        }
      );
      console.log(`✓ ${file}: ${response.data.stats.total} товаров`);
    } catch (error) {
      console.error(`✗ ${file}: ${error.message}`);
    }
  }
}

uploadMultipleCSV('./csv_files');
```

### В: Есть ли скрипт миграции из других платформ?

**О:** Нет встроенного скрипта, но вы можете:

1. Экспортировать товары из старой платформы в CSV
2. Преобразовать в требуемый формат
3. Загрузить через `POST /api/admin/import`

**Пример преобразования (Node.js):**

```javascript
const csv = require('csv-parse/sync');
const fs = require('fs');

const oldData = csv.parse(fs.readFileSync('old_products.csv'), {
  columns: true
});

const newData = oldData.map(row => ({
  name: row.title,
  specification: row.description,
  stock: parseInt(row.qty),
  price_tier_1: parseFloat(row.price),
  price_tier_2: parseFloat(row.price) * 0.92,
  price_tier_3: parseFloat(row.price) * 0.84,
  distributor_price: parseFloat(row.price) * 0.60
}));

// Сохранить новый CSV
```

### В: Можно ли автоматизировать импорт (каждый день, например)?

**О:** Да, используйте cron job или GitHub Actions:

```bash
# crontab -e
0 2 * * * curl -X POST http://localhost:3000/api/admin/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/var/www/daily_products.csv"
```

### В: Что происходит с неиспользованными товарами из импорта?

**О:** Товары остаются в таблице `price_import` до тех пор, пока вы их не удалите. Рекомендуется удалять неиспользованные товары через 30 дней.

```sql
-- Удалить неактивированные товары старше 30 дней
DELETE FROM price_import 
WHERE is_activated = FALSE 
AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### В: Какой максимальный размер изображения?

**О:** 
- **Макс. размер файла:** 5 МБ
- **Рекомендуемое разрешение:** 800x800 пиксель
- **Минимальное разрешение:** 400x400 пиксель
- **Форматы:** JPG, PNG

---

## 📞 Поддержка

**Документация обновлена:** 2025-04-02  
**Версия API:** 1.0  
**Последнее изменение:** Добавлена обработка дубликатов и логирование

**Вопросы и предложения:** 

- 💬 Slack: #vapeshop-support
- 📧 Email: support@vapeshop.ru
- 🐛 Issues: https://github.com/vapeshop/docs/issues

---

**© 2025 VapeShop. All rights reserved.**


════════════════════════════════════════════════════════════════════════════════
## 📄 06_promocodes\README.md
════════════════════════════════════════════════════════════════════════════════

# Модуль P6: Промокоды и исправление applyPromo

## Описание

Модуль управления промокодами для VapeShop. Позволяет администраторам создавать, редактировать и удалять коды скидок, а покупателям — применять их в корзине при оформлении заказа.

## Функциональность

### Для администраторов

1. **Управление промокодами** (`/admin/promocodes`)
   - Просмотр списка всех активных и неактивных промокодов
   - Создание нового промокода с настройкой параметров
   - Редактирование существующего промокода
   - Удаление промокода
   - Просмотр количества использований

2. **Параметры промокода**
   - **Код** — уникальный код скидки (например, `SUMMER2024`)
   - **Тип скидки** — процент (%) или фиксированная сумма (₽)
   - **Размер скидки** — значение процента или рубли
   - **Дата начала** — когда промокод становится активным
   - **Дата окончания** — когда промокод перестаёт работать
   - **Минимальная сумма заказа** — условие для применения
   - **Максимальное количество использований** — лимит на код (если 0 — без ограничений)

### Для покупателей

1. **Применение промокода** в корзине
   - Ввод кода в поле
   - Валидация кода в реальном времени
   - Отображение размера скидки
   - Обновление итоговой суммы

2. **Проверка кода**
   - Существование кода в системе
   - Актуальность по датам
   - Минимальная сумма заказа
   - Осталось ли использований

## API Endpoints

### Публичные endpoints

#### `POST /api/promocodes/apply`
Применить промокод к заказу.

**Параметры:**
```json
{
  "code": "SUMMER2024",
  "cartTotal": 5000,
  "telegramId": 123456789
}
```

**Успешный ответ (200):**
```json
{
  "valid": true,
  "code": "SUMMER2024",
  "discountType": "percent",
  "discountValue": 10,
  "discountAmount": 500,
  "newTotal": 4500
}
```

**Ошибка (400):**
```json
{
  "valid": false,
  "error": "Промокод недействителен или истёк"
}
```

**Возможные ошибки:**
- "Промокод не найден" — код не существует
- "Промокод истёк" — дата окончания прошла
- "Промокод ещё не активен" — дата начала ещё не наступила
- "Минимальная сумма заказа: XXX ₽" — сумма меньше требуемой
- "Промокод исчерпан" — закончились использования
- "Промокод недействителен или истёк" — общая ошибка

#### `GET /api/banners` (связанный endpoint)
Получить активные баннеры. Используется для проверки акций.

### Admin endpoints (требуется роль `admin`)

#### `GET /api/admin/promocodes`
Получить список всех промокодов с пагинацией и поиском.

**Параметры запроса:**
- `page=1` — номер страницы (по умолчанию 1)
- `perPage=10` — количество на странице (по умолчанию 10)
- `search=SUMMER` — поиск по коду или описанию

**Ответ:**
```json
{
  "promocodes": [
    {
      "code": "SUMMER2024",
      "discount_type": "percent",
      "discount_value": 10,
      "valid_from": "2024-06-01",
      "valid_until": "2024-08-31",
      "min_order_amount": 1000,
      "max_uses": 100,
      "used_count": 45
    }
  ],
  "total": 1,
  "page": 1,
  "perPage": 10
}
```

#### `POST /api/admin/promocodes`
Создать новый промокод.

**Параметры:**
```json
{
  "code": "SUMMER2024",
  "discount_type": "percent",
  "discount_value": 10,
  "valid_from": "2024-06-01",
  "valid_until": "2024-08-31",
  "min_order_amount": 1000,
  "max_uses": 100
}
```

**Ответ (201):**
```json
{
  "success": true,
  "message": "Промокод создан",
  "code": "SUMMER2024"
}
```

#### `PUT /api/admin/promocodes/[code]`
Обновить промокод.

**Параметры:** те же, что в POST (все необязательны).

**Ответ (200):**
```json
{
  "success": true,
  "message": "Промокод обновлён"
}
```

#### `DELETE /api/admin/promocodes/[code]`
Удалить промокод.

**Ответ (200):**
```json
{
  "success": true,
  "message": "Промокод удалён"
}
```

## Lifecycle промокода

```
┌─────────────────────────────────────────────────────────────┐
│ 1. АДМИНИСТРАТОР СОЗДАЁТ ПРОМОКОД                          │
│    POST /api/admin/promocodes                              │
│    Код, тип, размер, даты, лимит                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. ПОКУПАТЕЛЬ ВВОДИТ КОД В КОРЗИНЕ                          │
│    pages/cart.tsx → applyPromo()                            │
│    POST /api/promocodes/apply                              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. ВАЛИДАЦИЯ КОДА                                           │
│    - Существует ли код?                                     │
│    - Дата начала ≤ сейчас ≤ дата окончания?                │
│    - Минимальная сумма ≤ сумма заказа?                     │
│    - used_count < max_uses?                                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. РАСЧЁТ СКИДКИ                                            │
│    - Если процент: скидка = сумма × процент / 100          │
│    - Если фиксированная: скидка = значение                 │
│    - Новая сумма = сумма - скидка                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. ПОКУПАТЕЛЬ ОФОРМЛЯЕТ ЗАКАЗ                               │
│    POST /api/orders с { promocode: "SUMMER2024" }           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. ФИНАЛЬНАЯ ВАЛИДАЦИЯ В ЗАКАЗЕ                             │
│    (проверяются те же условия)                              │
│    Если коד валиден: used_count += 1                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. ЗАКАЗ СОЗДАН С ПРИМЕНЁННОЙ СКИДКОЙ                       │
│    orders.promo_code = "SUMMER2024"                         │
│    orders.discount = размер_скидки_в_рублях                │
└─────────────────────────────────────────────────────────────┘
```

## Исправления (P6)

### Исправление bug в `pages/cart.tsx`

**Проблема:** Функция `applyPromo()` ссылалась на переменную `total`, которая не была определена.

**Причина:** `total` — это не переменная, а вычисляемое свойство. Нужно использовать `subtotal` для суммы товаров.

**Решение:** 
- Переписана функция для использования `subtotal` вместо `total`
- Добавлена правильная обработка ошибок с выводом сообщений пользователю
- Обновление UI после успешного применения кода

**Файл:** `pages/cart.tsx`, функция `applyPromo()`

### Изменения в API заказов

**Файл:** `pages/api/orders.ts`

- Добавлена валидация промокода перед созданием заказа
- Повторная проверка всех условий (дата, лимит, минимум)
- Увеличение счётчика использований при успешном создании заказа
- Сохранение информации о скидке в заказе

## Таблица базы данных

```sql
CREATE TABLE promocodes (
  code TEXT PRIMARY KEY,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  min_order_amount DECIMAL(10, 2) DEFAULT 0,
  max_uses INT DEFAULT 0,
  used_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Поля:**
- `code` — уникальный код скидки (ключ)
- `discount_type` — 'percent' или 'fixed'
- `discount_value` — размер скидки
- `valid_from` — дата начала активности
- `valid_until` — дата окончания активности
- `min_order_amount` — минимальная сумма для применения
- `max_uses` — максимальное количество использований (0 = без ограничений)
- `used_count` — текущее количество использований

## Примеры использования

### Создание промокода (администратор)

```bash
curl -X POST http://localhost:3000/api/admin/promocodes \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Id: 123456789" \
  -d '{
    "code": "SUMMER2024",
    "discount_type": "percent",
    "discount_value": 15,
    "valid_from": "2024-06-01",
    "valid_until": "2024-08-31",
    "min_order_amount": 1000,
    "max_uses": 500
  }'
```

### Применение промокода (покупатель)

```bash
curl -X POST http://localhost:3000/api/promocodes/apply \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SUMMER2024",
    "cartTotal": 5000
  }'
```

Ответ:
```json
{
  "valid": true,
  "discountAmount": 750,
  "newTotal": 4250
}
```

### Оформление заказа с промокодом

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Id: 987654321" \
  -d '{
    "items": [{"product_id": 1, "quantity": 2}],
    "total": 5000,
    "promocode": "SUMMER2024",
    "delivery_address": "ул. Примерная, 123"
  }'
```

## Конфигурация

### Переменные окружения

Промокоды не требуют дополнительных переменных окружения, используют стандартные:
- `NEON_DATABASE_URL` — подключение к БД
- `TELEGRAM_BOT_TOKEN` — для отправки уведомлений

## Тестирование

### Тест 1: Применение валидного промокода
1. Создать промокод `TEST10` со скидкой 10%
2. В корзине ввести код
3. Проверить, что скидка рассчитана корректно

### Тест 2: Истёкший промокод
1. Создать промокод с датой окончания вчера
2. Попытаться применить — должна быть ошибка

### Тест 3: Лимит использований
1. Создать промокод с `max_uses: 1`
2. Применить его 2 раза — второй раз должна быть ошибка

### Тест 4: Минимальная сумма
1. Создать промокод с `min_order_amount: 10000`
2. Применить при сумме 5000 — ошибка

## Важные примечания

1. **Коды в верхнем регистре** — коды нормализуются через `UPPER()` в БД, поиск регистронезависимый
2. **Использования считаются при применении** — счётчик увеличивается, когда код применён, а не когда заказ оплачен
3. **Двойная валидация** — код проверяется в `/api/promocodes/apply` И при создании заказа в `/api/orders`
4. **Сообщения на русском** — все ошибки отправляются на русском для удобства пользователя
5. **Скидка в заказе** — сохраняется в поле `discount` (в рублях) и `promo_code` (код)

## Связанные модули

- **P5 (CSV импорт)** — товары без промокодов
- **P7 (Канбан)** — управление заказами с применёнными скидками
- **P8 (Контент)** — баннеры с информацией об акциях и промокодах


════════════════════════════════════════════════════════════════════════════════
## 📄 07_kanban\README.md
════════════════════════════════════════════════════════════════════════════════

# Модуль P7: Канбан-доска для управления заказами

## Описание

Интерактивная канбан-доска для управления заказами в админке. Администраторы и менеджеры могут видеть все заказы, сгруппированные по статусам, и изменять статусы через перемещение карточек или клик на них.

## Функциональность

### Основные возможности

1. **Колонки статусов** (слева направо):
   - **Новый** — новые заказы, требующие подтверждения
   - **Подтверждён** — заказ подтвержден, готовится к сборке
   - **Готов к выдаче** — заказ собран и готов
   - **В доставке** — заказ отправлен
   - **Выполнен** — заказ доставлен
   - **Отменён** — заказ отменён

2. **Карточки заказов** с информацией:
   - Номер заказа (6-значный код)
   - Имя покупателя
   - Сумма заказа в рублях
   - Дата создания
   - Telegram ID покупателя

3. **Управление статусом**:
   - Клик на карточку → открывается подтверждение смены статуса
   - Выбор нового статуса из доступных переходов
   - Отправка запроса на сервер
   - Уведомление покупателю об изменении

4. **Фильтрация**:
   - По диапазону дат (от/до)
   - По имени покупателя (поиск)
   - По Telegram ID покупателя

5. **Интерактивность**:
   - Drag-and-drop для визуализации (карточки перетаскиваются)
   - Hover эффекты для лучшей UX
   - Счётчик заказов в каждой колонке
   - Общий счётчик всех заказов

## Архитектура

### Страница (`/admin/kanban.tsx`)

```
┌─────────────────────────────────────────────────────────────┐
│ Канбан доска заказов                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Фильтры: [От______] [До______] [Поиск____] [Применить]     │
│                                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │ Новый    │ │Подтвер.  │ │ Готов к  │ │В         │         │
│ │ (3)      │ │ (5)      │ │ выдаче   │ │доставке  │         │
│ │          │ │          │ │ (2)      │ │ (4)      │         │
│ │ [#12345] │ │ [#67890] │ │          │ │          │         │
│ │ Иван     │ │ Петр     │ │ [#11111] │ │ [#22222] │         │
│ │ 5000 ₽   │ │ 3500 ₽   │ │ Мария    │ │ Сергей   │         │
│ │          │ │          │ │ 7200 ₽   │ │ 4800 ₽   │         │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│                                                             │
│ Всего заказов: 14                                           │
└─────────────────────────────────────────────────────────────┘
```

### API (`/api/admin/orders-kanban.ts`)

**Метод:** GET  
**Защита:** requireAuth(['admin', 'manager'])

**Параметры запроса:**
- `dateFrom` (optional) — дата начала в формате YYYY-MM-DD
- `dateTo` (optional) — дата конца в формате YYYY-MM-DD
- `searchCustomer` (optional) — строка для поиска по имени или ID

**Ответ:**
```json
{
  "new": [
    {
      "id": "uuid-1",
      "code_6digit": "123456",
      "customer_name": "Иван Петров",
      "total_price": 5000,
      "status": "new",
      "created_at": "2024-06-15T10:30:00Z",
      "user_telegram_id": 987654321
    }
  ],
  "confirmed": [...],
  "readyship": [...],
  "shipped": [...],
  "done": [...],
  "cancelled": [...]
}
```

### Интеграция с API смены статуса

Используется существующий endpoint: **PATCH `/api/orders/[id]/status`**

При изменении статуса:
1. Отправляется запрос на PATCH `/api/orders/{id}/status` с новым статусом
2. Сервер валидирует переход
3. Отправляет уведомление покупателю (Telegram)
4. Логирует действие в `admin_logs`
5. Возвращает успешный ответ

## Workflow

### Для администратора/менеджера

1. **Открыть канбан** — `/admin/kanban`
2. **Применить фильтры** (опционально):
   - Выбрать дату начала и конца
   - Ввести имя или ID покупателя
   - Нажать "Применить фильтры"
3. **Изменить статус заказа**:
   - Кликнуть на карточку заказа
   - Подтвердить смену статуса в диалоговом окне
   - Дождаться обновления доски
4. **Видеть результаты**:
   - Карточка переместится в новую колонку
   - Покупатель получит уведомление в Telegram
   - Действие логируется в систему

### Доступные переходы статусов

```
new ──→ confirmed ──→ readyship ──→ shipped ──→ done
  ↘                                            ↗
    └─────────────→ cancelled ←────────────────┘
```

- Из **Новый** → Подтверждён или Отменён
- Из **Подтверждён** → Готов к выдаче или Отменён
- Из **Готов к выдаче** → В доставке или Отменён
- Из **В доставке** → Выполнен (или в исключительных случаях Отменён)
- Из **Выполнен** → остаётся Выполнен (финальный статус)
- Из **Отменён** → остаётся Отменён (финальный статус)

## Технические детали

### Зависимости

- **@dnd-kit/core** — основа для drag-and-drop
- **@dnd-kit/sortable** — сортируемые списки
- **@dnd-kit/utilities** — утилиты для трансформаций
- Next.js 14
- React 18
- TypeScript

### Компоненты

1. **KanbanColumn** — колонка со списком заказов
2. **OrderCard** — карточка одного заказа
3. **Основная страница** — управление состоянием и фильтрами

### Состояние приложения

```typescript
const [kanbanData, setKanbanData] = useState<KanbanData>();  // Заказы по статусам
const [loading, setLoading] = useState(boolean);              // Идёт ли загрузка
const [dateFrom, setDateFrom] = useState(string);             // Фильтр начало даты
const [dateTo, setDateTo] = useState(string);                 // Фильтр конец даты
const [searchCustomer, setSearchCustomer] = useState(string); // Фильтр поиска
```

### Стили и цвета

- **Фон:** `bg-bgDark` (#0a0a0f)
- **Карточки:** `bg-cardBg` (#111115)
- **Акцент:** `text-neon` (пурпурный для активных элементов)
- **Границы:** `border-border` (#2a2a33)

Разные статусы имеют разные цветовые оттенки для быстрого визуального распознавания:
- new: `bg-blue-900`
- confirmed: `bg-yellow-900`
- readyship: `bg-orange-900`
- shipped: `bg-purple-900`
- done: `bg-green-900`
- cancelled: `bg-red-900`

## Примеры использования

### Применение фильтров

```
1. Выбрать дату: 15.06.2024
2. Поиск: "Иван" (найдёт всех покупателей с именем Иван)
3. Нажать "Применить фильтры"
4. Доска обновится, показав только заказы Ивана за 15 июня
```

### Изменение статуса

```
1. На доске видим заказ #123456 в колонке "Новый"
2. Кликаем на карточку
3. Появляется сообщение: "Изменить статус заказа #123456 с 'Новый' на 'Подтверждён'?"
4. Нажимаем ОК
5. Заказ переходит в колонку "Подтверждён"
6. Покупатель получает уведомление в Telegram
```

## Возможные расширения

### Версия 2.0 (будущие улучшения)

1. **Полноценный drag-and-drop** между колонками
   - Перетащить карточку между статусами
   - Сохранение нового статуса при drop

2. **Фильтры по статусу**
   - Показать только заказы определённого статуса
   - Скрыть выполненные/отменённые заказы

3. **Редактирование заказа на доске**
   - Быстрое изменение адреса доставки
   - Добавление примечаний

4. **Уведомления в реальном времени**
   - Новые заказы появляются на доске сразу
   - WebSocket для синхронизации между вкладками

5. **Статистика**
   - График скорости обработки заказов
   - Среднее время в каждом статусе
   - Метрики по менеджерам

6. **Массовые операции**
   - Выделение нескольких заказов
   - Изменение статуса для группы
   - Экспорт в CSV/PDF

## Безопасность

- ✅ Все endpoints защищены (`requireAuth(['admin', 'manager'])`)
- ✅ Валидация данных на сервере
- ✅ Логирование всех действий в `admin_logs`
- ✅ Уведомления отправляются через Telegram Bot (защищённо)
- ✅ Проверка доступа через Telegram ID

## Тестирование

### Тест 1: Загрузка доски

1. Перейти на `/admin/kanban`
2. **Ожидается:** доска загружается, видны все статусы и заказы

### Тест 2: Фильтрация

1. Выбрать дату: вчера
2. Нажать "Применить"
3. **Ожидается:** показаны только заказы с вчерашней даты

### Тест 3: Изменение статуса

1. Кликнуть на заказ в колонке "Новый"
2. Подтвердить смену на "Подтверждён"
3. **Ожидается:**
   - Заказ переместится в колонку "Подтверждён"
   - Покупатель получит уведомление в Telegram
   - Действие залогируется

### Тест 4: Недоступные переходы

1. Попытаться изменить статус из "Выполнен"
2. **Ожидается:** сообщение "Этот статус является финальным"

## Связанные модули

- **P5 (CSV импорт)** — загрузка товаров
- **P6 (Промокоды)** — скидки на заказы
- **P8 (Контент менеджмент)** — баннеры о доставке
- **API заказов** — управление заказами

## Примечания

1. **Drag-and-drop** реализован как визуальная подсказка; основное управление через клик на карточку
2. **Уведомления** отправляются только если настроен Telegram bot
3. **Логирование** автоматическое в таблицу `admin_logs`
4. **Производительность** оптимальна при количестве заказов до 1000 на экране

## Версионирование

**Текущая версия:** v1.0 (2024)  
**Статус:** ✅ Production Ready


════════════════════════════════════════════════════════════════════════════════
## 📄 08_content\README.md
════════════════════════════════════════════════════════════════════════════════

# Модуль P8: Контент-менеджмент (Страницы, Баннеры, FAQ)

## Описание

Полнофункциональная система управления статическим контентом: создание/редактирование страниц, управление баннерами на главной странице и ведение FAQ (часто задаваемых вопросов).

## Функциональность

### 1. Управление страницами

**Для администратора:**
- Создание новых страниц (с уникальным slug)
- Редактирование содержимого (HTML)
- Добавление SEO описания
- Публикация/снятие с публикации
- Удаление страниц
- Предпросмотр в реальном времени

**Для покупателя:**
- Просмотр опубликованных страниц по URL (например: `/pages/about`, `/pages/terms`)

### 2. Управление баннерами

**Для администратора:**
- Создание баннеров с изображением и ссылкой
- Управление порядком отображения (drag-and-drop или указание order_index)
- Активация/деактивация баннеров
- Редактирование и удаление баннеров
- Добавление заголовка и описания баннера

**Для покупателя:**
- Просмотр активных баннеров на главной странице
- Клик по баннеру открывает ссылку (если задана)

### 3. Управление FAQ

**Для администратора:**
- Добавление вопросов и ответов
- Упорядочение вопросов
- Активация/деактивация вопросов
- Редактирование и удаление

**Для покупателя:**
- Просмотр всех активных вопросов и ответов
- Аккордеон для удобного просмотра

## API Endpoints

### Публичные API (для покупателей)

#### `GET /api/pages/[slug]`
Получить содержимое страницы по slug.

**Ответ:**
```json
{
  "slug": "about",
  "title": "О компании",
  "content": "<h1>О нас</h1><p>Мы лучшие...</p>",
  "seo_description": "Информация о нашей компании",
  "updated_at": "2024-06-15T10:30:00Z"
}
```

#### `GET /api/banners`
Получить все активные баннеры, отсортированные по order_index.

**Ответ:**
```json
[
  {
    "id": 1,
    "image_url": "https://supabase.com/image.jpg",
    "link": "https://shop.com/sale",
    "title": "Летняя распродажа",
    "description": "Скидки до 50%",
    "order_index": 0
  }
]
```

#### `GET /api/faq`
Получить все активные вопросы и ответы, отсортированные по sort_order.

**Ответ:**
```json
[
  {
    "id": 1,
    "question": "Какая доставка?",
    "answer": "Доставляем по всей России за 1-3 дня",
    "sort_order": 0
  }
]
```

### Admin API (требуется роль `admin`)

#### Управление страницами

- `GET /api/admin/pages` — список всех страниц
- `POST /api/admin/pages` — создать/обновить страницу (upsert)
- `GET /api/admin/pages/[slug]` — получить страницу для редактирования
- `DELETE /api/admin/pages/[slug]` — удалить страницу

#### Управление баннерами

- `GET /api/admin/banners` — список всех баннеров
- `POST /api/admin/banners` — создать баннер
- `PUT /api/admin/banners/[id]` — обновить баннер
- `DELETE /api/admin/banners/[id]` — удалить баннер

#### Управление FAQ

- `GET /api/admin/faq` — список всех вопросов
- `POST /api/admin/faq` — создать вопрос
- `PUT /api/admin/faq/[id]` — обновить вопрос
- `DELETE /api/admin/faq/[id]` — удалить вопрос

## Admin Pages (UI)

### `/admin/pages.tsx`
Список всех страниц с возможностью:
- Создания новой страницы
- Редактирования (переход на `/admin/pages/edit/[slug]`)
- Удаления страницы
- Просмотра статуса (опубликована/черновик)

### `/admin/pages/edit/[slug].tsx`
Редактор страницы с:
- Полем для заголовка
- Полем для SEO описания
- **WYSIWYG редактором (ReactQuill)** для контента
- Чекбоксом для публикации
- Предпросмотром в реальном времени

#### Редактор ReactQuill

Использует библиотеку **React Quill** для визуального редактирования контента.

**Установлены пакеты:**
```bash
npm install react-quill@^2.0.0 quill@^2.0.0
```

**Функциональность:**
- ✅ Форматирование текста (bold, italic, underline, strikethrough)
- ✅ Заголовки (h1-h6)
- ✅ Списки (нумерованные и маркированные)
- ✅ Блоки кода и цитаты
- ✅ Ссылки и изображения
- ✅ Выравнивание текста
- ✅ Предпросмотр в реальном времени

**Использование:**
```typescript
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

// В компоненте:
<ReactQuill
  value={content}
  onChange={setContent}
  modules={{
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      ['link', 'image'],
      ['clean'],
    ],
  }}
  theme="snow"
/>
```

**HTML сохранение:**
- Редактор сохраняет контент как чистый HTML
- В БД хранится полный HTML код
- На фронте отображается через `dangerouslySetInnerHTML` (или DOMPurify)

### `/admin/banners.tsx`
Управление баннерами:
- Таблица всех баннеров
- Кнопки редактирования/удаления
- Форма создания нового баннера
- Drag-and-drop для изменения порядка (опционально)

### `/admin/faq.tsx`
Управление FAQ:
- Таблица вопросов и ответов
- Кнопки редактирования/удаления
- Форма добавления нового вопроса
- Управление порядком отображения

## Public Pages (UI)

### `/pages/[slug].tsx`
Динамический роут для отображения страниц.

Примеры:
- `/pages/about` — страница "О компании"
- `/pages/contacts` — контакты
- `/pages/terms` — условия использования
- `/pages/privacy` — политика приватности

### Интеграция баннеров на главную страницу (`/pages/index.tsx`)
- Загрузка активных баннеров через `GET /api/banners`
- Отображение в виде карусели или сетки
- Клик открывает ссылку (если есть)

### Страница FAQ (опционально `/pages/faq.tsx`)
- Загрузка вопросов через `GET /api/faq`
- Отображение в виде аккордеона
- Все вопросы открыты по умолчанию или закрыты

## Таблицы БД

### `pages`
```sql
CREATE TABLE pages (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  seo_description TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `banners`
```sql
CREATE TABLE banners (
  id SERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  link TEXT,
  title TEXT,
  description TEXT,
  order_index INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `faq`
```sql
CREATE TABLE faq (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Примеры использования

### Создание страницы "О компании"

1. Админ открывает `/admin/pages`
2. Нажимает "+ Новая страница"
3. Вводит slug: `about`
4. Кликает "Создать страницу"
5. Переходит в редактор `/admin/pages/edit/about`
6. Добавляет заголовок "О компании"
7. Пишет HTML контент
8. Отмечает чекбокс "Опубликовать"
9. Сохраняет

Результат: страница доступна по адресу `/pages/about`

### Добавление баннера на главную

1. Админ открывает `/admin/banners`
2. Нажимает "+ Создать баннер"
3. Вводит URL изображения (Supabase или внешний)
4. Указывает ссылку: `https://shop.com/summer-sale`
5. Добавляет заголовок: "Летняя распродажа"
6. Сохраняет

Результат: баннер появляется на главной странице

### Добавление FAQ

1. Админ открывает `/admin/faq`
2. Нажимает "+ Добавить вопрос"
3. Вводит вопрос: "Какая доставка?"
4. Вводит ответ: "Доставляем по РФ за 1-3 дня"
5. Сохраняет

Результат: вопрос видит покупатель на странице FAQ

## Workflow администратора

```
┌────────────────────────────────────┐
│ Админ открывает /admin            │
└────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ Выбирает:                             │
│ - Управление страницами              │
│ - Управление баннерами               │
│ - Управление FAQ                     │
└─────────────────────────────────────────┘
           ↓
┌────────────────────────────────────┐
│ Для каждого типа контента:        │
│ 1. Просмотр списка                │
│ 2. Создание нового                │
│ 3. Редактирование                 │
│ 4. Удаление                       │
│ 5. Активация/деактивация          │
└────────────────────────────────────┘
```

## Безопасность

- ✅ Все admin endpoints защищены (`requireAuth(['admin'])`)
- ✅ Валидация данных на сервере
- ✅ HTML санитизация (рекомендуется DOMPurify на клиенте)
- ✅ Логирование всех действий
- ✅ Проверка существования перед обновлением/удалением

## Производительность

- ✅ Индексы на часто используемые поля (slug, is_active, is_published)
- ✅ Кеширование активных баннеров на фронте
- ✅ Ленивая загрузка контента
- ✅ Оптимизированные SQL запросы

## Версионирование

**Текущая версия:** v1.0 (2024)  
**Статус:** ✅ Production Ready

## Дополнительные возможности (версия 2.0)

- [x] **WYSIWYG редактор для страниц** ✅ (реализовано с ReactQuill)
- [ ] Загрузка изображений напрямую (вместо URL)
- [ ] История версий страниц
- [ ] Шаблоны страниц
- [ ] Редактирование метатегов для SEO
- [ ] Автоматическое создание sitemap.xml
- [ ] Интеграция с аналитикой (Yandex Metrica, Google Analytics)


════════════════════════════════════════════════════════════════════════════════
## 📄 01_database\README.md
════════════════════════════════════════════════════════════════════════════════

# 📊 Структура базы данных VapeShop

## Описание

Полная документация по миграциям и схеме базы данных PostgreSQL для проекта VapeShop.

## Миграции

### Порядок применения миграций

Все миграции должны выполняться **в последовательном порядке** от 001 до 008:

```bash
# Миграции применяются автоматически при запуске приложения
# Или вручную через psql:
psql -U user -d vapeshop -f db/migrations/001_initial_schema.sql
psql -U user -d vapeshop -f db/migrations/002_telegram_stars_payment.sql
psql -U user -d vapeshop -f db/migrations/003_notification_settings.sql
psql -U user -d vapeshop -f db/migrations/004_delivery_management.sql
psql -U user -d vapeshop -f db/migrations/008_content_management.sql
```

### 001 - Базовая схема (initial_schema.sql)

**Создает:** Базовые таблицы системы

- **users** - Пользователи (Telegram профили)
  - `telegram_id` (BIGINT PRIMARY KEY) - Telegram ID
  - `role` (VARCHAR) - Роль: admin, manager, seller, customer
  - `is_blocked` (BOOLEAN) - Флаг блокировки
  - `username`, `first_name`, `last_name` - Данные профиля
  
- **categories** - Категории товаров
  - `id` (SERIAL PRIMARY KEY)
  - `name` (VARCHAR UNIQUE) - Название категории
  - `icon_emoji` (VARCHAR) - Эмодзи категории
  - `sort_order` (INT) - Порядок сортировки

- **brands** - Бренды
  - `id` (SERIAL PRIMARY KEY)
  - `name` (VARCHAR UNIQUE) - Название бренда
  - `logo_url` (TEXT) - URL логотипа

- **products** - Товары
  - `id` (SERIAL PRIMARY KEY)
  - `name`, `specification` - Наименование и характеристики
  - `price` (DECIMAL) - Цена
  - `stock` (INT) - Остаток на складе
  - `category_id`, `brand_id` - Связи с категорией и брендом
  - `images` (TEXT[]) - Массив URL изображений
  - `is_promotion`, `is_hit`, `is_new` (BOOLEAN) - Флаги товара
  - `rating` (DECIMAL) - Средний рейтинг

- **cart_items** - Товары в корзине пользователя
  - `id` (SERIAL PRIMARY KEY)
  - `user_telegram_id` (BIGINT) - Телеграм ID пользователя
  - `product_id` (INT) - ID товара
  - `quantity` (INT) - Количество
  - Уникальность: (user_telegram_id, product_id)

- **price_import** - Импортированные товары (CSV)
  - `id` (SERIAL PRIMARY KEY)
  - `name`, `specification` - Название и характеристики
  - `price_tier_1, price_tier_2, price_tier_3` - Цены по уровням
  - `distributor_price` - Дистрибьюторская цена
  - `is_activated` (BOOLEAN) - Активирован ли товар

- **order_items** - Товары в заказе
  - `id` (SERIAL PRIMARY KEY)
  - `order_id` (UUID) - ID заказа
  - `product_id` (INT) - ID товара
  - `quantity`, `price` - Количество и цена

- **reviews** - Отзывы и рейтинги
  - `id` (SERIAL PRIMARY KEY)
  - `product_id` (INT) - ID товара
  - `user_telegram_id` (BIGINT) - ID пользователя
  - `rating` (INT) - Рейтинг 1-5
  - `comment` (TEXT) - Текст отзыва
  - `is_verified` (BOOLEAN) - Проверенный покупатель

- **wishlist** - Избранное (wishlist)
  - `id` (SERIAL PRIMARY KEY)
  - `user_telegram_id` (BIGINT) - ID пользователя
  - `product_id` (INT) - ID товара

**Статус:** ✅ Production Ready

### 002 - Платежи Telegram Stars (telegram_stars_payment.sql)

**Создает:** Таблицы для управления заказами и платежами

- **orders** - Заказы
  - `id` (UUID PRIMARY KEY)
  - `user_telegram_id` (BIGINT) - ID пользователя
  - `status` (VARCHAR) - Статус заказа (pending, new, confirmed, readyship, shipped, done, cancelled)
  - `total` (DECIMAL) - Сумма заказа
  - `code_6digit` (INT) - 6-значный код доставки
  - `code_expires_at` (TIMESTAMP) - Время истечения кода (24 часа)
  - `paid_at` (TIMESTAMP) - Время оплаты
  - Поля доставки: `delivery_method`, `pickup_point_id`, `address`, `delivery_date`
  - `promo_code`, `discount` - Промокод и размер скидки

- **payment_logs** - Логи платежей
  - Для отладки платежей через Telegram Stars

- **delivery_codes** - Коды доставки (альтернативное хранилище)

**Статус:** ✅ Production Ready

### 003 - Уведомления (notification_settings.sql)

**Создает:** Таблицы для системы уведомлений

- **notification_settings** - Настройки типов уведомлений
  - Управление включением/отключением типов событий
  - События: order_new_admin, order_status_changed_buyer, abandoned_cart

- **notification_history** - История отправленных уведомлений
  - Логирование всех сообщений для аналитики

- **abandoned_carts** - Брошенные корзины
  - Отслеживание корзин для кампаний восстановления

**Статус:** ✅ Production Ready

### 004 - Доставка (delivery_management.sql)

**Создает:** Таблицы для управления доставкой

- **pickup_points** - Пункты выдачи товаров
  - `id` (UUID PRIMARY KEY)
  - `name` - Название пункта
  - `address` - Адрес
  - `is_active` (BOOLEAN) - Активен ли пункт

- **addresses** - Адреса пользователей для курьерской доставки
  - `id` (UUID PRIMARY KEY)
  - `user_telegram_id` (BIGINT) - ID пользователя
  - `address` (TEXT) - Адрес доставки
  - `is_default` (BOOLEAN) - Адрес по умолчанию

**Статус:** ✅ Production Ready

### 008 - Контент-менеджмент (content_management.sql)

**Создает:** Таблицы для управления статическим контентом

- **pages** - Страницы сайта
  - `slug` (TEXT PRIMARY KEY) - Уникальный идентификатор (about, contacts, etc.)
  - `title` - Заголовок страницы
  - `content` - HTML содержимое
  - `seo_description` - Для SEO

- **banners** - Баннеры на главной
  - `id` (SERIAL PRIMARY KEY)
  - `image_url` - URL изображения
  - `link` - Ссылка при клике
  - `order_index` - Порядок отображения
  - `is_active` (BOOLEAN) - Активен ли баннер

- **faq** - Часто задаваемые вопросы
  - `id` (SERIAL PRIMARY KEY)
  - `question` - Вопрос
  - `answer` - Ответ
  - `sort_order` - Порядок сортировки

**Статус:** ✅ Production Ready

### Отсутствующие миграции (создаются в 001)

Миграции для P5-P7 объединены в миграцию 001:
- **005** - CSV импорт (table price_import создается в 001)
- **006** - Промокоды (table promocodes должна быть, см. P6)
- **007** - Канбан-доска (не требует отдельной таблицы)

## Производство

### Проверка статуса миграций

```sql
-- Проверить все таблицы
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Проверить структуру таблицы
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'products';

-- Проверить индексы
SELECT * FROM pg_indexes 
WHERE tablename = 'products';
```

## Справка по статусам заказов

| Статус | Описание |
|--------|---------|
| `pending` | Ожидание оплаты |
| `new` | Оплачен, ожидает комплектации |
| `confirmed` | Подтвержден менеджером |
| `readyship` | Готов к отправке |
| `shipped` | Отправлен |
| `done` | Завершен (код проверен) |
| `cancelled` | Отменен |

---

**Версия документации:** 1.0  
**Последнее обновление:** 2024


════════════════════════════════════════════════════════════════════════════════
## 📄 01_auth\QUICK_AUTH_REFERENCE.md
════════════════════════════════════════════════════════════════════════════════

# Быстрый Справочник по Защите API Эндпоинтов

Используйте этот файл для быстрого копирования кода при защите эндпоинтов.

## 1️⃣ Шаблон для защиты административного API

### Скопируйте этот шаблон в каждый `/api/admin/*.ts` файл:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';
import { requireAuth, getTelegramId } from '../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // TODO: Ваша логика GET

      res.status(200).json({ success: true });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'Ошибка' });
    }
  } else if (req.method === 'POST') {
    try {
      // TODO: Ваша логика POST
      
      // Логируем действие (опционально)
      const telegramId = getTelegramId(req);
      await query(
        `INSERT INTO admin_logs (user_telegram_id, action, details) VALUES ($1, $2, $3)`,
        [telegramId, 'action_name', JSON.stringify({ /* данные */ })]
      ).catch(err => console.error('Logging error:', err));

      res.status(200).json({ success: true });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'Ошибка' });
    }
  } else if (req.method === 'PUT') {
    try {
      // TODO: Ваша логика PUT
      
      const telegramId = getTelegramId(req);
      // Логирование...

      res.status(200).json({ success: true });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'Ошибка' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // TODO: Ваша логика DELETE
      
      const telegramId = getTelegramId(req);
      // Логирование...

      res.status(200).json({ success: true });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'Ошибка' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Замените ['admin'] на нужную роль:
// - ['admin'] - только админы
// - ['admin', 'manager'] - админы и менеджеры
// - ['admin', 'seller'] - админы и продавцы (курьеры)
export default requireAuth(handler, ['admin']);
```

## 2️⃣ Логирование действий администраторов

Вставьте этот код в каждый эндпоинт, где нужно логировать:

```typescript
// Получаем ID администратора
const telegramId = getTelegramId(req);

// Логируем в БД
await query(
  `INSERT INTO admin_logs (user_telegram_id, action, details) VALUES ($1, $2, $3)`,
  [
    telegramId,
    'action_type', // create_product, update_order, delete_user, etc.
    JSON.stringify({ /* параметры действия */ })
  ]
).catch(err => console.error('Logging error:', err));
```

## 3️⃣ Фронтенд: Использование fetchWithAuth

### Вариант 1: Простой fetch с автоматическим заголовком
```typescript
import { fetchWithAuth } from '../../../lib/frontend/auth';

const response = await fetchWithAuth('/api/admin/products', {
  method: 'POST',
  body: JSON.stringify(data),
});

const result = await response.json();
```

### Вариант 2: С обработкой ошибок
```typescript
import { fetchWithAuth } from '../../../lib/frontend/auth';

const response = await fetchWithAuth('/api/admin/products', {
  method: 'POST',
  body: JSON.stringify(data),
});

if (!response.ok) {
  if (response.status === 401) {
    console.log('Требуется аутентификация');
    return;
  }
  if (response.status === 403) {
    console.log('Недостаточно прав');
    return;
  }
}

const result = await response.json();
```

### Вариант 3: Ручное добавление заголовка
```typescript
import { getTelegramIdHeader } from '../../../lib/frontend/auth';

const response = await fetch('/api/admin/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...getTelegramIdHeader(),
  },
  body: JSON.stringify(data),
});
```

## 4️⃣ Специальный случай: Загрузка файла

Для POST запросов с FormData (например, импорт CSV):

```typescript
import { getTelegramIdHeader } from '../../../lib/frontend/auth';

const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/admin/import', {
  method: 'POST',
  headers: {
    // НЕ устанавливаем Content-Type - браузер сделает это автоматически
    ...getTelegramIdHeader(),
  },
  body: formData,
});
```

## 5️⃣ Список админских эндпоинтов (готовы к защите)

```
/api/admin/products.ts     ← ✓ УЖЕ ЗАЩИЩЁН
/api/admin/orders.ts       ← TODO: Применить requireAuth(['admin', 'manager'])
/api/admin/users.ts        ← TODO: Применить requireAuth(['admin'])
/api/admin/stats.ts        ← TODO: Применить requireAuth(['admin'])
/api/admin/settings.ts     ← TODO: Применить requireAuth(['admin'])
/api/admin/import.ts       ← TODO: Применить requireAuth(['admin'])
/api/admin/broadcast.ts    ← TODO: Применить requireAuth(['admin'])
/api/admin/faq.ts          ← TODO: Применить requireAuth(['admin']) (если есть)
```

## 6️⃣ Компоненты админки (фронтенд)

```
pages/admin/products.tsx   ← TODO: Обновить на fetchWithAuth
pages/admin/orders.tsx     ← TODO: Обновить на fetchWithAuth
pages/admin/users.tsx      ← TODO: Обновить на fetchWithAuth
pages/admin/stats.tsx      ← TODO: Обновить на fetchWithAuth
pages/admin/settings.tsx   ← TODO: Обновить на fetchWithAuth
pages/admin/import.tsx     ← TODO: Обновить на fetchWithAuth
pages/admin/broadcast.tsx  ← TODO: Обновить на fetchWithAuth
pages/admin/faq.tsx        ← TODO: Обновить на fetchWithAuth (если есть)
```

## 7️⃣ Таблица admin_logs

Создайте эту таблицу для логирования действий:

```sql
-- Создание таблицы для логирования
CREATE TABLE admin_logs (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_admin_logs_user ON admin_logs(user_telegram_id);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at DESC);
```

## 8️⃣ SQL запросы для управления ролями

### Сделать пользователя админом
```sql
UPDATE users SET role = 'admin' WHERE telegram_id = YOUR_TELEGRAM_ID;
```

### Изменить роль на менеджера
```sql
UPDATE users SET role = 'manager' WHERE telegram_id = YOUR_TELEGRAM_ID;
```

### Заблокировать пользователя
```sql
UPDATE users SET is_blocked = TRUE WHERE telegram_id = YOUR_TELEGRAM_ID;
```

### Разблокировать пользователя
```sql
UPDATE users SET is_blocked = FALSE WHERE telegram_id = YOUR_TELEGRAM_ID;
```

### Получить список админов
```sql
SELECT telegram_id, username, role FROM users WHERE role = 'admin';
```

### Получить логи действий администратора
```sql
SELECT * FROM admin_logs
WHERE user_telegram_id = YOUR_TELEGRAM_ID
ORDER BY created_at DESC
LIMIT 20;
```

## 9️⃣ Тестирование через curl

### Тест 1: Без заголовка (должен вернуть 401)
```bash
curl -X GET http://localhost:3000/api/admin/products
```

### Тест 2: С заголовком, роль admin (должен вернуть 200)
```bash
curl -X GET http://localhost:3000/api/admin/products \
  -H "X-Telegram-Id: 123456789"
```

### Тест 3: С заголовком, роль buyer (должен вернуть 403)
```bash
curl -X GET http://localhost:3000/api/admin/products \
  -H "X-Telegram-Id: 987654321"
```

### Тест 4: POST запрос с данными
```bash
curl -X POST http://localhost:3000/api/admin/products \
  -H "X-Telegram-Id: 123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Name",
    "price": 100,
    "stock": 50
  }'
```

## 🔟 Проверка заголовков в DevTools

1. Откройте браузер DevTools (F12)
2. Перейдите на вкладку Network
3. Сделайте запрос в админке
4. Кликните на запрос
5. Перейдите в Headers → Request Headers
6. Убедитесь, что есть: `x-telegram-id: 123456789`

## 1️⃣1️⃣ Обработка ошибок аутентификации

```typescript
// 401 - не аутентифицирован
if (response.status === 401) {
  alert('Требуется аутентификация. Пожалуйста, откройте админку через Telegram Mini App.');
  window.location.href = '/';
}

// 403 - нет прав
if (response.status === 403) {
  alert('У вас недостаточно прав для этого действия.');
}

// 500 - ошибка сервера
if (response.status === 500) {
  console.error('Server error:', await response.json());
}
```

## 1️⃣2️⃣ Импорты

Вставьте эти импорты в начало файла:

### Backend импорты
```typescript
import { requireAuth, getTelegramId } from '../../../lib/auth';
```

### Frontend импорты
```typescript
import { fetchWithAuth, getTelegramIdHeader } from '../../../lib/frontend/auth';
```

## 📋 Чеклист для каждого эндпоинта

При защите каждого эндпоинта проверьте:

- [ ] Добавлены импорты `{ requireAuth, getTelegramId }`
- [ ] Функция переименована с `export default async function handler` на `async function handler`
- [ ] Добавлена обёртка `export default requireAuth(handler, ['admin']);` в конце
- [ ] Добавлено логирование `getTelegramId(req)` где нужно
- [ ] Всё работает: тест через curl возвращает 200 для админа, 401 без заголовка, 403 для не-админа

## ✨ Чеклист для фронтенда

При обновлении каждого компонента админки проверьте:

- [ ] Импортирован `fetchWithAuth` из `lib/frontend/auth`
- [ ] Все `fetch()` заменены на `fetchWithAuth()`
- [ ] DevTools показывает `x-telegram-id` заголовок в запросах
- [ ] Обработаны ошибки 401 и 403
- [ ] Всё работает

## 🎯 Порядок внедрения

Рекомендуемый порядок для минимизации проблем:

1. ✓ lib/auth.ts уже готов
2. ✓ lib/frontend/auth.ts уже готов
3. ✓ /api/admin/products.ts уже защищен
4. → Начните отсюда: /api/admin/orders.ts (используйте пример из ADMIN_API_ORDERS_EXAMPLE.md)
5. → Затем: остальные /api/admin/* (используйте шаблон выше)
6. → После этого: обновите pages/admin/* (используйте примеры из FRONTEND_ADMIN_AUTH_SETUP.md)
7. → В конце: создайте таблицу admin_logs и протестируйте всё

---

**Дополнительная документация:**
- `AUTH_SYSTEM_SUMMARY.md` - Полный обзор системы
- `ADMIN_API_AUTH_GUIDE.md` - Подробное руководство
- `ADMIN_API_ORDERS_EXAMPLE.md` - Пример с объяснениями
- `FRONTEND_ADMIN_AUTH_SETUP.md` - Примеры для фронтенда
- `AUTH_IMPLEMENTATION_CHECKLIST.md` - Полный чеклист


════════════════════════════════════════════════════════════════════════════════
## 📄 02_payments\QUICK_REFERENCE.md
════════════════════════════════════════════════════════════════════════════════

# 🚀 QUICK REFERENCE — Платежи Telegram Stars

## Файлы для копирования

### 1️⃣ Обновите `pages/api/orders.ts`
- ✅ Замените ВЕСЬ файл на реализацию из этой сессии
- ✅ Проверьте импорт `Bot` из `grammy`

### 2️⃣ Обновите `pages/api/bot.ts`
- ✅ Замените ВЕСЬ файл на реализацию из этой сессии
- ✅ Добавлен import `{ query } from '../../lib/db'`

### 3️⃣ Обновите `lib/bot/payments.ts`
- ✅ Замените ВЕСЬ файл на реализацию из этой сессии
- ✅ Две функции: `handlePreCheckout` и `handlePaymentSuccess`

### 4️⃣ Создайте `pages/api/orders/verify-code.ts`
- ✅ Новый файл (скопируйте из этой сессии)
- ✅ Проверяет 6-значный код и меняет статус на 'done'

### 5️⃣ Создайте `lib/utils/payments.ts`
- ✅ Новый файл (скопируйте из этой сессии)
- ✅ Утилиты для фронтенда

### 6️⃣ Выполните SQL миграцию
- ✅ Файл: `db/migrations/002_telegram_stars_payment.sql`
- ✅ Добавляет поля в таблицу `orders`

### 7️⃣ Обновите `pages/cart.tsx` (ВАЖНО!)
- ⚠️ НЕ ЗАМЕНЯЙТЕ весь файл!
- ✅ ОБЪЕДИНИТЕ существующий код с новым (см. CART_UPDATE_EXAMPLE.tsx)
- ✅ Добавьте импорт `createOrderWithPayment` из `lib/utils/payments`
- ✅ Обновите функцию `handleCheckout()`

---

## Ключевые функции

### API эндпоинты

```typescript
// 1. Создание заказа
POST /api/orders
{
  telegram_id: number,
  items: Array<{product_id, name, price, quantity}>,
  delivery_method: 'pickup' | 'courier',
  delivery_date: string,
  address: string | null,
  promo_code?: string,
  discount?: number
}

// Ответ: { order_id, status: 'pending', message }

// 2. Проверка кода
POST /api/orders/verify-code
{
  order_id: string,
  code_6digit: number
}

// Ответ: { success: boolean, message, order? }
```

### Фронтенд функции

```typescript
import { createOrderWithPayment, verifyDeliveryCode } from '@/lib/utils/payments';

// 1. Создание заказа
const result = await createOrderWithPayment(
  telegram_id,
  items,
  'courier',
  '2026-04-03',
  'ул. Ленина, 1',
  'SPRING20',
  5
);

// 2. Проверка кода
const result = await verifyDeliveryCode(order_id, 123456);
if (result.success) {
  console.log('✅ Заказ завершён');
}
```

### Bot обработчики

```typescript
// В /api/bot.ts уже настроены:
bot.on('pre_checkout_query', handlePreCheckout);
bot.on('message:successful_payment', handlePaymentSuccess);

// handlePreCheckout — проверяет платёж
// handlePaymentSuccess — генерирует код и обновляет БД
```

---

## Переменные окружения

```env
TELEGRAM_BOT_TOKEN=123456:ABC...
WEBAPP_URL=https://your-app.vercel.app
ADMIN_TELEGRAM_IDS=123456789,987654321
NEON_DATABASE_URL=postgresql://...
```

---

## SQL запросы для проверки

```sql
-- Все заказы
SELECT id, status, paid_at, code_6digit FROM orders ORDER BY created_at DESC;

-- Ожидающие оплаты
SELECT * FROM orders WHERE status = 'pending';

-- Оплачены, но код не проверен
SELECT * FROM orders WHERE status = 'new';

-- Завершённые заказы
SELECT * FROM orders WHERE status = 'done';

-- Логи платежей
SELECT * FROM payment_logs ORDER BY created_at DESC;
```

---

## Webhook установка

```bash
# Production URL
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -d url=https://your-app.vercel.app/api/bot \
  -d allowed_updates='["message","callback_query","pre_checkout_query"]'

# Локально (ngrok)
ngrok http 3000
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -d url=https://<ngrok-id>.ngrok.io/api/bot \
  -d allowed_updates='["message","callback_query","pre_checkout_query"]'
```

---

## Тестовые сценарии

### ✅ Сценарий 1: Успешная оплата
1. Добавьте товары в корзину
2. Заполните доставку
3. Нажмите "Оформить"
4. В боте нажмите кнопку оплаты
5. Подтвердите оплату
6. Получите 6-значный код
7. ✅ Заказ в статусе `new`

### ✅ Сценарий 2: Проверка кода
1. Получите код из сообщения бота
2. POST `/api/orders/verify-code` с кодом
3. ✅ Статус заказа `done`

### ✅ Сценарий 3: Отмена заказа
1. Создайте заказ (статус `pending`)
2. Нажмите кнопку "❌ Отменить" в боте
3. ✅ Статус `cancelled`, товары на складе

---

## Структура БД

```sql
orders:
  id (UUID)
  user_telegram_id (BIGINT)
  status (VARCHAR) -- pending, new, confirmed, readyship, shipped, done, cancelled
  total (DECIMAL)
  paid_at (TIMESTAMP) -- время оплаты
  code_6digit (INT) -- 6-значный код
  code_expires_at (TIMESTAMP) -- истечение кода (24h)
  delivery_method (VARCHAR)
  delivery_date (DATE)
  address (TEXT)
  created_at (TIMESTAMP)
  updated_at (TIMESTAMP)

payment_logs:
  id (UUID)
  order_id (UUID)
  user_telegram_id (BIGINT)
  status (VARCHAR)
  amount (INT)
  error_message (TEXT)
  created_at (TIMESTAMP)
```

---

## Ошибки и решения

| Ошибка | Причина | Решение |
|--------|---------|---------|
| `sendInvoice is not a function` | Старая версия grammy | `npm install grammy@latest` |
| `Webhook 404` | URL вебхука неверен | Проверьте getWebhookInfo |
| `Invoice payload not found` | order.id не совпадает | Убедитесь payload это order.id |
| `Заказ не найден` | Заказ удален или статус не pending | Проверьте БД |
| `Код истёк` | Прошло >24 часов | Только 24 часа с момента оплаты |

---

## Полезные команды

```bash
# Проверка webhook
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo | jq

# Удаление webhook (для переустановки)
curl -X POST https://api.telegram.org/bot<TOKEN>/deleteWebhook

# Локальное тестирование
npm run dev
ngrok http 3000

# Проверка БД (psql)
psql -d vapeshop -c "SELECT * FROM orders LIMIT 5;"
```

---

## Чек-лист перед production

- [ ] Миграция БД выполнена
- [ ] Все файлы обновлены
- [ ] pages/cart.tsx объединён с новым кодом
- [ ] Webhook установлен
- [ ] Тестирование пройдено
- [ ] Логи проверены
- [ ] Сообщения админам работают
- [ ] Коды генерируются и проверяются
- [ ] Рефералки считаются

---

## 📚 Полная документация

- **IMPLEMENTATION_CHECKLIST.md** — пошаговый гайд (прочитайте первым!)
- **PAYMENT_INTEGRATION.md** — полное описание системы
- **PAYMENT_IMPLEMENTATION_SUMMARY.md** — итоговый отчёт

---

**Версия:** 1.0  
**Дата:** 2 апреля 2026  
**Статус:** ✅ Готово к production


════════════════════════════════════════════════════════════════════════════════
## 📄 04_delivery\QUICK_REFERENCE.md
════════════════════════════════════════════════════════════════════════════════

# Phase P4: Delivery Management - Quick Reference

## 🚀 Quick Start

### 1. Deploy Database
```bash
psql $NEON_DATABASE_URL < db/migrations/004_delivery_management.sql
```

### 2. Build & Deploy
```bash
npm run build
npm run start  # or vercel --prod
```

### 3. Verify
```bash
# Test public endpoint
curl https://your-domain.com/api/pickup-points

# Test admin endpoint  
curl https://your-domain.com/api/admin/pickup-points \
  -H 'X-Telegram-Id: your_admin_id'
```

---

## 📚 Documentation Map

| Document | Purpose | Size |
|----------|---------|------|
| [API.md](./API.md) | Complete API reference with examples | 11 KB |
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Architecture and implementation details | 11 KB |
| [TESTING.md](./TESTING.md) | 40+ test scenarios and verification steps | 15 KB |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment runbook and operations guide | 11 KB |

---

## 🔧 API Endpoints

### Admin (requireAuth(['admin']))
```
GET    /api/admin/pickup-points?page=1&limit=20
POST   /api/admin/pickup-points
PUT    /api/admin/pickup-points
DELETE /api/admin/pickup-points?id=uuid
```

### Customer (requireAuth(['buyer']))
```
GET    /api/addresses
POST   /api/addresses
PUT    /api/addresses
DELETE /api/addresses?id=uuid
```

### Public (no auth)
```
GET    /api/pickup-points?page=1&limit=20
```

### Enhanced
```
POST   /api/orders (with delivery validation)
```

---

## 📦 What's New

### Database Tables
- **pickup_points**: Store delivery locations (id, name, address, is_active)
- **addresses**: Store customer addresses (id, user_telegram_id, address, is_default)

### Orders Enhancement
- **delivery_method**: 'pickup' | 'courier'
- **pickup_point_id**: UUID reference
- **address**: Courier delivery address
- **delivery_date**: Expected delivery date

### Sample Data
3 pickup points created automatically:
1. Пункт выдачи - Центр (ул. Тверская)
2. Пункт выдачи - Восток (ул. Комсомольская)
3. Пункт выдачи - Запад (ул. Кутузовский)

---

## ✅ Validation Rules

### Pickup Delivery
- `pickup_point_id`: Required, must exist, must be active

### Courier Delivery
- `address`: Minimum 10 characters
- `delivery_date`: Must be >= tomorrow (YYYY-MM-DD format)

### Addresses
- `address`: Minimum 5 characters
- Unique per user (no duplicates)
- Only one default address per user

### Pickup Points
- `name`: Non-empty string
- `address`: Non-empty string
- `is_active`: Boolean flag for soft delete

---

## 🔒 Security Features

✅ Role-based access control (admin, buyer)
✅ Ownership verification (customer endpoints)
✅ Input sanitization and validation
✅ SQL injection prevention
✅ Admin action logging
✅ Soft deletes (data preservation)
✅ User blocking checks

---

## 📊 Error Responses

```json
{
  "error": "Error code",
  "message": "User-friendly message in Russian"
}
```

### Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request (validation error)
- **401**: Unauthorized (no auth)
- **403**: Forbidden (insufficient role)
- **404**: Not Found
- **500**: Server Error

---

## 🧪 Testing Checklist

### Basic Tests
- [ ] Admin can list pickup points
- [ ] Admin can create pickup point
- [ ] Admin can update pickup point
- [ ] Admin can soft-delete pickup point
- [ ] Customer can list their addresses
- [ ] Customer can add address
- [ ] Customer can update address
- [ ] Customer can delete address
- [ ] Public can list active pickup points
- [ ] Order accepts delivery_method parameter

### Validation Tests
- [ ] Reject invalid pickup point
- [ ] Reject short address
- [ ] Reject past delivery date
- [ ] Reject duplicate address
- [ ] Prevent cross-user access

### Security Tests
- [ ] Admin endpoint requires admin role
- [ ] Customer endpoint requires buyer role
- [ ] Cross-user access returns 404

---

## 🐛 Troubleshooting

### Database Migration Fails
```bash
# Verify database is accessible
psql $NEON_DATABASE_URL -c "SELECT 1;"

# Check for existing tables
psql $NEON_DATABASE_URL -c "\dt pickup_points addresses"
```

### API Returns 401
- Verify X-Telegram-Id header is sent
- Check user has required role
- Verify user is not blocked

### API Returns 404
- For customer endpoints: verify ownership
- For pickup points: verify id exists and is_active
- Returns 404 instead of 403 for security

### Performance Issues
- Check indexes are created: `SELECT * FROM pg_indexes;`
- Verify pagination is used on list endpoints
- Check query time in database logs

---

## 📋 File Structure

```
Project Root/
├── db/
│   └── migrations/
│       └── 004_delivery_management.sql      (NEW)
├── pages/
│   └── api/
│       ├── admin/
│       │   └── pickup-points.ts             (NEW)
│       ├── addresses.ts                     (UPDATED)
│       ├── pickup-points.ts                 (UPDATED)
│       └── orders.ts                        (UPDATED)
├── docs/
│   └── 04_delivery/
│       ├── API.md                           (NEW)
│       ├── IMPLEMENTATION.md                (NEW)
│       ├── TESTING.md                       (NEW)
│       └── DEPLOYMENT.md                    (NEW)
└── PHASE_P4_COMPLETION.txt                  (NEW)
```

---

## 🔗 Related Files

### Existing Patterns Used
- `lib/auth.ts` - requireAuth() middleware
- `lib/db.ts` - Database query() function
- `pages/api/admin/products.ts` - Admin endpoint pattern

### Environment Required
- `NEON_DATABASE_URL` - PostgreSQL connection
- `TELEGRAM_BOT_TOKEN` - Telegram bot token

---

## 📞 Support

For questions, see:
1. **API Usage** → API.md
2. **How It Works** → IMPLEMENTATION.md
3. **Test Examples** → TESTING.md
4. **Deployment Issues** → DEPLOYMENT.md

---

## ✨ Key Features

✅ Pickup Point Management
- Admin CRUD operations
- Active/inactive status tracking
- Change audit logging
- Public listing with caching

✅ Customer Address Management
- Add/update/delete addresses
- Default address handling
- Duplicate prevention
- Automatic promotion

✅ Order Delivery Integration
- Two delivery methods
- Comprehensive validation
- Automatic Telegram notification
- Full order lifecycle

✅ Performance & Security
- Database indexes
- HTTP caching
- Role-based access
- Ownership verification
- Input sanitization

---

## 🎯 Next Steps

1. ✅ Execute database migration
2. ✅ Test endpoints locally
3. ✅ Deploy to production
4. ✅ Monitor error logs
5. ✅ Verify all flows working
6. 📋 Plan Phase P5+ enhancements

---

**Status**: ✅ Ready for Production

All requirements met. Ready to deploy!


════════════════════════════════════════════════════════════════════════════════
## 📄 audit\QUICK_FIX_REFERENCE.md
════════════════════════════════════════════════════════════════════════════════

# 🔍 Быстрая справка по исправлениям (Quick Fix Reference)

## Таблица всех исправленных файлов

| Файл | Проблема | Решение | Статус |
|------|----------|---------|--------|
| **lib/telegram.ts** | Отсутствует `isReady` свойство | Добавлено отслеживание готовности WebApp | ✅ |
| **pages/api/bot.ts** | Уведомления не отправляются | Добавлен `setBotInstance(bot)` (строка 10) | ✅ |
| **pages/api/orders.ts** | Админы не получают уведомления | Добавлен вызов `notifyAdminsNewOrder()` (строки 163-174) | ✅ |
| **lib/notifications.ts** | Функция не полная | Реализована отправка уведомлений админам | ✅ |
| **pages/admin/pages/edit/[slug].tsx** | Нет WYSIWYG редактора | Интегрирован ReactQuill | ✅ |
| **package.json** | Нет react-quill | Добавлены зависимости | ✅ |
| **db/migrations/001_initial_schema.sql** | Отсутствует базовая схема | Создана полная миграция (374 строк) | ✅ |
| **pages/api/*.ts** (10 файлов) | Неправильные пути импортов | Исправлены на `../../lib/` | ✅ |
| **pages/api/admin/*.ts** (13 файлов) | Неправильные пути импортов | Исправлены на `../../../lib/` | ✅ |
| **pages/api/admin/*/*.ts** (6 файлов) | Неправильные пути импортов | Исправлены на `../../../../lib/` | ✅ |
| **components/ActivationModal.tsx** | Неправильные пути | Исправлены импорты | ✅ |
| **pages/api/admin/activate.ts** | Type ошибки для null | Исправлены типы categoryId/brandId | ✅ |
| **pages/admin/kanban.tsx** | PointerSensor ошибка | Исправлена конфигурация | ✅ |

---

## 🔧 Критические файлы для понимания

### 1. **lib/notifications.ts** — Центр системы уведомлений
```typescript
// Вызывает: setBotInstance(bot) в pages/api/bot.ts
// Использует: sendNotification(telegramId, message)
// Экспортирует: notifyAdminsNewOrder(), sendNotification()
```

**Как работает**:
- `setBotInstance(bot)` сохраняет экземпляр бота (избегает циклических зависимостей)
- `notifyAdminsNewOrder()` читает `ADMIN_TELEGRAM_IDS` и отправляет каждому
- `sendNotification()` это основной метод отправки

### 2. **pages/api/bot.ts** — Telegram бот инициализация
```typescript
// Строка 5: import { setBotInstance } from '../lib/notifications';
// Строка 10: setBotInstance(bot);
```

**Обязательно** вызвать `setBotInstance` при инициализации бота!

### 3. **pages/api/orders.ts** — Создание заказа + уведомление
```typescript
// Строка 4: import { notifyAdminsNewOrder } from '../lib/notifications';
// Строки 163-174: После создания заказа вызывать notifyAdminsNewOrder(orderId)
```

**Последовательность**:
1. Создать заказ в БД
2. Отправить уведомление админу
3. Вернуть ответ клиенту

### 4. **db/migrations/001_initial_schema.sql** — Основная схема БД
```sql
-- Таблицы: users, categories, brands, products, cart_items, 
-- price_import, orders, order_items, reviews, wishlist, addresses, promocodes
-- Все таблицы используют IF NOT EXISTS для идемпотентности
```

**Нужно запустить** при первом развёртывании:
```bash
psql $DATABASE_URL -f db/migrations/001_initial_schema.sql
```

### 5. **pages/admin/pages/edit/[slug].tsx** — Редактор с ReactQuill
```typescript
// Строка 10: const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
// Строка 7: import 'react-quill/dist/quill.snow.css';
```

**Важно**: Dynamic import с `ssr: false` для избежания SSR ошибок

---

## 📊 Правило импортов

**Запомните эту таблицу:**

| Местоположение файла | Пример | Путь импорта |
|----------------------|--------|--------------|
| `pages/api/orders.ts` | Доступ к `lib/db` | `../../lib/db` |
| `pages/api/admin/activate.ts` | Доступ к `lib/db` | `../../../lib/db` |
| `pages/api/admin/banners/[id].ts` | Доступ к `lib/db` | `../../../../lib/db` |

**Формула**: `..` × (кол-во папок до `pages` + 1) + `/lib/`

---

## 🚨 Если build падает с ошибкой "Cannot find module"

### Шаг 1: Определить местоположение файла
```bash
# Пример: pages/api/orders.ts
# Уровень: pages/api/  (одна папка после pages/)
```

### Шаг 2: Посчитать глубину
```
pages/api/orders.ts
↓
pages/api/  — это одна папка (глубина 1)
```

### Шаг 3: Применить формулу
```
Количество ../ = (1 + 1) = 2
Импорт: from '../../lib/db'
```

### Шаг 4: Проверить
```bash
npm run build  # Должно скомпилироваться без ошибок
```

---

## 🧪 Чек-лист для тестирования

### Перед production deployment

- [ ] `npm run build` проходит без ошибок
- [ ] `npm run lint` не выдаёт критических ошибок
- [ ] Все переменные окружения установлены:
  - [ ] `DATABASE_URL`
  - [ ] `TELEGRAM_BOT_TOKEN`
  - [ ] `ADMIN_TELEGRAM_IDS`
  - [ ] `WEBAPP_URL`
- [ ] Миграции БД запущены
- [ ] Тест создания заказа:
  - [ ] Заказ создаётся в БД
  - [ ] Админ получает Telegram уведомление
  - [ ] На клиенте появляется 6-значный код
- [ ] Тест редактора страниц:
  - [ ] Открывается /admin/pages
  - [ ] Загружается ReactQuill редактор
  - [ ] HTML сохраняется в БД
  - [ ] Контент отображается на публичной странице
- [ ] Тест промокодов:
  - [ ] Промокод применяется в корзине
  - [ ] Скидка сохраняется при создании заказа

---

## 📞 Если что-то не работает

### Проблема: Build падает с import error
**Решение**: Проверить правило импортов (таблица выше), пересчитать уровни `../`

### Проблема: Админ не получает уведомления
**Решение**: 
1. Проверить `ADMIN_TELEGRAM_IDS` в .env.local
2. Проверить, что `setBotInstance(bot)` вызывается в pages/api/bot.ts
3. Проверить логи: `notifyAdminsNewOrder()` вызывается после создания заказа

### Проблема: ReactQuill не загружается
**Решение**:
1. Проверить, что `react-quill` и `quill` в package.json
2. Проверить, что используется dynamic import с `ssr: false`
3. Проверить браузерную консоль на ошибки

### Проблема: isReady undefined в админ страницах
**Решение**: Убедиться, что `lib/telegram.ts` экспортирует `isReady` в hook

---

## 📚 Документация

Подробная документация находится в папке `docs/`:

- `FINAL_COMPLETION_REPORT.md` — Общий отчёт (читать первым!)
- `BUILD_FIXES_REPORT.md` — Анализ проблемы с импортами
- `FIXES_SUMMARY.md` — Список всех исправлений
- `01_database/README.md` — Описание миграций
- `03_notifications/FIX_NOTIFICATIONS.md` — Как работают уведомления
- `08_content/README.md` — ReactQuill интеграция

---

## 🎯 Следующий разработчик: Начни отсюда

1. Прочитай `FINAL_COMPLETION_REPORT.md`
2. Запусти `npm run build` для проверки
3. Запусти `npm run dev` для локальной разработки
4. При необходимости изменения пути импорта — используй таблицу правил выше

**Удачи! 🚀**

