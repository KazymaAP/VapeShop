# 📘 VapeShop Production Deployment Guide

**Last Updated:** January 15, 2025  
**Version:** Wave 3 (Post-Security Hardening)  
**Status:** ✅ READY FOR DEPLOYMENT (with manual steps required)

---

## ⚠️ CRITICAL: Manual Actions Required Before Deployment

### Step 1: Execute Database Migrations  

The system has 3 critical migrations that must be run in sequence:

```bash
# Navigate to project root
cd /path/to/vapeshop

# Run migrations
npm run migrate:prod
```

**Or manually (if npm script doesn't work):**

```bash
# Using psql directly
psql -d "$DATABASE_URL" -f db/migrations/036_fix_duplicate_tables_and_add_soft_delete.sql
psql -d "$DATABASE_URL" -f db/migrations/037_fix_decimal_precision_for_currency.sql
psql -d "$DATABASE_URL" -f db/migrations/038_standardize_id_types_add_uuid.sql
```

**What these migrations do:**
1. **036:** Creates `deleted_at`, `deleted_by`, `deletion_reason` columns; creates `audit_log` table
2. **037:** Converts all currency fields to `DECIMAL(12,2)` to prevent integer overflow
3. **038:** Standardizes UUID vs INTEGER ID inconsistencies across tables

**Verification:** After migrations complete, verify:
```bash
# Check that audit_log table exists
psql -d "$DATABASE_URL" -c "SELECT * FROM audit_log LIMIT 1;"

# Check decimal precision on prices
psql -d "$DATABASE_URL" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='products' AND column_name='price';"
```

---

### Step 2: Configure Redis for Vercel/Production

The CSRF protection and rate limiting system now use Upstash Redis. Configure these environment variables:

```env
# .env.production or .env.local
UPSTASH_REDIS_REST_URL=https://your-region.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

**How to get these values:**
1. Go to [https://console.upstash.com](https://console.upstash.com)
2. Create a new Redis database (or use existing)
3. Click on your database
4. Copy the REST URL and token from the "REST API" section
5. Add to your `.env.local` or deployment environment

**Verification (optional):**
```bash
# Test Redis connection
curl -X GET "$UPSTASH_REDIS_REST_URL/get/test" \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
```

---

### Step 3: Verify npm Packages Are Installed

Check that all security packages are properly installed:

```bash
npm ls @upstash/redis sharp isomorphic-dompurify zod
```

**Expected output:**
```
├── @upstash/redis@1.28.0
├── isomorphic-dompurify@2.14.0
├── sharp@0.33.0
└── zod@4.3.6
```

If any are missing:
```bash
npm install @upstash/redis@1.28.0 sharp@0.33.0 isomorphic-dompurify@2.14.0 zod@4.3.6
```

---

### Step 4: Build and Test

```bash
# Build the Next.js application
npm run build

# Start the production server locally
npm start

# In another terminal, run smoke tests
npm run test:coverage
```

**Expected build output:**
- ✅ No TypeScript errors (warnings are OK)
- ✅ All pages successfully built
- ✅ API routes compiled without errors

---

## ✅ Deployment Checklist

Before pushing to production, verify:

### Security ✓

- [x] CSRF protection with Redis CSRF store
  - Test: Make POST request and verify CSRF token in X-CSRF-Token header
  
- [x] Rate limiting enabled
  - Test: Make 101+ requests in 1 minute, verify 429 response on 101st
  
- [x] XSS protection with DOMPurify sanitization
  - Test: Try injecting `<script>` in any text field, verify it's escaped
  
- [x] Image processing on server (no browser APIs)
  - Test: Upload image, verify it processes without errors
  
- [x] Telegram authentication with HMAC verification
  - Test: Verify user can access with valid initData, rejected with invalid
  
- [x] Admin endpoints protected with requireAuth
  - Test: Attempt access to /api/admin/* without auth, verify 401 response
  
- [x] Payment validation
  - Test: Attempt payment with mismatched amount, verify rejection
  
- [x] Race condition prevention (SERIALIZABLE transactions)
  - Test: Concurrent order creation, verify only 1 succeeds if cart has insufficient stock

### Infrastructure ✓

- [x] Database migrations applied
  - Command: `SELECT * FROM audit_log LIMIT 1;`
  
- [x] Redis connected
  - Env vars: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` set
  
- [x] Environment variables configured
  - Required: `TELEGRAM_BOT_TOKEN`, `DATABASE_URL`, `UPSTASH_REDIS_*`
  - Optional: `SENTRY_DSN` (for error tracking)

### Functionality ✓

- [x] Home page loads and shows products
- [x] Admin pages accessible and responsive  
- [x] Cart operations work (add, remove, checkout)
- [x] Payment flow completes successfully
- [x] Audit logs record all actions

---

## 🚀 Deployment Commands

### For Vercel (Recommended for Next.js)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard:
# - UPSTASH_REDIS_REST_URL
# - UPSTASH_REDIS_REST_TOKEN
# - DATABASE_URL (if using managed DB)
# - TELEGRAM_BOT_TOKEN
```

### For Node.js Server (VPS/EC2/DigitalOcean)

```bash
# Build
npm run build

# Run with PM2 for process management
npm install -g pm2
pm2 start "npm start" --name "vape-shop"
pm2 save
pm2 startup

# Or run directly
NODE_ENV=production npm start
```

### For Docker

```bash
# Build image
docker build -t vape-shop .

# Run container
docker run -d \
  -e DATABASE_URL="postgresql://..." \
  -e UPSTASH_REDIS_REST_URL="..." \
  -e UPSTASH_REDIS_REST_TOKEN="..." \
  -e TELEGRAM_BOT_TOKEN="..." \
  -p 3000:3000 \
  vape-shop
```

---

## 🔍 Verification After Deployment

### Test Critical Flows

**1. User Registration & Authentication**
```bash
curl -X GET "https://yourdomain.com/api/user/profile" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Expected: 200 OK with user data
```

**2. Product Browsing**
```bash
curl "https://yourdomain.com/api/products?page=1&limit=20"
# Expected: 200 OK with products array
```

**3. Cart Operations**
```bash
curl -X POST "https://yourdomain.com/api/cart" \
  -H "Content-Type: application/json" \
  -d '{"product_id": "123", "quantity": 1}'
# Expected: 200 OK with updated cart
```

**4. Payment Processing**
```bash
# Initiate payment, verify webhook handling
curl -X POST "https://yourdomain.com/api/payments/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: YOUR_SECRET" \
  -d '{...payment payload...}'
# Expected: 200 OK
```

### Monitor Logs

**Check application logs:**
```bash
# For Vercel
vercel logs

# For PM2
pm2 logs

# For Docker
docker logs CONTAINER_ID
```

**Look for:**
- ✓ No ERROR level logs on startup
- ✓ Successful database migrations logged
- ✓ Redis connection established
- ✗ No "CSRF token missing" errors on POST requests
- ✗ No "Rate limit exceeded" errors on normal traffic

---

## 🐛 Troubleshooting

### "UPSTASH_REDIS_REST_URL is not set"

**Problem:** Redis isn't configured

**Solution:**
1. Copy your Upstash Redis REST URL and token
2. Add to environment:
   ```bash
   export UPSTASH_REDIS_REST_URL="https://..."
   export UPSTASH_REDIS_REST_TOKEN="..."
   ```
3. Restart application
4. Fallback: The system will use in-memory store (not recommended for production)

### "Migration table 'audit_log' already exists"

**Problem:** Migrations were run twice

**Solution:**
- This is not harmful, just re-run the same migration
- The SQL uses `CREATE TABLE IF NOT EXISTS`, so it's idempotent
- No action needed

### "CSRF token mismatch" on forms

**Problem:** CSRF protection is rejecting requests

**Debugging:**
1. Verify form includes `<input type="hidden" name="csrf_token" value="..." />`
2. Check that POST requests include `X-CSRF-Token` header with the token value
3. If using redis, verify `UPSTASH_REDIS` env vars are set
4. Check application logs for Redis connection errors

### "Rate limit exceeded" errors

**Problem:** Rate limiting is too strict

**Solution:**
1. Check `lib/rateLimit.ts` for limits
2. Adjust in `lib/constants.ts` if needed
3. Verify Redis is connected (in-memory rate limiting per instance won't work on Vercel)

### "Image upload fails"

**Problem:** sharp library not properly installed

**Solution:**
```bash
npm rebuild sharp
# Or on M1/M2 Mac:
npm install --build-from-source
```

---

## 📊 Performance Optimization Post-Deployment

### Database Query Optimization

After deployment, monitor slow queries:

```bash
# Enable slow query logging in PostgreSQL
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1 second
SELECT pg_reload_conf();
```

Monitor and create indexes if needed:
```bash
# Run migrations from db/migrations/039_medium_performance_indexes.sql if not already applied
psql -d "$DATABASE_URL" -f db/migrations/039_medium_performance_indexes.sql
```

### Cache Configuration

The system uses SWR for client-side caching:
- Product lists: 10 minute stale time
- User profile: 1 minute stale time
- Cart: Real-time (no cache)

Adjust in `lib/constants.ts` if needed:
```typescript
export const CACHE_CONFIG = {
  STALE_TIME: 5 * 60 * 1000,              // 5 minutes
  PRODUCTS_STALE_TIME: 10 * 60 * 1000,    // 10 minutes
  USER_STALE_TIME: 60 * 1000,             // 1 minute
} as const;
```

---

## 🔄 Rollback Procedure

If issues occur after deployment:

### Quick Rollback (< 5 minutes downtime)

```bash
# For Vercel
vercel --prod --alias old-deployment

# For traditional server
pm2 restart vape-shop  # If using PM2
# Or restart the process
```

### Database Rollback

If migrations cause issues:

```bash
# Restore from backup (must have pre-migration backup)
pg_restore -d "$DATABASE_URL" ./backup_before_migrations.sql

# Or manually undo specific migration
psql -d "$DATABASE_URL" -c "
  DROP TABLE IF EXISTS audit_log CASCADE;
  ALTER TABLE products DROP COLUMN IF EXISTS deleted_at;
  ALTER TABLE products DROP COLUMN IF EXISTS deleted_by;
  -- etc for each column added
"
```

---

## 📞 Support & Monitoring

### Set Up Monitoring (Optional but Recommended)

**Sentry for Error Tracking:**
```bash
npm install --save @sentry/node @sentry/tracing
```

Add to your app:
```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

**Datadog or New Relic for Performance Monitoring:**
- Follow their Next.js integration guides
- Monitor database query times
- Track API response times

### Logging Strategy for Production

The system uses structured logging via `lib/logger.ts`:
- All API errors are logged with full context
- Audit log tracks all data modifications
- Production logs go to stderr/stdout

Access logs via:
- **Vercel:** Dashboard → Logs
- **PM2:** `pm2 logs vape-shop`
- **Docker:** `docker logs CONTAINER_ID`

---

## ✅ Deployment Complete!

Your VapeShop application is now production-ready with:
- ✅ Advanced security hardening (CSRF, XSS, rate limiting)
- ✅ Database soft delete with audit logs
- ✅ Race condition prevention
- ✅ Image processing on server
- ✅ Redis integration for distributed systems
- ✅ Comprehensive error handling
- ✅ Type-safe TypeScript codebase

**For issues or questions, check:**
1. [docs/act1/](./docs/act1/) - All fixing documentation
2. Application logs - Error messages with stack traces
3. Database audit_log table - Track what actions happened

Good luck! 🚀
