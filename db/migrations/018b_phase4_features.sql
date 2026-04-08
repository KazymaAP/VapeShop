-- PHASE 4: Новые таблицы и колонки для функций
-- Миграция 018

-- ===== REFERRAL SYSTEM =====
CREATE TABLE IF NOT EXISTS referral_codes (
  user_telegram_id BIGINT PRIMARY KEY REFERENCES users(telegram_id) ON DELETE CASCADE,
  code VARCHAR(8) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  referred_user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, completed, expired
  bonus_awarded BOOLEAN DEFAULT false,
  bonus_amount INTEGER DEFAULT 0,
  bonus_type VARCHAR(20), -- signup, first_purchase, milestone
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  UNIQUE(referrer_id, referred_user_id)
);

-- ===== USER BALANCE =====
CREATE TABLE IF NOT EXISTS user_balance (
  user_telegram_id BIGINT PRIMARY KEY REFERENCES users(telegram_id) ON DELETE CASCADE,
  balance NUMERIC(10,2) DEFAULT 0,
  bonus_balance NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===== SAVED FOR LATER =====
CREATE TABLE IF NOT EXISTS saved_for_later (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_telegram_id, product_id)
);

-- ===== PRODUCT COMPARISON =====
CREATE TABLE IF NOT EXISTS product_comparison (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  product_ids UUID[] NOT NULL, -- массив ID товаров (макс 4)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_telegram_id)
);

-- ===== ORDER TIMELINE (для трекинга) =====
CREATE TABLE IF NOT EXISTS order_timeline (
  id SERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  location VARCHAR(255),
  courier_id BIGINT REFERENCES users(telegram_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  description TEXT
);

-- ===== DELIVERY OPTIONS =====
CREATE TABLE IF NOT EXISTS delivery_options (
  id SERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- courier, pickup
  address VARCHAR(255),
  store_location VARCHAR(255),
  store_hours VARCHAR(255),
  estimated_delivery DATE,
  cost NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===== CSV IMPORT PROGRESS =====
CREATE TABLE IF NOT EXISTS csv_import_progress (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  filename VARCHAR(255),
  total_rows INTEGER,
  processed_rows INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, failed
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- ===== PRICE DROP NOTIFICATIONS =====
CREATE TABLE IF NOT EXISTS price_drop_notifications (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  original_price NUMERIC(10,2),
  new_price NUMERIC(10,2),
  discount_percent INTEGER,
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  notified_at TIMESTAMP
);

-- ===== ROLE ENHANCEMENTS =====
-- Добавляем новые роли если их нет
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'manager', 'courier', 'support', 'super_admin'));

-- ===== ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ =====
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_saved_for_later_user_id ON saved_for_later(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_product_comparison_user_id ON product_comparison(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_order_timeline_order_id ON order_timeline(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_options_order_id ON delivery_options(order_id);
CREATE INDEX IF NOT EXISTS idx_csv_import_progress_user_id ON csv_import_progress(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_csv_import_progress_status ON csv_import_progress(status);
CREATE INDEX IF NOT EXISTS idx_price_drop_product_id ON price_drop_notifications(product_id);
CREATE INDEX IF NOT EXISTS idx_price_drop_notified ON price_drop_notifications(notified);
CREATE INDEX IF NOT EXISTS idx_user_balance_user_id ON user_balance(user_telegram_id);

-- ===== ОБНОВЛЯЕМ ORDERS ТАБЛИЦУ =====
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(20) DEFAULT 'courier'; -- courier or pickup
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_location VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_id BIGINT REFERENCES users(telegram_id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_orders_courier_id ON orders(courier_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_type ON orders(delivery_type);
