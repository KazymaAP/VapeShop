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
  "items": [{ "product_id": "prod-1", "quantity": 2 }],
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

| Method | URL                            | Auth  | Цель                        |
| ------ | ------------------------------ | ----- | --------------------------- |
| GET    | `/api/admin/pickup-points`     | Admin | Получить все пункты (админ) |
| POST   | `/api/admin/pickup-points`     | Admin | Создать пункт               |
| PUT    | `/api/admin/pickup-points`     | Admin | Обновить пункт              |
| DELETE | `/api/admin/pickup-points?id=` | Admin | Удалить пункт               |
| GET    | `/api/addresses?telegram_id=`  | User  | Получить адреса юзера       |
| POST   | `/api/addresses`               | User  | Добавить адрес              |
| PUT    | `/api/addresses`               | User  | Обновить адрес              |
| DELETE | `/api/addresses?id=`           | User  | Удалить адрес               |
| GET    | `/api/pickup-points`           | None  | Получить активные пункты    |
| POST   | `/api/orders`                  | User  | Создать заказ (обновлено)   |

### Коды ошибок

| Код | Описание           | Решение                      |
| --- | ------------------ | ---------------------------- |
| 200 | OK                 | Успешно                      |
| 201 | Created            | Ресурс создан                |
| 400 | Bad Request        | Проверить параметры запроса  |
| 401 | Unauthorized       | Отсутствует X-Telegram-Id    |
| 404 | Not Found          | Ресурс не найден             |
| 405 | Method Not Allowed | HTTP метод не поддерживается |
| 500 | Server Error       | Ошибка сервера               |

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
