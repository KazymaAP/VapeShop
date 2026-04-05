# 📖 API Reference - Система доставки (P4)

**Версия:** 1.0  
**Статус:** Complete  
**Формат:** RESTful API

---

## 🗂️ Содержание

1. [Admin Pickup Points API](#admin-pickup-points-api)
2. [Customer Addresses API](#customer-addresses-api)
3. [Public Pickup Points API](#public-pickup-points-api)
4. [Orders API (Updated)](#orders-api-updated)
5. [Error Handling](#error-handling)
6. [Authentication](#authentication)
7. [Response Formats](#response-formats)

---

## 🔐 Admin Pickup Points API

Управление пунктами выдачи (только для админов).

### GET /api/admin/pickup-points

Получить список всех пунктов выдачи с пагинацией.

**Method:** `GET`  
**Auth Required:** ✅ Admin  
**Rate Limit:** 100 req/min

**Query Parameters:**

| Param   | Type    | Required | Default | Max | Description           |
| ------- | ------- | -------- | ------- | --- | --------------------- |
| `page`  | integer | No       | 1       | N/A | Номер страницы        |
| `limit` | integer | No       | 20      | 100 | Элементов на странице |

**Request Example:**

```bash
curl -H "X-Telegram-Id: 987654321" \
     "http://localhost:3000/api/admin/pickup-points?page=1&limit=20"
```

**Response (200 OK):**

```json
{
  "pickup_points": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Пункт выдачи - Центр",
      "address": "г. Москва, ул. Тверская, д. 1",
      "is_active": true,
      "created_at": "2024-01-15T10:00:00.000Z",
      "updated_at": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 10,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

**Validation Rules:**

- `page` must be >= 1
- `limit` must be 1-100

**Status Codes:**

- `200` OK - успешно
- `401` Unauthorized - отсутствует аутентификация
- `403` Forbidden - не админ
- `500` Server Error

---

### POST /api/admin/pickup-points

Создать новый пункт выдачи.

**Method:** `POST`  
**Auth Required:** ✅ Admin  
**Content-Type:** `application/json`  
**Rate Limit:** 20 req/min

**Request Body:**

| Field     | Type   | Required | Max Length | Description     |
| --------- | ------ | -------- | ---------- | --------------- |
| `name`    | string | Yes      | 255        | Название пункта |
| `address` | string | Yes      | 500        | Адрес пункта    |

**Request Example:**

```bash
curl -X POST http://localhost:3000/api/admin/pickup-points \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Id: 987654321" \
  -d '{
    "name": "Пункт выдачи - Восток",
    "address": "г. Москва, ул. Комсомольская, д. 42"
  }'
```

**Response (201 Created):**

```json
{
  "pickup_point": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Пункт выдачи - Восток",
    "address": "г. Москва, ул. Комсомольская, д. 42",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Validation Rules:**

- `name` - обязателен, 1-255 символов, не пуст
- `address` - обязателен, 1-500 символов, не пуст

**Status Codes:**

- `201` Created - пункт создан
- `400` Bad Request - неверные параметры
- `401` Unauthorized - отсутствует аутентификация
- `403` Forbidden - не админ
- `500` Server Error

**Error Response (400):**

```json
{
  "error": "Название пункта выдачи обязательно"
}
```

---

### PUT /api/admin/pickup-points

Обновить пункт выдачи.

**Method:** `PUT`  
**Auth Required:** ✅ Admin  
**Content-Type:** `application/json`  
**Rate Limit:** 20 req/min

**Request Body:**

| Field       | Type          | Required | Max Length | Description    |
| ----------- | ------------- | -------- | ---------- | -------------- |
| `id`        | string (UUID) | Yes      | N/A        | ID пункта      |
| `name`      | string        | No       | 255        | Новое название |
| `address`   | string        | No       | 500        | Новый адрес    |
| `is_active` | boolean       | No       | N/A        | Статус пункта  |

**Request Example:**

```bash
curl -X PUT http://localhost:3000/api/admin/pickup-points \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Id: 987654321" \
  -d '{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Пункт выдачи - Центр (обновлено)",
    "address": "г. Москва, ул. Тверская, д. 5",
    "is_active": true
  }'
```

**Response (200 OK):**

```json
{
  "success": true
}
```

**Validation Rules:**

- `id` - обязателен, UUID формат
- `name` - если указано, то 1-255 символов
- `address` - если указано, то 1-500 символов
- Минимум одно поле должно быть указано для обновления

**Status Codes:**

- `200` OK - успешно обновлено
- `400` Bad Request - неверные параметры
- `401` Unauthorized - отсутствует аутентификация
- `403` Forbidden - не админ
- `404` Not Found - пункт не найден
- `500` Server Error

**Error Response (404):**

```json
{
  "error": "Пункт выдачи не найден"
}
```

---

### DELETE /api/admin/pickup-points

Удалить (soft delete) пункт выдачи.

**Method:** `DELETE`  
**Auth Required:** ✅ Admin  
**Rate Limit:** 20 req/min

**Query Parameters:**

| Param | Type          | Required | Description            |
| ----- | ------------- | -------- | ---------------------- |
| `id`  | string (UUID) | Yes      | ID пункта для удаления |

**Request Example:**

```bash
curl -X DELETE "http://localhost:3000/api/admin/pickup-points?id=550e8400-e29b-41d4-a716-446655440000" \
  -H "X-Telegram-Id: 987654321"
```

**Response (200 OK):**

```json
{
  "success": true
}
```

**Notes:**

- Это soft delete: `is_active` устанавливается в `false`
- Данные остаются в БД для аудита
- Заказы, связанные с этим пунктом, остаются нетронутыми

**Status Codes:**

- `200` OK - успешно удалено
- `401` Unauthorized - отсутствует аутентификация
- `403` Forbidden - не админ
- `404` Not Found - пункт не найден
- `500` Server Error

---

## 👤 Customer Addresses API

Управление адресами доставки для пользователей.

### GET /api/addresses

Получить все адреса пользователя.

**Method:** `GET`  
**Auth Required:** ⚠️ User (Optional, recommended)  
**Rate Limit:** 100 req/min

**Query Parameters:**

| Param         | Type    | Required | Description              |
| ------------- | ------- | -------- | ------------------------ |
| `telegram_id` | integer | Yes      | ID Telegram пользователя |

**Request Example:**

```bash
curl "http://localhost:3000/api/addresses?telegram_id=123456789"
```

**Response (200 OK):**

```json
{
  "addresses": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "user_telegram_id": 123456789,
      "address": "г. Москва, ул. Арбат, д. 15, кв. 42",
      "is_default": true,
      "created_at": "2024-01-10T08:00:00.000Z",
      "updated_at": "2024-01-12T14:30:00.000Z"
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "user_telegram_id": 123456789,
      "address": "г. Москва, ул. Ленина, д. 10",
      "is_default": false,
      "created_at": "2024-01-15T15:00:00.000Z",
      "updated_at": "2024-01-15T15:00:00.000Z"
    }
  ]
}
```

**Response (200 OK - Empty):**

```json
{
  "addresses": []
}
```

**Validation Rules:**

- `telegram_id` - обязателен, положительное целое число

**Status Codes:**

- `200` OK - успешно (массив может быть пуст)
- `400` Bad Request - telegram_id не указан
- `500` Server Error

---

### POST /api/addresses

Добавить новый адрес пользователю.

**Method:** `POST`  
**Auth Required:** ✅ User  
**Content-Type:** `application/json`  
**Rate Limit:** 20 req/min

**Request Body:**

| Field         | Type    | Required | Max Length | Description                |
| ------------- | ------- | -------- | ---------- | -------------------------- |
| `telegram_id` | integer | Yes      | N/A        | ID пользователя            |
| `address`     | string  | Yes      | 500        | Адрес доставки             |
| `is_default`  | boolean | No       | N/A        | По умолчанию? (def: false) |

**Request Example:**

```bash
curl -X POST http://localhost:3000/api/addresses \
  -H "Content-Type: application/json" \
  -d '{
    "telegram_id": 123456789,
    "address": "г. Москва, ул. Арбат, д. 15, кв. 42",
    "is_default": false
  }'
```

**Response (200 OK):**

```json
{
  "address": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "user_telegram_id": 123456789,
    "address": "г. Москва, ул. Арбат, д. 15, кв. 42",
    "is_default": false,
    "created_at": "2024-01-15T15:00:00.000Z",
    "updated_at": "2024-01-15T15:00:00.000Z"
  }
}
```

**Validation Rules:**

- `telegram_id` - обязателен, положительное число
- `address` - обязателен, 1-500 символов, не пуст
- UNIQUE constraint: один адрес для пользователя можно добавить только 1 раз
- Если `is_default=true` → снимаются флаги у других адресов

**Status Codes:**

- `200` OK - адрес добавлен
- `400` Bad Request - неверные параметры
- `409` Conflict - адрес уже существует (UNIQUE violation)
- `500` Server Error

**Error Response (409):**

```json
{
  "error": "Этот адрес уже сохранен"
}
```

---

### PUT /api/addresses

Обновить адрес пользователя.

**Method:** `PUT`  
**Auth Required:** ✅ User  
**Content-Type:** `application/json`  
**Rate Limit:** 20 req/min

**Request Body:**

| Field        | Type          | Required | Max Length | Description              |
| ------------ | ------------- | -------- | ---------- | ------------------------ |
| `id`         | string (UUID) | Yes      | N/A        | ID адреса                |
| `address`    | string        | No       | 500        | Новый адрес              |
| `is_default` | boolean       | No       | N/A        | Установить по умолчанию? |

**Request Example:**

```bash
curl -X PUT http://localhost:3000/api/addresses \
  -H "Content-Type: application/json" \
  -d '{
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "is_default": true
  }'
```

**Response (200 OK):**

```json
{
  "success": true
}
```

**Validation Rules:**

- `id` - обязателен, UUID формат
- `address` - если указано, то 1-500 символов
- Если `is_default=true` → снимаются флаги у других адресов этого пользователя

**Status Codes:**

- `200` OK - успешно обновлено
- `400` Bad Request - неверные параметры
- `401` Unauthorized - не аутентифицирован
- `404` Not Found - адрес не найден
- `500` Server Error

---

### DELETE /api/addresses

Удалить адрес пользователя.

**Method:** `DELETE`  
**Auth Required:** ✅ User  
**Rate Limit:** 20 req/min

**Query Parameters:**

| Param | Type          | Required | Description            |
| ----- | ------------- | -------- | ---------------------- |
| `id`  | string (UUID) | Yes      | ID адреса для удаления |

**Request Example:**

```bash
curl -X DELETE "http://localhost:3000/api/addresses?id=770e8400-e29b-41d4-a716-446655440002"
```

**Response (200 OK):**

```json
{
  "success": true
}
```

**Notes:**

- Адрес полностью удаляется из БД
- Если это был адрес по умолчанию, флаг снимается
- Заказы, использовавшие этот адрес, остаются нетронутыми

**Status Codes:**

- `200` OK - успешно удалено
- `401` Unauthorized - не аутентифицирован
- `404` Not Found - адрес не найден
- `500` Server Error

---

## 🌍 Public Pickup Points API

Получение информации о пунктах выдачи (без аутентификации).

### GET /api/pickup-points

Получить список активных пунктов выдачи.

**Method:** `GET`  
**Auth Required:** ❌ No  
**Rate Limit:** 200 req/min  
**Cacheable:** ✅ Yes (можно кэшировать на клиенте)

**Query Parameters:** Нет

**Request Example:**

```bash
curl "http://localhost:3000/api/pickup-points"
```

**Response (200 OK):**

```json
{
  "pickup_points": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Пункт выдачи - Центр",
      "address": "г. Москва, ул. Тверская, д. 1",
      "is_active": true,
      "created_at": "2024-01-15T10:00:00.000Z",
      "updated_at": "2024-01-15T10:00:00.000Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Пункт выдачи - Восток",
      "address": "г. Москва, ул. Комсомольская, д. 42",
      "is_active": true,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**Notes:**

- Возвращает ТОЛЬКО активные пункты (`is_active = true`)
- Отключенные пункты не включаются в ответ
- Результат можно кэшировать на клиенте (редко меняется)
- Это самый быстрый endpoint

**Status Codes:**

- `200` OK - успешно
- `500` Server Error

---

## 📦 Orders API (Updated)

### POST /api/orders

Создать новый заказ с выбором способа доставки.

**Method:** `POST`  
**Auth Required:** ✅ User  
**Content-Type:** `application/json`  
**Rate Limit:** 10 req/min

**Request Body (для самовывоза):**

| Field                | Type          | Required | Description       |
| -------------------- | ------------- | -------- | ----------------- |
| `items`              | array         | Yes      | Массив товаров    |
| `items[].product_id` | string        | Yes      | ID продукта       |
| `items[].quantity`   | integer       | Yes      | Количество (>0)   |
| `delivery_method`    | string        | Yes      | "pickup"          |
| `pickup_point_id`    | string (UUID) | Yes      | ID пункта выдачи  |
| `delivery_date`      | string        | No       | Дата (YYYY-MM-DD) |

**Request Body (для доставки на адрес):**

| Field                | Type    | Required | Description       |
| -------------------- | ------- | -------- | ----------------- |
| `items`              | array   | Yes      | Массив товаров    |
| `items[].product_id` | string  | Yes      | ID продукта       |
| `items[].quantity`   | integer | Yes      | Количество (>0)   |
| `delivery_method`    | string  | Yes      | "delivery"        |
| `address`            | string  | Yes      | Адрес доставки    |
| `delivery_date`      | string  | No       | Дата (YYYY-MM-DD) |

**Request Example (Pickup):**

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Id: 123456789" \
  -d '{
    "items": [
      {"product_id": "prod-001", "quantity": 2},
      {"product_id": "prod-002", "quantity": 1}
    ],
    "delivery_method": "pickup",
    "pickup_point_id": "550e8400-e29b-41d4-a716-446655440000",
    "delivery_date": "2024-01-20"
  }'
```

**Request Example (Delivery):**

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Id: 123456789" \
  -d '{
    "items": [
      {"product_id": "prod-001", "quantity": 1}
    ],
    "delivery_method": "delivery",
    "address": "г. Москва, ул. Арбат, д. 15, кв. 42",
    "delivery_date": "2024-01-22"
  }'
```

**Response (201 Created):**

```json
{
  "order": {
    "id": "order-550e8400-e29b-41d4-a716",
    "user_telegram_id": 123456789,
    "total_price": 2500,
    "delivery_method": "pickup",
    "pickup_point_id": "550e8400-e29b-41d4-a716-446655440000",
    "delivery_date": "2024-01-20",
    "status": "pending",
    "created_at": "2024-01-15T16:00:00.000Z"
  }
}
```

**Validation Rules:**

- `items` - массив не пуст, минимум 1 товар
- `product_id` - обязателен для каждого товара
- `quantity` - обязателен, целое число > 0
- `delivery_method` - обязателен, только "pickup" или "delivery"
- Если "pickup":
  - `pickup_point_id` обязателен
  - `pickup_point_id` должен существовать в БД
  - `pickup_point_id` должен быть активным
- Если "delivery":
  - `address` обязателен, не пуст
  - `address` 1-500 символов
- `delivery_date` - если указана, то формат YYYY-MM-DD, >= завтра

**Status Codes:**

- `201` Created - заказ создан
- `400` Bad Request - неверные параметры
- `401` Unauthorized - не аутентифицирован
- `404` Not Found - товар или пункт не найдены
- `500` Server Error

**Error Response (400):**

```json
{
  "error": "delivery_method должен быть 'pickup' или 'delivery'"
}
```

**Error Response (404):**

```json
{
  "error": "Пункт выдачи не найден"
}
```

---

## 🚨 Error Handling

### Стандартные ошибки

Все ошибки возвращаются в формате JSON:

```json
{
  "error": "Описание ошибки на русском"
}
```

### Коды ошибок HTTP

| Code | Name               | Description                  | Решение                      |
| ---- | ------------------ | ---------------------------- | ---------------------------- |
| 200  | OK                 | Успешный запрос              | N/A                          |
| 201  | Created            | Ресурс создан                | N/A                          |
| 400  | Bad Request        | Неверные параметры           | Проверьте request body       |
| 401  | Unauthorized       | Требуется аутентификация     | Добавьте X-Telegram-Id       |
| 403  | Forbidden          | Недостаточно прав            | Требуется админ роль         |
| 404  | Not Found          | Ресурс не найден             | Проверьте ID                 |
| 409  | Conflict           | Конфликт данных (UNIQUE)     | Данные уже существуют        |
| 405  | Method Not Allowed | HTTP метод не поддерживается | Используйте правильный метод |
| 500  | Server Error       | Ошибка сервера               | Свяжитесь с поддержкой       |

---

## 🔐 Authentication

### Заголовок X-Telegram-Id

Для endpoints требующих аутентификации, отправьте заголовок:

```bash
-H "X-Telegram-Id: 123456789"
```

### Проверка Admin роли

Admin endpoints требуют:

1. Наличие `X-Telegram-Id` заголовка
2. Пользователь с этим ID должен иметь роль `admin` в БД

```sql
SELECT role FROM users WHERE telegram_id = 987654321;
-- должен вернуть 'admin'
```

---

## 📋 Response Formats

### Успешный ответ (200/201)

```json
{
  "field1": "value1",
  "field2": "value2"
}
```

или

```json
{
  "data_name": {
    /* объект */
  },
  "metadata": {
    /* доп. информация */
  }
}
```

### Ошибка

```json
{
  "error": "Описание ошибки"
}
```

### Пагинация

```json
{
  "items": [
    /* массив */
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

---

## 📊 Rate Limits

| Endpoint                        | Limit   | Window   |
| ------------------------------- | ------- | -------- |
| GET /api/pickup-points          | 200/min | 1 minute |
| GET /api/admin/pickup-points    | 100/min | 1 minute |
| POST /api/admin/pickup-points   | 20/min  | 1 minute |
| PUT /api/admin/pickup-points    | 20/min  | 1 minute |
| DELETE /api/admin/pickup-points | 20/min  | 1 minute |
| GET /api/addresses              | 100/min | 1 minute |
| POST /api/addresses             | 20/min  | 1 minute |
| PUT /api/addresses              | 20/min  | 1 minute |
| DELETE /api/addresses           | 20/min  | 1 minute |
| POST /api/orders                | 10/min  | 1 minute |

При превышении лимита: `429 Too Many Requests`

---

## 🔗 Related Documentation

- [README.md](./README.md) - полный обзор системы
- [EXAMPLES.md](./EXAMPLES.md) - примеры использования
- [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) - чек-лист реализации

**Версия:** 1.0  
**Последнее обновление:** 2024  
**Статус:** ✅ Complete
