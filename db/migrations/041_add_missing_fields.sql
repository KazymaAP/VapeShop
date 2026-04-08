-- Migration 041: Add missing fields to existing tables
-- Purpose: Add fields that are referenced in API but don't exist in schema
-- Date: 2026-04-08

-- ============ PRODUCTS TABLE ============
-- Add missing fields for stock management and metrics
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock_level INT DEFAULT 10;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_alert_sent BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS popularity BIGINT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS views INT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0;

-- ============ ORDERS TABLE ============
-- Add missing fields for order management
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manager_id BIGINT REFERENCES users(telegram_id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manager_rating DECIMAL(2,1);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============ USERS TABLE ============
-- Add missing fields for referral system
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50) UNIQUE;

-- ============ REFERRALS TABLE ============
-- Add soft delete support
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- ============ CREATE order_archive TABLE ============
-- For archiving old completed orders
CREATE TABLE IF NOT EXISTS order_archive (
  id BIGINT PRIMARY KEY,
  code_6digit VARCHAR(10),
  user_telegram_id BIGINT,
  delivery_method VARCHAR(50),
  total DECIMAL(12,2),
  status VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  archived_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_archive_user ON order_archive(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_order_archive_created ON order_archive(created_at);
CREATE INDEX IF NOT EXISTS idx_order_archive_archived ON order_archive(archived_at);

-- ============ CREATE order_timeline TABLE ============
-- For tracking order status changes
CREATE TABLE IF NOT EXISTS order_timeline (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(50),
  description TEXT,
  location VARCHAR(255),
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_timeline_order ON order_timeline(order_id);
CREATE INDEX IF NOT EXISTS idx_order_timeline_timestamp ON order_timeline(timestamp);

-- ============ CREATE notification_settings TABLE ============
-- For user notification preferences
CREATE TABLE IF NOT EXISTS notification_settings (
  event_type VARCHAR(100) PRIMARY KEY,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ CREATE settings TABLE ============
-- For global application settings
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ CREATE abandoned_carts TABLE ============
-- For tracking abandoned shopping carts (legacy)
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id BIGSERIAL PRIMARY KEY,
  user_telegram_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_user ON abandoned_carts(user_telegram_id);

-- ============ CREATE admin_logs TABLE ============
-- For admin action logging (legacy)
CREATE TABLE IF NOT EXISTS admin_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_telegram_id BIGINT REFERENCES users(telegram_id),
  action VARCHAR(100),
  target_type VARCHAR(100),
  target_id BIGINT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_telegram_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at);

-- ============ CREATE price_drop_notifications TABLE ============
-- For tracking price drop notifications
CREATE TABLE IF NOT EXISTS price_drop_notifications (
  id BIGSERIAL PRIMARY KEY,
  user_telegram_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  old_price DECIMAL(12,2),
  new_price DECIMAL(12,2),
  notified BOOLEAN DEFAULT false,
  notified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_drop_notifications_user ON price_drop_notifications(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_price_drop_notifications_notified ON price_drop_notifications(notified);

-- ============ CREATE csv_import_progress TABLE ============
-- For tracking CSV import operations
CREATE TABLE IF NOT EXISTS csv_import_progress (
  id BIGSERIAL PRIMARY KEY,
  admin_telegram_id BIGINT REFERENCES users(telegram_id),
  filename VARCHAR(255),
  total_rows INT,
  processed_rows INT,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csv_import_progress_admin ON csv_import_progress(admin_telegram_id);
CREATE INDEX IF NOT EXISTS idx_csv_import_progress_created ON csv_import_progress(created_at);

-- ============ UPDATE EXISTING AUDIT_LOG ============
-- Ensure audit_log has correct structure
ALTER TABLE audit_log ALTER COLUMN user_telegram_id DROP NOT NULL;
ALTER TABLE audit_log ALTER COLUMN action TYPE VARCHAR(100);
ALTER TABLE audit_log ALTER COLUMN table_name TYPE VARCHAR(100);
ALTER TABLE audit_log ALTER COLUMN details TYPE JSONB USING CASE WHEN details IS NULL THEN NULL::jsonb ELSE details::jsonb END;

-- ============ ADD MISSING SELECT GRANT FOR SEARCH_VECTOR ============
-- Ensure search_vector is populated (from migration 034)
UPDATE products SET search_vector = to_tsvector('russian',
  COALESCE(name, '') || ' ' || COALESCE(specification, '') || ' ' || COALESCE(description, ''))
WHERE search_vector IS NULL OR search_vector = ''::tsvector;
