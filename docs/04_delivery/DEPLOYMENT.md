# Phase P4: Delivery Management - Deployment Guide

## Pre-Deployment Checklist

### Code Review
- [ ] All TypeScript files pass type checking
- [ ] All functions have JSDoc comments
- [ ] No console.log statements except for errors
- [ ] No hardcoded secrets or credentials
- [ ] Error messages in Russian for user-facing errors

### Testing
- [ ] Unit tests pass (if implemented)
- [ ] Integration tests pass (if implemented)
- [ ] Manual API testing completed per TESTING.md
- [ ] Database queries verified in test environment

### Documentation
- [ ] API.md updated with all endpoints
- [ ] IMPLEMENTATION.md describes architecture
- [ ] TESTING.md provides test scenarios
- [ ] DEPLOYMENT.md (this file) includes runbook

---

## Database Migration Steps

### Step 1: Backup Production Database
```bash
# Create backup before migration
pg_dump $NEON_DATABASE_URL > backup_before_p4.sql

# Verify backup size is reasonable
ls -lh backup_before_p4.sql
```

### Step 2: Execute Migration
```bash
# Using psql directly (preferred)
psql $NEON_DATABASE_URL < db/migrations/004_delivery_management.sql

# Or using Node.js/TypeScript
node -e "
const { query } = require('./lib/db');
const fs = require('fs');
const sql = fs.readFileSync('./db/migrations/004_delivery_management.sql', 'utf8');
query(sql).then(() => {
  console.log('Migration successful');
  process.exit(0);
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
"
```

### Step 3: Verify Migration
```bash
# Check tables exist
psql $NEON_DATABASE_URL -c "
SELECT tablename FROM pg_tables 
WHERE schemaname='public' 
AND tablename IN ('pickup_points', 'addresses')
ORDER BY tablename;"

# Check columns in orders table
psql $NEON_DATABASE_URL -c "
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('delivery_method', 'pickup_point_id', 'address', 'delivery_date')
ORDER BY column_name;"

# Check indexes created
psql $NEON_DATABASE_URL -c "
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('pickup_points', 'addresses')
ORDER BY indexname;"

# Verify sample data
psql $NEON_DATABASE_URL -c "
SELECT COUNT(*) as active_points FROM pickup_points 
WHERE is_active = TRUE;"
```

### Step 4: Handle Migration Rollback (if needed)
```bash
# If migration fails, restore from backup
psql $NEON_DATABASE_URL < backup_before_p4.sql

# Verify restoration
psql $NEON_DATABASE_URL -c "
SELECT COUNT(*) FROM pickup_points;"
```

---

## Application Deployment

### Step 1: Build Next.js Application
```bash
# Install dependencies
npm install

# Build production bundle
npm run build

# Verify build succeeded
ls -la .next/

# Check build size
du -sh .next/
```

### Step 2: Type Checking
```bash
# Run TypeScript compiler
npx tsc --noEmit

# Should show no errors
```

### Step 3: Deploy to Hosting
```bash
# Vercel deployment (if using Vercel)
vercel --prod

# Or manual deployment
npm run start
```

### Step 4: Environment Variables
Ensure these are set in production:
```bash
NEON_DATABASE_URL=postgresql://...
TELEGRAM_BOT_TOKEN=...
NODE_ENV=production
```

---

## Post-Deployment Verification

### Step 1: API Endpoint Health Check
```bash
# Test admin pickup points endpoint
curl -X GET \
  'https://your-domain.com/api/admin/pickup-points' \
  -H 'X-Telegram-Id: your_admin_id'

# Test public pickup points endpoint
curl -X GET \
  'https://your-domain.com/api/pickup-points'

# Test customer addresses endpoint
curl -X GET \
  'https://your-domain.com/api/addresses' \
  -H 'X-Telegram-Id: your_buyer_id'
```

### Step 2: Database Connectivity
```bash
# Verify app can connect to database
psql $NEON_DATABASE_URL -c "SELECT 1;"

# Check for connection errors in logs
```

### Step 3: Response Validation
```bash
# Verify response structure and headers
curl -I 'https://your-domain.com/api/pickup-points'

# Should include:
# - HTTP/1.1 200 OK
# - Content-Type: application/json
# - Cache-Control: public, max-age=3600

# Check error responses
curl -X GET 'https://your-domain.com/api/addresses'
# Should return 401 without X-Telegram-Id header
```

### Step 4: Log Monitoring
```bash
# Check application logs for errors
tail -f /var/log/application.log

# Look for any connection errors
grep -i error /var/log/application.log

# Verify admin logs are being created
psql $NEON_DATABASE_URL -c "SELECT COUNT(*) FROM admin_logs;"
```

---

## Configuration Verification

### Step 1: Authentication Middleware
Verify `lib/auth.ts` patterns are followed:
```typescript
export default requireAuth(handler, ['admin']);
export default requireAuth(handler, ['buyer']);
```

### Step 2: Database Connection
Verify `lib/db.ts` uses:
```typescript
import { Pool } from 'pg';
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
```

### Step 3: Error Handling
Verify all endpoints:
- [ ] Return proper HTTP status codes (200, 201, 400, 403, 404, 500)
- [ ] Include error messages in JSON response
- [ ] Use Russian for user-facing messages

---

## Production Runbook

### Daily Operations

#### Monitor Admin Logs
```bash
# Check for unusual admin activity
psql $NEON_DATABASE_URL -c "
SELECT user_telegram_id, action, details, created_at 
FROM admin_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;"
```

#### Check API Performance
```bash
# Query for slow requests (in logs)
grep "Order creation error" /var/log/application.log

# Check database query time
# (Requires query logging enabled)
```

#### Monitor Database Size
```bash
# Check table sizes
psql $NEON_DATABASE_URL -c "
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### Incident Response

#### Order Creation Failing
```bash
# 1. Check error logs
tail -n 100 /var/log/application.log | grep -A 5 "Order creation error"

# 2. Verify database connectivity
psql $NEON_DATABASE_URL -c "SELECT COUNT(*) FROM orders;"

# 3. Check if pickup_points table has active entries
psql $NEON_DATABASE_URL -c "SELECT COUNT(*) FROM pickup_points WHERE is_active = TRUE;"

# 4. Check orders table structure
psql $NEON_DATABASE_URL -d -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('delivery_method', 'pickup_point_id');"
```

#### Address Endpoint Returning 500
```bash
# 1. Check permissions on addresses table
psql $NEON_DATABASE_URL -c "\dt addresses"

# 2. Verify unique constraint exists
psql $NEON_DATABASE_URL -c "
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'addresses' AND constraint_type = 'UNIQUE';"

# 3. Check for full disk (if applicable)
df -h
```

#### Admin Endpoints Unauthorized
```bash
# 1. Verify user role is 'admin'
psql $NEON_DATABASE_URL -c "
SELECT telegram_id, role FROM users WHERE telegram_id = YOUR_ADMIN_ID;"

# 2. Check authentication header being sent
# Use curl -v to see headers

# 3. Check requireAuth middleware in code
```

---

## Scaling Considerations

### Database
- **Pickup Points**: Unlikely to scale (typically <100 locations)
- **Addresses**: Grows with users (~50-100 per active user)
- **Index Strategy**: Already optimized
- **Backup**: Regular backups via Neon

### API Performance
- **Public Endpoint**: 1-hour cache reduces database load
- **Pagination**: Limits response size
- **Connection Pooling**: Via pg.Pool

### Monitoring
- **Error Tracking**: Integrate with Sentry
- **Performance**: Integrate with New Relic or DataDog
- **Logs**: Set up centralized logging (e.g., ELK stack)

---

## Rollback Procedure

If deployment has critical issues:

### Step 1: Identify Issue
```bash
# Check recent error logs
tail -f /var/log/application.log | grep -i error
```

### Step 2: Quick Fix (if possible)
```bash
# If issue is in code:
# 1. Fix the code
# 2. Re-run npm run build
# 3. Restart application
npm run start
```

### Step 3: Rollback to Previous Version
```bash
# If issue is unfixable:
# 1. Deploy previous version from git
git checkout HEAD~1
npm install
npm run build
npm run start

# 2. Alternatively, restore database
psql $NEON_DATABASE_URL < backup_before_p4.sql
```

### Step 4: Analyze Issue
```bash
# After rollback, determine root cause
# - Review error logs
# - Check database state
# - Verify API responses
# Then fix issue in development before re-deployment
```

---

## Version Control

### Tag Release
```bash
git tag -a v4.0.0 -m "Phase P4: Delivery Management"
git push origin v4.0.0
```

### Branch Strategy
```bash
# Work in feature branch
git checkout -b feature/p4-delivery

# After testing, create pull request
# After approval, merge to main
git merge feature/p4-delivery

# Tag release
git tag -a v4.0.0 -m "Phase P4: Delivery Management"
```

---

## Documentation Updates

### Update Main Documentation
- [ ] Add delivery methods to README.md
- [ ] Update API overview with new endpoints
- [ ] Add admin guide for pickup point management
- [ ] Update user guide for address management

### Update Changelog
```markdown
## Version 4.0.0

### Features
- Pickup point management (admin)
- Customer address management (buyers)
- Delivery method validation (pickup vs courier)
- Order delivery integration

### Database
- New tables: pickup_points, addresses
- Enhanced orders table with delivery fields

### API
- POST /api/admin/pickup-points (create)
- PUT /api/admin/pickup-points (update)
- DELETE /api/admin/pickup-points (delete)
- GET /api/addresses (list)
- POST /api/addresses (create)
- PUT /api/addresses (update)
- DELETE /api/addresses (delete)
- GET /api/pickup-points (public list)
- POST /api/orders (enhanced with delivery validation)
```

---

## Performance Benchmarks

Target metrics after deployment:

### Response Times
- GET /api/pickup-points: < 200ms
- GET /api/addresses: < 300ms
- POST /api/addresses: < 500ms
- POST /api/orders: < 1000ms

### Error Rates
- < 1% 4xx errors (validation)
- < 0.1% 5xx errors (server)

### Database
- < 10ms for index queries
- < 100ms for complex queries

---

## Contact & Support

### Issues During Deployment
- Check deployment logs
- Review this runbook
- See TESTING.md for troubleshooting
- See IMPLEMENTATION.md for architecture

### Future Enhancements
- Address validation via postal API
- Delivery cost calculator
- Pickup point schedules
- Courier integration
