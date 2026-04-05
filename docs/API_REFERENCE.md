# 📚 API Reference

Полная документация всех эндпоинтов VapeShop.

**Base URL**: `https://your-app.vercel.app/api`

---

## 🛍️ PRODUCTS API

### GET /products

Получить список товаров с пагинацией и фильтрацией.

**Query Params**:

```
page=1                    (optional, default: 1)
limit=20                  (optional, max: 100, default: 20)
category_id=5             (optional)
search=phone              (optional)
sort=price_asc|price_desc (optional)
```

**Response** (200):

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "Vape Pod 3000",
        "description": "High-performance pod",
        "price": 1500.0,
        "stock": 50,
        "image_url": "https://...",
        "category_id": 3,
        "rating": 4.8,
        "reviews_count": 42
      }
    ],
    "totalCount": 150,
    "page": 1,
    "limit": 20
  },
  "timestamp": "2026-04-04T10:30:00Z"
}
```

**Error** (400):

```json
{
  "success": false,
  "error": "Invalid page number",
  "timestamp": "2026-04-04T10:30:00Z"
}
```

---

### GET /products/:id

Получить детали товара.

**Response** (200):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Vape Pod 3000",
    "description": "High-performance pod",
    "price": 1500.0,
    "stock": 50,
    "image_url": "https://...",
    "category_id": 3,
    "rating": 4.8,
    "reviews": [
      {
        "id": 101,
        "user_name": "John",
        "rating": 5,
        "text": "Отличный товар!",
        "created_at": "2026-03-20T14:00:00Z"
      }
    ]
  },
  "timestamp": "2026-04-04T10:30:00Z"
}
```

---

### POST /products (Admin)

Создать новый товар.

**Headers**:

```
X-Telegram-ID: 1656233031  (для тестирования, или через WebApp initData)
X-Init-Data: <hash>        (Telegram signature)
```

**Body**:

```json
{
  "name": "Vape Pod 3000",
  "description": "High-performance pod",
  "price": 1500.0,
  "stock": 50,
  "image_url": "https://...",
  "category_id": 3
}
```

**Response** (201):

```json
{
  "success": true,
  "data": {
    "id": 102,
    "name": "Vape Pod 3000",
    "created_at": "2026-04-04T10:30:00Z"
  },
  "timestamp": "2026-04-04T10:30:00Z"
}
```

**Errors**:

- 400: Validation error
- 401: Unauthorized
- 403: Forbidden (not admin)
- 409: Product already exists

---

### PUT /products/:id (Admin)

Обновить товар.

**Body**:

```json
{
  "price": 1600.0,
  "stock": 45
}
```

**Response** (200):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Vape Pod 3000",
    "price": 1600.0,
    "stock": 45,
    "updated_at": "2026-04-04T10:35:00Z"
  },
  "timestamp": "2026-04-04T10:35:00Z"
}
```

---

### DELETE /products/:id (Admin)

Удалить товар (soft delete).

**Response** (200):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "deleted_at": "2026-04-04T10:40:00Z"
  },
  "timestamp": "2026-04-04T10:40:00Z"
}
```

---

## 🛒 CART API

### GET /cart

Получить содержимое корзины пользователя.

**Response** (200):

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "product_id": 5,
        "product_name": "Vape Pod 3000",
        "quantity": 2,
        "price": 1500.0,
        "subtotal": 3000.0,
        "image_url": "https://..."
      }
    ],
    "total": 3000.0,
    "item_count": 2
  },
  "timestamp": "2026-04-04T10:45:00Z"
}
```

---

### POST /cart

Добавить товар в корзину или увеличить количество.

**Body**:

```json
{
  "product_id": 5,
  "quantity": 2
}
```

**Response** (200):

```json
{
  "success": true,
  "data": {
    "product_id": 5,
    "quantity": 2,
    "total": 3000.0
  },
  "timestamp": "2026-04-04T10:50:00Z"
}
```

---

### DELETE /cart/:product_id

Удалить товар из корзины.

**Response** (200):

```json
{
  "success": true,
  "data": {
    "removed_product_id": 5,
    "new_total": 0.0
  },
  "timestamp": "2026-04-04T10:55:00Z"
}
```

---

## 📋 ORDERS API

### GET /orders

Получить историю заказов пользователя.

**Query Params**:

```
page=1        (optional, default: 1)
limit=10      (optional)
status=paid   (optional: pending, paid, shipped, delivered, cancelled)
```

**Response** (200):

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 456,
        "status": "delivered",
        "total": 3500.0,
        "delivery_type": "courier",
        "created_at": "2026-03-15T14:00:00Z",
        "items_count": 3
      }
    ],
    "totalCount": 12,
    "page": 1
  },
  "timestamp": "2026-04-04T11:00:00Z"
}
```

---

### GET /orders/:id

Получить детали заказа.

**Response** (200):

```json
{
  "success": true,
  "data": {
    "id": 456,
    "status": "delivered",
    "total": 3500.0,
    "delivery_type": "courier",
    "address": "ул. Кутузова, 12",
    "created_at": "2026-03-15T14:00:00Z",
    "paid_at": "2026-03-15T14:05:00Z",
    "shipped_at": "2026-03-16T08:00:00Z",
    "delivered_at": "2026-03-18T16:30:00Z",
    "items": [
      {
        "product_id": 5,
        "product_name": "Vape Pod 3000",
        "quantity": 2,
        "price": 1500.0
      }
    ]
  },
  "timestamp": "2026-04-04T11:05:00Z"
}
```

---

### POST /orders

Создать новый заказ.

**Body**:

```json
{
  "items": [
    { "product_id": 5, "quantity": 2 },
    { "product_id": 8, "quantity": 1 }
  ],
  "delivery_type": "courier",
  "address": "ул. Кутузова, 12"
}
```

**Response** (201):

```json
{
  "success": true,
  "data": {
    "order_id": 457,
    "status": "pending",
    "total": 3500.0,
    "invoice_url": "https://t.me/..."
  },
  "timestamp": "2026-04-04T11:10:00Z"
}
```

**Errors**:

- 400: Invalid items
- 422: Out of stock

---

### POST /orders/search-orders (Admin, Manager)

Поиск заказов с фильтрацией (для админки).

**Body**:

```json
{
  "status": "paid",
  "user_telegram_id": 1234567890,
  "date_from": "2026-03-01",
  "date_to": "2026-04-04",
  "limit": 20,
  "offset": 0
}
```

**Response** (200):

```json
{
  "success": true,
  "data": {
    "orders": [...],
    "total_count": 156,
    "total_revenue": 450000.00
  },
  "timestamp": "2026-04-04T11:15:00Z"
}
```

---

## 👤 USERS API

### GET /users/profile

Получить профиль текущего пользователя.

**Response** (200):

```json
{
  "success": true,
  "data": {
    "telegram_id": 1234567890,
    "first_name": "John",
    "username": "johnsmith",
    "role": "customer",
    "phone": "+7 900 123 45 67",
    "email": "john@example.com",
    "created_at": "2026-01-15T10:00:00Z"
  },
  "timestamp": "2026-04-04T11:20:00Z"
}
```

---

### PUT /users/profile

Обновить профиль.

**Body**:

```json
{
  "phone": "+7 900 987 65 43",
  "email": "newemail@example.com"
}
```

**Response** (200):

```json
{
  "success": true,
  "data": {
    "telegram_id": 1234567890,
    "phone": "+7 900 987 65 43",
    "email": "newemail@example.com",
    "updated_at": "2026-04-04T11:25:00Z"
  },
  "timestamp": "2026-04-04T11:25:00Z"
}
```

---

### GET /users/role

Получить роль текущего пользователя.

**Response** (200):

```json
{
  "success": true,
  "data": {
    "role": "admin",
    "permissions": ["create_product", "manage_orders", "view_stats"]
  },
  "timestamp": "2026-04-04T11:30:00Z"
}
```

---

## ⭐ REVIEWS API

### GET /reviews?product_id=5

Получить отзывы товара.

**Response** (200):

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 201,
        "user_name": "John",
        "rating": 5,
        "text": "Отличный товар!",
        "image_urls": ["https://..."],
        "helpful_count": 12,
        "created_at": "2026-03-20T14:00:00Z"
      }
    ],
    "average_rating": 4.8,
    "total_count": 42
  },
  "timestamp": "2026-04-04T11:35:00Z"
}
```

---

### POST /reviews

Создать отзыв.

**Body**:

```json
{
  "product_id": 5,
  "rating": 5,
  "text": "Отличный товар!",
  "image_urls": ["https://..."]
}
```

**Response** (201):

```json
{
  "success": true,
  "data": {
    "id": 202,
    "cashback_amount": 50.0
  },
  "timestamp": "2026-04-04T11:40:00Z"
}
```

---

## 🎁 REFERRAL API

### GET /referral

Получить реферальную информацию пользователя.

**Response** (200):

```json
{
  "success": true,
  "data": {
    "referral_code": "JOHN123",
    "referral_url": "https://t.me/bot?startapp=ref_JOHN123",
    "bonus_balance": 1500.0,
    "referrals_count": 5,
    "total_earned": 2500.0
  },
  "timestamp": "2026-04-04T11:45:00Z"
}
```

---

### POST /referral/use

Использовать реферальный код.

**Body**:

```json
{
  "referral_code": "JOHN123"
}
```

**Response** (200):

```json
{
  "success": true,
  "data": {
    "bonus_applied": 500.0,
    "new_balance": 2000.0
  },
  "timestamp": "2026-04-04T11:50:00Z"
}
```

---

## 💾 SAVED FOR LATER API

### GET /saved-for-later

Получить сохранённые товары.

**Response** (200):

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "product_id": 5,
        "product_name": "Vape Pod 3000",
        "price": 1500.0,
        "image_url": "https://...",
        "saved_at": "2026-03-20T14:00:00Z"
      }
    ],
    "total_count": 7
  },
  "timestamp": "2026-04-04T11:55:00Z"
}
```

---

### POST /saved-for-later

Сохранить товар.

**Body**:

```json
{
  "product_id": 5
}
```

**Response** (201):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "product_id": 5,
    "saved_at": "2026-04-04T12:00:00Z"
  },
  "timestamp": "2026-04-04T12:00:00Z"
}
```

---

### DELETE /saved-for-later/:id

Удалить из сохранённых.

**Response** (200):

```json
{
  "success": true,
  "data": {
    "removed_id": 1
  },
  "timestamp": "2026-04-04T12:05:00Z"
}
```

---

### POST /saved-for-later/:id/move-to-cart

Переместить в корзину.

**Response** (200):

```json
{
  "success": true,
  "data": {
    "moved_product_id": 5,
    "cart_total": 3000.0
  },
  "timestamp": "2026-04-04T12:10:00Z"
}
```

---

## 🔍 COMPARE API

### GET /compare

Получить сравнение товаров.

**Query Params**:

```
product_ids=1,5,8  (max 4)
```

**Response** (200):

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "Pod 1",
        "price": 1500,
        "rating": 4.5
      }
    ]
  },
  "timestamp": "2026-04-04T12:15:00Z"
}
```

---

### POST /compare

Сохранить сравнение.

**Body**:

```json
{
  "product_ids": [1, 5, 8]
}
```

**Response** (201):

```json
{
  "success": true,
  "data": {
    "comparison_id": "cmp_123"
  },
  "timestamp": "2026-04-04T12:20:00Z"
}
```

---

## 📊 ADMIN API

### GET /admin/stats

Получить аналитику (Admin).

**Query Params**:

```
period=month  (day, week, month, year)
```

**Response** (200):

```json
{
  "success": true,
  "data": {
    "total_orders": 450,
    "total_revenue": 450000.0,
    "average_order": 1000.0,
    "new_customers": 23,
    "top_products": [{ "id": 5, "name": "Pod 3000", "sold": 120 }]
  },
  "timestamp": "2026-04-04T12:25:00Z"
}
```

---

### POST /admin/broadcast

Отправить массовую рассылку (Admin).

**Body**:

```json
{
  "message": "Скидка 20% на все товары!",
  "target": "all|new_customers|inactive"
}
```

**Response** (200):

```json
{
  "success": true,
  "data": {
    "sent_count": 1250,
    "failed_count": 3
  },
  "timestamp": "2026-04-04T12:30:00Z"
}
```

---

### POST /admin/import

Импортировать товары из CSV (Admin).

**Body** (multipart/form-data):

```
file: products.csv
```

**Response** (202):

```json
{
  "success": true,
  "data": {
    "import_id": "imp_456",
    "total_rows": 150,
    "status": "processing"
  },
  "timestamp": "2026-04-04T12:35:00Z"
}
```

---

### GET /admin/orders (Admin, Manager)

Получить все заказы (не только свои).

**Query Params**:

```
status=paid
limit=50
offset=0
```

**Response** (200):

```json
{
  "success": true,
  "data": {
    "orders": [...],
    "total_count": 450
  },
  "timestamp": "2026-04-04T12:40:00Z"
}
```

---

## 🏥 HEALTH API

### GET /health

Проверка здоровья сервиса.

**Response** (200):

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "connected",
    "uptime_seconds": 86400,
    "memory_usage_mb": 256
  },
  "timestamp": "2026-04-04T12:45:00Z"
}
```

---

## ❌ Error Codes

| Code | Meaning              | Solution                                |
| ---- | -------------------- | --------------------------------------- |
| 400  | Bad Request          | Проверь тело запроса                    |
| 401  | Unauthorized         | Нужна Telegram авторизация              |
| 403  | Forbidden            | У тебя нет прав на эту операцию         |
| 404  | Not Found            | Ресурс не существует                    |
| 409  | Conflict             | Ресурс уже существует                   |
| 422  | Unprocessable Entity | Бизнес-логика ошибка (e.g., нет товара) |
| 429  | Too Many Requests    | Лимит запросов превышен                 |
| 500  | Server Error         | Ошибка на сервере                       |

---

**Версия**: 1.0.0  
**Дата**: 2026-04-04
