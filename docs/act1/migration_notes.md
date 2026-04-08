# HIGH-012: Database Migrations - Manual Instructions

## Status
✅ **Code Ready** - Migrations created and migration runner script created  
⚠️ **Action Required** - Must execute migrations in production environment

## What Was Done
1. ✅ Created migrations:
   - `db/migrations/036_fix_duplicate_tables_and_add_soft_delete.sql` - Soft delete support
   - `db/migrations/037_fix_decimal_precision_for_currency.sql` - Currency precision
   - `db/migrations/038_standardize_id_types_add_uuid.sql` - UUID standardization

2. ✅ Created migration runner:
   - `scripts/migrate.js` - Node.js migration executor
   - Works with `npm run migrate:prod` command
   - Tracks applied migrations in `schema_migrations` table

## What These Migrations Do
- Create indexes on frequently queried columns (user_telegram_id, product_id, order status)
- Enable soft delete functionality with `deleted_at` columns
- Standardize ID types across tables
- Fix decimal precision for currency fields
- Create audit logging tables

## How to Apply Migrations

### In Development (if local PostgreSQL is available)
```bash
# Create .env file with DATABASE_URL
# DATABASE_URL=postgresql://user:password@localhost:5432/vapeshop

npm run migrate:prod
```

### In Production (Vercel/Cloud)
**IMPORTANT:** Complete migrations BEFORE deploying application code

1. Set DATABASE_URL environment variable in your deployment platform
2. Run from CI/CD pipeline or manual deployment:
```bash
npm run migrate:prod
```

3. Verify migrations applied:
```sql
SELECT * FROM schema_migrations ORDER BY applied_at DESC;
```

Expected output: All 38 migrations listed

## Blocked CRITICAL Issues
These 11 CRITICAL issues are FIXED in code but require these migrations to work:
- SEC-SOFTDEL-001 through SEC-SOFTDEL-011: Soft delete with audit logging
- Pagination with soft delete filtering
- User/product/order audit trails

## Risk Level
🟢 **LOW** - Migrations are:
- Idempotent (CREATE TABLE IF NOT EXISTS used)
- Safe to run multiple times
- Don't delete existing data
- Include rollback information in comments

## Testing After Migration
```bash
# Verify schema_migrations table exists
psql -d vapeshop -c "SELECT * FROM schema_migrations;"

# Verify indexes created
psql -d vapeshop -c "SELECT * FROM pg_indexes WHERE tablename = 'orders';"

# Verify soft delete columns exist
psql -d vapeshop -c "\\d products" | grep deleted_at
```

## Next Steps
1. **Apply migrations** using the procedure above
2. **Verify** all 38 migrations are in schema_migrations table
3. **Deploy** application code (now safe - CRITICAL issues resolved)
4. **Test** soft delete, audit logging, pagination features

## Fallback Plan
If migrations fail:
1. Check `schema_migrations` table to see which migrations failed
2. Review error message in PostgreSQL logs
3. Each migration is independent - can re-run after fixing
4. Review specific migration file for details

---

**Created:** April 7, 2026  
**Migration Runner:** `scripts/migrate.js`  
**Execution Command:** `npm run migrate:prod`
