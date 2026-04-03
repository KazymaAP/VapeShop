# Phase P4: Delivery Management - Testing Guide

## Test Environment Setup

### Prerequisites
```bash
# Database must be initialized with migration
psql $NEON_DATABASE_URL < db/migrations/004_delivery_management.sql

# Sample pickup points should be created
# Server should be running
npm run dev

# Set admin and buyer telegram IDs in tests
ADMIN_TELEGRAM_ID=123456789    # Your admin user ID
BUYER_TELEGRAM_ID=987654321    # Your buyer user ID
```

### Test Tools
- cURL or Postman for API testing
- Database client for verification
- Browser DevTools for header inspection

---

## API Test Scenarios

### 1. Admin Pickup Point Management

#### Test 1.1: Get All Pickup Points (Paginated)
```bash
curl -X GET \
  'http://localhost:3000/api/admin/pickup-points?page=1&limit=20' \
  -H 'X-Telegram-Id: 123456789'
```

**Expected Response (200):**
- Array of pickup points with id, name, address, is_active
- Pagination object with total, page, limit, pages
- All sample pickup points present

**Verification:**
- [ ] Returns 3 sample pickup points
- [ ] Pagination data correct
- [ ] is_active field present

---

#### Test 1.2: Create Pickup Point
```bash
curl -X POST \
  'http://localhost:3000/api/admin/pickup-points' \
  -H 'X-Telegram-Id: 123456789' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Пункт выдачи - Север",
    "address": "г. Москва, ул. Новая, д. 100"
  }'
```

**Expected Response (201):**
```json
{
  "pickup_point": {
    "id": "uuid",
    "name": "Пункт выдачи - Север",
    "address": "г. Москва, ул. Новая, д. 100",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Verification:**
- [ ] Returns 201 Created status
- [ ] ID is UUID
- [ ] Timestamps are present and valid
- [ ] Admin log created in database

---

#### Test 1.3: Create Pickup Point - Validation Error
```bash
curl -X POST \
  'http://localhost:3000/api/admin/pickup-points' \
  -H 'X-Telegram-Id: 123456789' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "",
    "address": "г. Москва"
  }'
```

**Expected Response (400):**
```json
{
  "error": "Название пункта выдачи обязательно"
}
```

**Verification:**
- [ ] Returns 400 Bad Request
- [ ] Error message in Russian
- [ ] No pickup point created

---

#### Test 1.4: Update Pickup Point
```bash
curl -X PUT \
  'http://localhost:3000/api/admin/pickup-points' \
  -H 'X-Telegram-Id: 123456789' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "<pickup_point_id>",
    "name": "Пункт выдачи - Обновлено",
    "is_active": true
  }'
```

**Expected Response (200):**
```json
{
  "success": true
}
```

**Verification:**
- [ ] Returns 200 OK
- [ ] Data updated in database
- [ ] Admin log shows change details
- [ ] updated_at timestamp changed

---

#### Test 1.5: Delete Pickup Point (Soft Delete)
```bash
curl -X DELETE \
  'http://localhost:3000/api/admin/pickup-points?id=<pickup_point_id>' \
  -H 'X-Telegram-Id: 123456789'
```

**Expected Response (200):**
```json
{
  "success": true
}
```

**Database Verification:**
```sql
SELECT * FROM pickup_points WHERE id = '<pickup_point_id>';
-- Should show: is_active = false
```

**Verification:**
- [ ] Returns 200 OK
- [ ] is_active set to false
- [ ] Data not actually deleted
- [ ] Admin log recorded

---

### 2. Customer Address Management

#### Test 2.1: Get User's Addresses
```bash
curl -X GET \
  'http://localhost:3000/api/addresses' \
  -H 'X-Telegram-Id: 987654321'
```

**Expected Response (200):**
```json
{
  "addresses": [
    {
      "id": "uuid",
      "user_telegram_id": 987654321,
      "address": "г. Москва, ул. Ленина, д. 5, кв. 10",
      "is_default": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Verification:**
- [ ] Returns only authenticated user's addresses
- [ ] Sorted by is_default DESC, created_at DESC
- [ ] Default address first

---

#### Test 2.2: Create First Address (Auto-Default)
```bash
curl -X POST \
  'http://localhost:3000/api/addresses' \
  -H 'X-Telegram-Id: 987654321' \
  -H 'Content-Type: application/json' \
  -d '{
    "address": "г. Москва, ул. Ленина, д. 5, кв. 10",
    "is_default": false
  }'
```

**Expected Response (201):**
```json
{
  "address": {
    "id": "uuid",
    "user_telegram_id": 987654321,
    "address": "г. Москва, ул. Ленина, д. 5, кв. 10",
    "is_default": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Verification:**
- [ ] Returns 201 Created
- [ ] is_default is true (first address auto-default)
- [ ] Address stored in database

---

#### Test 2.3: Create Second Address (Explicit Default)
```bash
curl -X POST \
  'http://localhost:3000/api/addresses' \
  -H 'X-Telegram-Id: 987654321' \
  -H 'Content-Type: application/json' \
  -d '{
    "address": "г. Москва, ул. Пушкина, д. 20",
    "is_default": true
  }'
```

**Database Verification:**
```sql
SELECT * FROM addresses WHERE user_telegram_id = 987654321 
ORDER BY address;
-- First address should now have is_default = false
-- Second address should have is_default = true
```

**Verification:**
- [ ] New address created with is_default = true
- [ ] Previous default switched to false
- [ ] Only one default per user

---

#### Test 2.4: Duplicate Address Prevention
```bash
curl -X POST \
  'http://localhost:3000/api/addresses' \
  -H 'X-Telegram-Id: 987654321' \
  -H 'Content-Type: application/json' \
  -d '{
    "address": "г. Москва, ул. Ленина, д. 5, кв. 10"
  }'
```

**Expected Response (400):**
```json
{
  "error": "Этот адрес уже добавлен"
}
```

**Verification:**
- [ ] Returns 400 Bad Request
- [ ] No duplicate created

---

#### Test 2.5: Address Validation - Too Short
```bash
curl -X POST \
  'http://localhost:3000/api/addresses' \
  -H 'X-Telegram-Id: 987654321' \
  -H 'Content-Type: application/json' \
  -d '{
    "address": "short"
  }'
```

**Expected Response (400):**
```json
{
  "error": "Адрес должен быть не менее 5 символов"
}
```

---

#### Test 2.6: Update Address
```bash
curl -X PUT \
  'http://localhost:3000/api/addresses' \
  -H 'X-Telegram-Id: 987654321' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "<address_id>",
    "address": "г. Москва, ул. Ленина, д. 5, кв. 11 (обновлено)"
  }'
```

**Expected Response (200):**
```json
{
  "success": true
}
```

**Verification:**
- [ ] Address updated in database
- [ ] updated_at timestamp changed

---

#### Test 2.7: Ownership Verification
```bash
# Create address as user 987654321
# Try to update as different user
curl -X PUT \
  'http://localhost:3000/api/addresses' \
  -H 'X-Telegram-Id: 111111111' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "<address_id_from_other_user>",
    "address": "Хакерский адрес"
  }'
```

**Expected Response (404):**
```json
{
  "error": "Адрес не найден"
}
```

**Verification:**
- [ ] Returns 404 (not 403) for security
- [ ] Address not modified
- [ ] Different user cannot access

---

#### Test 2.8: Delete Address (Default Promotion)
```bash
# Setup: Create 2 addresses, set first as default, delete it
# 1. Get address IDs
curl -X GET \
  'http://localhost:3000/api/addresses' \
  -H 'X-Telegram-Id: 987654321'

# 2. Delete the default address
curl -X DELETE \
  'http://localhost:3000/api/addresses?id=<default_address_id>' \
  -H 'X-Telegram-Id: 987654321'

# 3. Verify other address became default
curl -X GET \
  'http://localhost:3000/api/addresses' \
  -H 'X-Telegram-Id: 987654321'
```

**Verification:**
- [ ] Returns 200 OK
- [ ] Default address deleted
- [ ] Next most recent address is now default
- [ ] Updated_at reflects the change

---

### 3. Public Pickup Points Listing

#### Test 3.1: Get Active Pickup Points (No Auth)
```bash
curl -X GET \
  'http://localhost:3000/api/pickup-points'
```

**Expected Response (200):**
- No authentication required
- Only active pickup points returned
- Cache headers present

**Verification:**
- [ ] No X-Telegram-Id required
- [ ] Returns 200 OK
- [ ] Cache-Control header shows max-age=3600
- [ ] Only is_active=true points included

---

#### Test 3.2: Verify Cache Headers
```bash
curl -I \
  'http://localhost:3000/api/pickup-points'
```

**Expected Headers:**
```
Cache-Control: public, max-age=3600
Content-Type: application/json
```

**Verification:**
- [ ] Cache-Control header present
- [ ] Max-age is 3600 seconds (1 hour)
- [ ] Public cache policy

---

#### Test 3.3: Pagination
```bash
curl -X GET \
  'http://localhost:3000/api/pickup-points?page=1&limit=2'
```

**Expected Response:**
```json
{
  "pickup_points": [...],
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 2,
    "pages": 2
  }
}
```

**Verification:**
- [ ] Returns maximum 2 items
- [ ] Pagination info shows pages=2
- [ ] Next page available

---

### 4. Order Creation with Delivery

#### Test 4.1: Order with Pickup Delivery
```bash
curl -X POST \
  'http://localhost:3000/api/orders' \
  -H 'Content-Type: application/json' \
  -d '{
    "telegram_id": 987654321,
    "items": [
      {
        "product_id": "uuid",
        "quantity": 2,
        "price": 199,
        "name": "Product"
      }
    ],
    "delivery_method": "pickup",
    "pickup_point_id": "<active_pickup_point_id>"
  }'
```

**Expected Response (201):**
```json
{
  "order_id": "uuid",
  "status": "pending",
  "message": "Инвойс отправлен. Ожидайте оплаты."
}
```

**Database Verification:**
```sql
SELECT delivery_method, pickup_point_id, address, delivery_date
FROM orders WHERE id = '<order_id>';
-- Should show: delivery_method='pickup', pickup_point_id=uuid, 
-- address=NULL, delivery_date=NULL
```

**Verification:**
- [ ] Order created with 201 status
- [ ] delivery_method set to 'pickup'
- [ ] pickup_point_id linked
- [ ] address and delivery_date are NULL

---

#### Test 4.2: Order with Courier Delivery
```bash
curl -X POST \
  'http://localhost:3000/api/orders' \
  -H 'Content-Type: application/json' \
  -d '{
    "telegram_id": 987654321,
    "items": [
      {
        "product_id": "uuid",
        "quantity": 1,
        "price": 299,
        "name": "Product"
      }
    ],
    "delivery_method": "courier",
    "address": "г. Москва, ул. Ленина, д. 5, кв. 10",
    "delivery_date": "2024-01-15"
  }'
```

**Expected Response (201):**
```json
{
  "order_id": "uuid",
  "status": "pending",
  "message": "Инвойс отправлен. Ожидайте оплаты."
}
```

**Database Verification:**
```sql
SELECT delivery_method, pickup_point_id, address, delivery_date
FROM orders WHERE id = '<order_id>';
-- Should show: delivery_method='courier', pickup_point_id=NULL,
-- address='...', delivery_date='2024-01-15'
```

---

#### Test 4.3: Invalid Pickup Point
```bash
curl -X POST \
  'http://localhost:3000/api/orders' \
  -H 'Content-Type: application/json' \
  -d '{
    "telegram_id": 987654321,
    "items": [...],
    "delivery_method": "pickup",
    "pickup_point_id": "nonexistent-uuid"
  }'
```

**Expected Response (404):**
```json
{
  "error": "Pickup point not found or is inactive"
}
```

---

#### Test 4.4: Invalid Courier Address
```bash
curl -X POST \
  'http://localhost:3000/api/orders' \
  -H 'Content-Type: application/json' \
  -d '{
    "telegram_id": 987654321,
    "items": [...],
    "delivery_method": "courier",
    "address": "short",
    "delivery_date": "2024-01-15"
  }'
```

**Expected Response (400):**
```json
{
  "error": "Address must be at least 10 characters for courier delivery"
}
```

---

#### Test 4.5: Invalid Delivery Date
```bash
curl -X POST \
  'http://localhost:3000/api/orders' \
  -H 'Content-Type: application/json' \
  -d '{
    "telegram_id": 987654321,
    "items": [...],
    "delivery_method": "courier",
    "address": "г. Москва, ул. Ленина, д. 5, кв. 10",
    "delivery_date": "2024-01-01"
  }'
```

**Expected Response (400):**
```json
{
  "error": "Delivery date must be at least tomorrow"
}
```

---

### 5. Authentication & Authorization Tests

#### Test 5.1: Admin Only Endpoint - No Auth
```bash
curl -X GET 'http://localhost:3000/api/admin/pickup-points'
# No X-Telegram-Id header
```

**Expected Response (401):**
```json
{
  "error": "Unauthorized",
  "message": "Не найдена информация о пользователе"
}
```

---

#### Test 5.2: Admin Only Endpoint - Buyer Role
```bash
curl -X GET \
  'http://localhost:3000/api/admin/pickup-points' \
  -H 'X-Telegram-Id: 987654321'
# User has 'buyer' role, not 'admin'
```

**Expected Response (403):**
```json
{
  "error": "Forbidden",
  "message": "Недостаточно прав. Требуемые роли: admin"
}
```

---

#### Test 5.3: Customer Endpoint - No Auth
```bash
curl -X GET 'http://localhost:3000/api/addresses'
# No X-Telegram-Id header
```

**Expected Response (401):**
```json
{
  "error": "Unauthorized",
  "message": "Не найдена информация о пользователе"
}
```

---

## Database Verification Queries

### Verify Tables Created
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname='public' 
AND tablename IN ('pickup_points', 'addresses');
-- Should return both tables
```

### Verify Indexes
```sql
SELECT indexname FROM pg_indexes 
WHERE schemaname='public' 
AND tablename IN ('pickup_points', 'addresses')
ORDER BY indexname;
-- Should show: idx_addresses_created_at, idx_addresses_is_default,
--   idx_addresses_user_telegram_id, idx_pickup_points_created_at,
--   idx_pickup_points_is_active
```

### Verify Sample Pickup Points
```sql
SELECT COUNT(*) FROM pickup_points WHERE is_active = TRUE;
-- Should return 3
```

### Verify Orders Table Extensions
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('delivery_method', 'pickup_point_id', 'address', 'delivery_date');
-- Should return all 4 columns
```

---

## Regression Testing Checklist

After running all tests, verify:
- [ ] No existing functionality broken
- [ ] All error messages in Russian
- [ ] All timestamps are ISO 8601 format
- [ ] All UUIDs are valid format
- [ ] No SQL injection vulnerabilities
- [ ] No cross-user data access
- [ ] Pagination works correctly
- [ ] Cache headers present on public endpoints
- [ ] Admin logging working
- [ ] Role-based access control enforced
