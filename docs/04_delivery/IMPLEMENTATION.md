# Phase P4: Delivery Management - Implementation Guide

## Overview

This document describes the implementation of Phase P4 delivery management functionality for the VapeShop Telegram Mini App.

## Architecture

### Components

#### Database Layer

- **Tables**: `pickup_points`, `addresses`, orders (enhanced)
- **Indexes**: Optimized for user lookups, active status filtering, and date ranges
- **Triggers**: Automatic timestamp updates
- **Constraints**: Unique address per user, foreign key relationships

#### API Layer

- **Admin APIs**: Pickup point CRUD with role-based access control
- **Customer APIs**: Address management with ownership verification
- **Public APIs**: Pickup point listing for cart/checkout
- **Order API**: Enhanced with delivery validation

#### Authentication

- Uses existing `requireAuth` middleware from lib/auth.ts
- Role-based access control: admin, buyer
- Ownership checks on customer endpoints

### File Structure

```
db/migrations/
├── 004_delivery_management.sql      # Database setup

lib/
├── auth.ts                          # Existing auth utilities
├── db.ts                            # Existing database utilities

pages/api/
├── admin/
│   └── pickup-points.ts            # Admin pickup point management
├── addresses.ts                     # Customer address management (updated)
├── orders.ts                        # Order creation (updated)
└── pickup-points.ts                # Public pickup point listing (updated)

docs/04_delivery/
├── API.md                           # API documentation
├── IMPLEMENTATION.md                # This file
├── TESTING.md                       # Testing guide
└── DEPLOYMENT.md                    # Deployment instructions
```

## Implementation Details

### Admin Endpoints: Pickup Point Management

#### File: `pages/api/admin/pickup-points.ts`

**Features:**

- GET: Retrieve all pickup points with pagination
- POST: Create new pickup point with validation
- PUT: Update existing pickup point with change logging
- DELETE: Soft delete (mark as inactive)

**Key Implementation Points:**

```typescript
// Authentication wrapper
export default requireAuth(handler, ['admin']);

// Validation
- Name: non-empty string
- Address: non-empty string
- is_active: boolean flag

// Error Handling
- 400: Invalid input
- 404: Resource not found
- 403: Unauthorized
- 500: Server error

// Logging
- Admin logs created for all mutations
- Change tracking with old/new values
```

**Example Request Flow:**

1. Admin makes PUT request with new data
2. Current values fetched from database
3. Only changed fields included in UPDATE
4. Changes logged to admin_logs table
5. Success response returned

### Customer Endpoints: Address Management

#### File: `pages/api/addresses.ts`

**Features:**

- GET: Retrieve user's addresses (automatically filtered by auth)
- POST: Add new address (first address auto-set as default)
- PUT: Update address or set as default
- DELETE: Remove address (auto-promote if was default)

**Key Implementation Points:**

```typescript
// Authentication
export default requireAuth(handler, ['buyer']);

// Ownership Verification
const telegramId = getTelegramId(req);
// All queries filter by user_telegram_id

// Validation
- Address: minimum 5 characters
- Uniqueness: per user (not globally)
- Default: only one per user

// Smart Defaults
- First address automatically becomes default
- If default deleted, next most recent becomes default
- Can't have user with no default if addresses exist
```

**Edge Cases Handled:**

- Duplicate address per user prevented
- Setting address as default unsets others atomically
- Deletion of default address handles auto-promotion
- Ownership validation prevents cross-user access

### Public Endpoints: Pickup Point Listing

#### File: `pages/api/pickup-points.ts`

**Features:**

- GET: Retrieve active pickup points
- Optional pagination for large lists
- HTTP caching (1 hour)
- No authentication required

**Key Implementation Points:**

```typescript
// Caching
res.setHeader('Cache-Control', 'public, max-age=3600');

// Pagination
- Default: 20 items per page
- Max: 100 items per page
- Includes total count and page info

// Filtering
- Always returns only is_active=true by default
- Optional active parameter allows inactive listings
```

**Performance:**

- Indexed on is_active and name for fast filtering
- Lightweight response suitable for frontend caching
- Cache reduces database load

### Order API: Delivery Integration

#### File: `pages/api/orders.ts`

**Features:**

- Enhanced POST handler for order creation
- Pickup vs courier delivery validation
- Automatic pickup point validation
- Courier address and date validation

**Key Implementation Points:**

```typescript
// Delivery Method Validation
if (delivery_method === 'pickup') {
  // Validate pickup_point_id exists and is_active
} else if (delivery_method === 'courier') {
  // Validate address (min 10 chars)
  // Validate delivery_date >= tomorrow
}

// Order Fields
- delivery_method: 'pickup' | 'courier'
- pickup_point_id: UUID | null
- address: string | null
- delivery_date: date | null

// Validation Helper
isValidDeliveryDate(dateStr): boolean
  // Ensures date is at least tomorrow
```

**Error Responses:**

- 400: Invalid delivery method or missing fields
- 404: Pickup point not found
- 403: User blocked

---

## Database Queries

### Pickup Points

```sql
-- Get all active pickup points
SELECT * FROM pickup_points WHERE is_active = TRUE ORDER BY name;

-- Get with pagination
SELECT * FROM pickup_points WHERE is_active = TRUE
LIMIT 20 OFFSET 0;

-- Update soft-delete
UPDATE pickup_points SET is_active = FALSE WHERE id = $1;
```

### Addresses

```sql
-- Get user's addresses (sorted by default, then recency)
SELECT * FROM addresses WHERE user_telegram_id = $1
ORDER BY is_default DESC, created_at DESC;

-- Check for duplicate
SELECT id FROM addresses
WHERE user_telegram_id = $1 AND address = $2;

-- Set new default
UPDATE addresses SET is_default = FALSE
WHERE user_telegram_id = $1 AND id != $2;

UPDATE addresses SET is_default = TRUE WHERE id = $1;
```

### Orders

```sql
-- Create order with delivery
INSERT INTO orders (
  user_telegram_id, status, total,
  delivery_method, pickup_point_id,
  address, delivery_date,
  promo_code, discount, paid_at
) VALUES (...);
```

---

## Error Handling Strategy

### Validation Layer

1. Check for required fields
2. Type validation (string, UUID, etc.)
3. Length validation (min/max)
4. Business logic validation (date ranges, active status)

### Ownership Layer

1. Extract user ID from auth
2. Query includes WHERE user_telegram_id = $1
3. Return 404 if not found (instead of 403 for security)

### Database Layer

1. Unique constraints prevent duplicates
2. Foreign keys ensure referential integrity
3. Triggers maintain timestamps

### Error Response Format

```json
{
  "error": "Short error code",
  "message": "User-facing message in Russian"
}
```

---

## Security Considerations

### Authentication

- All customer endpoints require buyer role
- All admin endpoints require admin role
- Public endpoints explicitly unauthenticated

### Authorization

- Customer endpoints verify ownership via telegram_id
- Admin actions logged for audit trail
- Soft deletes preserve data history

### Input Sanitization

- All string inputs trimmed
- Length validation prevents oversized inputs
- SQL injection prevented by parameterized queries

### Data Privacy

- Customer addresses only accessible to owner
- Returning 404 instead of 403 prevents user enumeration
- Admin logs track all changes

---

## Testing Checklist

### Unit Tests (to be implemented)

- [ ] Address validation (length, duplicates)
- [ ] Delivery date validation
- [ ] Pickup point active status check
- [ ] Ownership verification

### Integration Tests (to be implemented)

- [ ] Create/read/update/delete addresses
- [ ] Create/read/update/delete pickup points
- [ ] Order with pickup delivery
- [ ] Order with courier delivery
- [ ] Default address handling

### Manual Testing (immediate)

- [ ] Admin can CRUD pickup points
- [ ] Customer can CRUD addresses
- [ ] Public can list active pickup points
- [ ] Order creation validates delivery
- [ ] Cache headers present on public endpoint

### Edge Cases (to be tested)

- [ ] Duplicate address for same user (rejected)
- [ ] Invalid pickup point (rejected)
- [ ] Past delivery date (rejected)
- [ ] Deleted default address (auto-promotes)
- [ ] Cross-user address access (rejected with 404)

---

## Deployment Notes

### Database Migration

```bash
# Run migration against production database
psql $NEON_DATABASE_URL < db/migrations/004_delivery_management.sql

# Verify tables created
psql $NEON_DATABASE_URL -c \
  "SELECT tablename FROM pg_tables WHERE schemaname='public';"
```

### Environment Variables

- Ensure `NEON_DATABASE_URL` is set
- Ensure `TELEGRAM_BOT_TOKEN` is set (for order notifications)
- Ensure `X-Telegram-Id` header is available for testing

### Rollback Plan

If issues arise:

1. Soft deletes don't destroy data - just set flags
2. Migration is idempotent (uses IF NOT EXISTS)
3. Can restore from backup if needed

---

## Performance Optimization

### Current Optimizations

- Indexes on user_telegram_id, is_active, created_at
- Pagination support (20-100 items per page)
- HTTP caching for public pickup points (1 hour)
- Efficient queries (minimal joins, proper WHERE clauses)

### Future Optimizations

- Add Redis caching for frequently accessed addresses
- Batch update operations for default address
- Implement address geocoding for validation
- Add delivery cost calculation based on address

---

## Monitoring and Logging

### Logged Actions

- Admin: create_pickup_point, update_pickup_point, delete_pickup_point
- Customer: Implicit via requireAuth on all protected endpoints
- System: Errors logged to console (can be enhanced with monitoring service)

### Metrics to Track

- Pickup vs courier delivery preference
- Most popular pickup points
- Address management frequency
- API error rates by endpoint

---

## Future Enhancements

### Phase P5+ Considerations

1. **Delivery Cost Calculator**: Estimate cost based on address
2. **Address Validation**: Integrate with postal service API
3. **Pickup Point Schedule**: Add opening hours, closed dates
4. **Tracking**: Send tracking updates to Telegram
5. **Delivery Partner Integration**: Connect with courier services
6. **Address History**: Archive past addresses for quick reorder
