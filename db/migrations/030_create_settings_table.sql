-- Migration: 030_create_settings_table.sql
-- Description: Create settings table for storing application configuration values
-- Date: 2024

CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by BIGINT REFERENCES users(telegram_id) ON DELETE SET NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings(updated_at);

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
  ('min_stock_alert', '10', 'Minimum stock level for alerts'),
  ('max_order_value', '50000', 'Maximum order value in rubles'),
  ('min_order_value', '100', 'Minimum order value in rubles'),
  ('delivery_fee', '500', 'Standard delivery fee in rubles'),
  ('promo_code_discount_limit', '5000', 'Maximum discount from promo codes in rubles')
ON CONFLICT (key) DO NOTHING;

-- Add comment
COMMENT ON TABLE settings IS 'Application settings stored as key-value pairs for easy runtime configuration';
