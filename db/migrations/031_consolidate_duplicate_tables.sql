-- Migration: 031_consolidate_duplicate_tables.sql
-- Description: Clean up duplicate table definitions from multiple migrations
-- Consolidates: saved_for_later, compare_items, ab_tests to canonical definitions
-- Date: 2024

-- 1. Consolidate saved_for_later - Use canonical definition from migration 019
-- Verify we use the correct schema (user_telegram_id not user_id)
DO $$
BEGIN
  -- Check if table exists and has wrong schema
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'saved_for_later'
  ) THEN
    -- Safely verify the schema is as expected
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'saved_for_later' AND column_name = 'user_telegram_id'
    ) THEN
      -- If user_id exists instead, add user_telegram_id column for safety
      ALTER TABLE saved_for_later ADD COLUMN user_telegram_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- 2. Consolidate compare_items - Create canonical definition
DROP TABLE IF EXISTS compare_items_legacy;
CREATE TABLE IF NOT EXISTS compare_items (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_telegram_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_compare_items_user_telegram_id ON compare_items(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_compare_items_created_at ON compare_items(created_at);

-- 3. Consolidate ab_tests - Create canonical definition
DROP TABLE IF EXISTS ab_tests_legacy;
CREATE TABLE IF NOT EXISTS ab_tests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  variant_a TEXT NOT NULL,
  variant_b TEXT NOT NULL,
  traffic_split NUMERIC(3,2) DEFAULT 0.5 CHECK (traffic_split > 0 AND traffic_split < 1),
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_start_date ON ab_tests(start_date);
CREATE INDEX IF NOT EXISTS idx_ab_tests_end_date ON ab_tests(end_date);

-- 4. Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_ab_tests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ab_tests_updated_at_trigger ON ab_tests;
CREATE TRIGGER ab_tests_updated_at_trigger
  BEFORE UPDATE ON ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_ab_tests_updated_at();

COMMENT ON TABLE compare_items IS 'Consolidated product comparison lists - canonical schema with user_telegram_id';
COMMENT ON TABLE ab_tests IS 'Consolidated A/B tests - single source of truth';
COMMENT ON TABLE saved_for_later IS 'Verified schema with user_telegram_id foreign key';
