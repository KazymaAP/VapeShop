-- Migration 040: Standardize schema for tables with duplicate definitions
-- Purpose: Handle differences between multiple CREATE TABLE statements for same tables
-- Date: 2026-04-08

-- ============ HANDLE saved_for_later ============
-- Canonical schema: user_telegram_id BIGINT FK, product_id (type from products.id), created_at TIMESTAMP
DO $$ 
BEGIN
  -- Ensure exact column structure for saved_for_later
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_for_later') THEN
    -- Add missing columns if they don't exist
    ALTER TABLE saved_for_later ADD COLUMN IF NOT EXISTS user_telegram_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE;
    ALTER TABLE saved_for_later ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    
    -- Create unique constraint if it doesn't exist
    BEGIN
      ALTER TABLE saved_for_later ADD CONSTRAINT uq_saved_for_later_user_product UNIQUE (user_telegram_id, product_id);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- ============ HANDLE compare_items ============
-- Canonical schema: user_telegram_id BIGINT FK, product_id (matching products.id type)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compare_items') THEN
    ALTER TABLE compare_items ADD COLUMN IF NOT EXISTS user_telegram_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE;
    ALTER TABLE compare_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    
    -- Ensure product_id references products correctly
    BEGIN
      ALTER TABLE compare_items ADD CONSTRAINT fk_compare_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- ============ HANDLE ab_tests ============
-- Canonical schema: name VARCHAR UNIQUE, status VARCHAR, created_at TIMESTAMP
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ab_tests') THEN
    ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS name VARCHAR(255) UNIQUE;
    ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
    ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- ============ HANDLE audit_log ============
-- Canonical schema: user_telegram_id BIGINT, action VARCHAR, table_name VARCHAR, details JSONB, created_at TIMESTAMP
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
    -- Standardize column names
    ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS user_telegram_id BIGINT REFERENCES users(telegram_id) ON DELETE SET NULL;
    ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS action VARCHAR(100);
    ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS table_name VARCHAR(100);
    ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS details JSONB;
    ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    
    -- Drop old column name if exists and create new one
    BEGIN
      ALTER TABLE audit_log DROP COLUMN IF EXISTS record_id CASCADE;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;

-- ============ HANDLE order_history ============
-- Canonical schema: order_id BIGINT FK, user_telegram_id BIGINT FK, old_status, new_status, note, created_at TIMESTAMP
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_history') THEN
    ALTER TABLE order_history ADD COLUMN IF NOT EXISTS order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE;
    ALTER TABLE order_history ADD COLUMN IF NOT EXISTS user_telegram_id BIGINT REFERENCES users(telegram_id) ON DELETE SET NULL;
    ALTER TABLE order_history ADD COLUMN IF NOT EXISTS old_status VARCHAR(50);
    ALTER TABLE order_history ADD COLUMN IF NOT EXISTS new_status VARCHAR(50);
    ALTER TABLE order_history ADD COLUMN IF NOT EXISTS note TEXT;
    ALTER TABLE order_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- ============ HANDLE carts ============
-- Canonical schema: user_telegram_id BIGINT FK, items JSONB (array of {product_id, quantity, price}), updated_at TIMESTAMP
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'carts') THEN
    ALTER TABLE carts ADD COLUMN IF NOT EXISTS user_telegram_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE;
    ALTER TABLE carts ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE carts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    ALTER TABLE carts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    
    -- Ensure unique constraint on user_telegram_id
    BEGIN
      ALTER TABLE carts ADD CONSTRAINT uq_carts_user UNIQUE (user_telegram_id);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- ============ HANDLE cart_items (keep for backward compatibility) ============
-- This table coexists with JSONB-based carts; use whichever is populated
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cart_items') THEN
    ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS user_telegram_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE;
    ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS product_id BIGINT;
    ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1;
    ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS price DECIMAL(12, 2);
    ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- ============ HANDLE referral_codes ============
-- Canonical schema: user_telegram_id BIGINT PK/FK, code VARCHAR(50) UNIQUE, created_at TIMESTAMP
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referral_codes') THEN
    ALTER TABLE referral_codes ADD COLUMN IF NOT EXISTS user_telegram_id BIGINT PRIMARY KEY REFERENCES users(telegram_id) ON DELETE CASCADE;
    ALTER TABLE referral_codes ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE NOT NULL;
    ALTER TABLE referral_codes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- ============ HANDLE addresses ============
-- Ensure address structure is consistent
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'addresses') THEN
    ALTER TABLE addresses ADD COLUMN IF NOT EXISTS user_telegram_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE;
    ALTER TABLE addresses ADD COLUMN IF NOT EXISTS address_line VARCHAR(500);
    ALTER TABLE addresses ADD COLUMN IF NOT EXISTS city VARCHAR(100);
    ALTER TABLE addresses ADD COLUMN IF NOT EXISTS region VARCHAR(100);
    ALTER TABLE addresses ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
    ALTER TABLE addresses ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
    ALTER TABLE addresses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    ALTER TABLE addresses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- ============ CREATE support tables if missing ============
CREATE TABLE IF NOT EXISTS courier_deliveries (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  courier_id BIGINT REFERENCES users(telegram_id),
  estimated_delivery TIMESTAMP,
  tracking_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGSERIAL PRIMARY KEY,
  user_telegram_id BIGINT REFERENCES users(telegram_id),
  subject VARCHAR(255),
  description TEXT,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_ticket_replies (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_telegram_id BIGINT REFERENCES users(telegram_id),
  reply_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  user_telegram_id BIGINT REFERENCES users(telegram_id),
  message_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_for_later_user ON saved_for_later(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_compare_items_user ON compare_items(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_order_history_order ON order_history(order_id);
CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_telegram_id);
