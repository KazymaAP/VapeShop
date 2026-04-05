# Phase P4: Delivery Management - API Documentation

## Overview

Phase P4 implements a complete delivery management system for the VapeShop Telegram Mini App. It includes:

- Pickup points management (admin)
- Customer address management
- Delivery method validation (pickup or courier)
- Order delivery integration

## Database Schema

### Tables

#### `pickup_points`

Stores all available pickup locations for order pickup.

```sql
CREATE TABLE pickup_points (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `addresses`

Stores customer delivery addresses with support for default address.

```sql
CREATE TABLE addresses (
  id UUID PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL,
  address TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_telegram_id, address)
);
```

#### `orders` (Modified)

Added delivery-related fields:

- `delivery_method` (VARCHAR): 'pickup' or 'courier'
- `pickup_point_id` (UUID): Foreign key to pickup_points
- `address` (TEXT): Delivery address for courier orders
- `delivery_date` (DATE): Expected delivery date for courier orders

## API Endpoints

### Admin Endpoints (Authentication Required: admin role)

#### GET /api/admin/pickup-points

Fetch all pickup points with pagination.

**Request:**

```json
GET /api/admin/pickup-points?page=1&limit=20
```

**Response (200):**

```json
{
  "pickup_points": [
    {
      "id": "uuid",
      "name": "Пункт выдачи - Центр",
      "address": "г. Москва, ул. Тверская, д. 1",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

#### POST /api/admin/pickup-points

Create a new pickup point.

**Request:**

```json
POST /api/admin/pickup-points
Content-Type: application/json

{
  "name": "Пункт выдачи - Юг",
  "address": "г. Москва, ул. Варшавская, д. 15"
}
```

**Response (201):**

```json
{
  "pickup_point": {
    "id": "uuid",
    "name": "Пункт выдачи - Юг",
    "address": "г. Москва, ул. Варшавская, д. 15",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Validation:**

- `name`: Required, non-empty string
- `address`: Required, non-empty string

**Error Responses:**

- 400: Missing or invalid fields
- 401: User not authenticated
- 403: User does not have admin role
- 500: Server error

#### PUT /api/admin/pickup-points

Update an existing pickup point.

**Request:**

```json
PUT /api/admin/pickup-points
Content-Type: application/json

{
  "id": "uuid",
  "name": "Updated Name",
  "address": "Updated Address",
  "is_active": true
}
```

**Response (200):**

```json
{
  "success": true
}
```

**Fields (at least one required):**

- `id`: Required, UUID of the pickup point
- `name`: Optional, non-empty string
- `address`: Optional, non-empty string
- `is_active`: Optional, boolean

**Error Responses:**

- 400: Invalid input
- 404: Pickup point not found
- 403: Unauthorized
- 500: Server error

#### DELETE /api/admin/pickup-points?id=uuid

Soft delete a pickup point (sets is_active=false).

**Request:**

```
DELETE /api/admin/pickup-points?id=uuid
```

**Response (200):**

```json
{
  "success": true
}
```

**Error Responses:**

- 400: Missing id parameter
- 404: Pickup point not found
- 403: Unauthorized
- 500: Server error

---

### Customer Endpoints (Authentication Required: buyer role)

#### GET /api/addresses

Fetch all addresses for the authenticated user.

**Request:**

```
GET /api/addresses
X-Telegram-Id: 123456789
```

**Response (200):**

```json
{
  "addresses": [
    {
      "id": "uuid",
      "user_telegram_id": 123456789,
      "address": "г. Москва, ул. Ленина, д. 5, кв. 10",
      "is_default": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "user_telegram_id": 123456789,
      "address": "г. Москва, ул. Пушкина, д. 20",
      "is_default": false,
      "created_at": "2024-01-02T00:00:00Z",
      "updated_at": "2024-01-02T00:00:00Z"
    }
  ]
}
```

#### POST /api/addresses

Create a new address for the authenticated user.

**Request:**

```json
POST /api/addresses
Content-Type: application/json
X-Telegram-Id: 123456789

{
  "address": "г. Москва, ул. Ленина, д. 5, кв. 10",
  "is_default": false
}
```

**Response (201):**

```json
{
  "address": {
    "id": "uuid",
    "user_telegram_id": 123456789,
    "address": "г. Москва, ул. Ленина, д. 5, кв. 10",
    "is_default": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Validation:**

- `address`: Required, minimum 5 characters
- `is_default`: Optional, defaults to false (but first address becomes default)
- Must be unique per user

**Error Responses:**

- 400: Missing or invalid fields, duplicate address
- 401: User not authenticated
- 403: User does not have buyer role
- 500: Server error

#### PUT /api/addresses

Update an existing address or set it as default.

**Request:**

```json
PUT /api/addresses
Content-Type: application/json
X-Telegram-Id: 123456789

{
  "id": "uuid",
  "address": "г. Москва, ул. Новая, д. 1",
  "is_default": true
}
```

**Response (200):**

```json
{
  "success": true
}
```

**Fields (at least one required):**

- `id`: Required, UUID of the address
- `address`: Optional, minimum 5 characters
- `is_default`: Optional, boolean

**Ownership Check:**

- Only the owner of the address can update it
- Updating another user's address returns 404

**Error Responses:**

- 400: Invalid input
- 404: Address not found or ownership mismatch
- 403: Unauthorized
- 500: Server error

#### DELETE /api/addresses?id=uuid

Delete an address for the authenticated user.

**Request:**

```
DELETE /api/addresses?id=uuid
X-Telegram-Id: 123456789
```

**Response (200):**

```json
{
  "success": true
}
```

**Behavior:**

- If deleted address was default, next most recent address becomes default
- If no addresses remain, user has no default address

**Ownership Check:**

- Only the owner of the address can delete it

**Error Responses:**

- 400: Missing id parameter
- 404: Address not found or ownership mismatch
- 403: Unauthorized
- 500: Server error

---

### Public Endpoints (No Authentication Required)

#### GET /api/pickup-points

Fetch all active pickup points with optional pagination and caching.

**Request:**

```
GET /api/pickup-points?page=1&limit=20&active=true
```

**Query Parameters:**

- `page`: Page number (default: 1, min: 1)
- `limit`: Items per page (default: 20, max: 100)
- `active`: Filter by active status (default: "true")

**Response (200):**

```json
{
  "pickup_points": [
    {
      "id": "uuid",
      "name": "Пункт выдачи - Центр",
      "address": "г. Москва, ул. Тверская, д. 1",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

**Headers:**

- `Cache-Control: public, max-age=3600` (cached for 1 hour)

**Error Responses:**

- 500: Server error

---

### Order Endpoints (Updated)

#### POST /api/orders

Create a new order with delivery method validation.

**Request:**

```json
POST /api/orders
Content-Type: application/json

{
  "telegram_id": 123456789,
  "items": [
    {
      "product_id": "uuid",
      "quantity": 2,
      "price": 199,
      "name": "Product Name"
    }
  ],
  "delivery_method": "pickup",
  "pickup_point_id": "uuid",
  "promo_code": "SUMMER2024",
  "discount": 100
}
```

**Pickup Delivery Request:**

```json
{
  "telegram_id": 123456789,
  "items": [...],
  "delivery_method": "pickup",
  "pickup_point_id": "uuid"
}
```

**Courier Delivery Request:**

```json
{
  "telegram_id": 123456789,
  "items": [...],
  "delivery_method": "courier",
  "address": "г. Москва, ул. Ленина, д. 5, кв. 10",
  "delivery_date": "2024-01-15"
}
```

**Response (201):**

```json
{
  "order_id": "uuid",
  "status": "pending",
  "message": "Инвойс отправлен. Ожидайте оплаты."
}
```

**Validation:**

- `telegram_id`: Required, must be integer
- `items`: Required, non-empty array
- `delivery_method`: Required, must be "pickup" or "courier"
- For pickup:
  - `pickup_point_id`: Required, must exist and be active
- For courier:
  - `address`: Required, minimum 10 characters
  - `delivery_date`: Required, must be >= tomorrow

**Error Responses:**

- 400: Invalid delivery method or missing required fields
- 403: User is blocked
- 404: Pickup point not found or inactive
- 405: Method not allowed
- 500: Server error

---

## Implementation Details

### Error Handling

- All endpoints validate input parameters
- Return appropriate HTTP status codes (200, 201, 400, 403, 404, 405, 500)
- User-facing error messages are in Russian

### Authentication

- Admin endpoints use `requireAuth(handler, ['admin'])`
- Customer endpoints use `requireAuth(handler, ['buyer'])`
- Public endpoints have no authentication
- User identity extracted from X-Telegram-Id header or initData

### Ownership Checks

- Customer address operations verify `user_telegram_id` matches authenticated user
- Attempting to access another user's address returns 404 (not 403) for security

### Data Validation

- Input sanitization on all string fields (trim, length checks)
- Duplicate address prevention per user
- Pickup point active status validation
- Delivery date must be at least tomorrow

### Logging

- Admin actions logged to `admin_logs` table
- Actions: create_pickup_point, update_pickup_point, delete_pickup_point
- Log includes user_telegram_id, action type, and details

### Performance

- Pagination support on list endpoints
- Caching headers for public endpoints (1 hour)
- Indexes on frequently queried fields
- Unique constraint prevents duplicate addresses per user

---

## Migration

Execute the migration to set up the delivery management tables:

```bash
psql $DATABASE_URL < db/migrations/004_delivery_management.sql
```

This creates:

1. `pickup_points` table
2. `addresses` table
3. Adds delivery fields to `orders` table
4. Creates indexes and triggers
5. Inserts sample pickup points
