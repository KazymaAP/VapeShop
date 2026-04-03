-- SPRINT 2: Manager + Customer Features
-- Таблицы для комментариев, рефереев, отложенных товаров, сравнения

-- 1. История комментариев менеджера
CREATE TABLE IF NOT EXISTS manager_notes_history (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  manager_id BIGINT NOT NULL REFERENCES users(telegram_id),
  note TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_manager_notes_order ON manager_notes_history(order_id);
CREATE INDEX IF NOT EXISTS idx_manager_notes_manager ON manager_notes_history(manager_id);

-- 2. Отложенные товары
CREATE TABLE IF NOT EXISTS saved_for_later (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  saved_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_for_later_user ON saved_for_later(user_id);

-- 3. Сравнение товаров
CREATE TABLE IF NOT EXISTS compare_items (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  product_ids INT[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_compare_items_user ON compare_items(user_id);

-- 4. Статистика рефереров
CREATE TABLE IF NOT EXISTS referral_stats (
  id SERIAL PRIMARY KEY,
  referrer_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  referee_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  bonus_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  order_id INT REFERENCES orders(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'credited'
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_stats_referrer ON referral_stats(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_stats_referee ON referral_stats(referee_id);

-- 5. Шаблонные ответы
CREATE TABLE IF NOT EXISTS template_responses (
  id SERIAL PRIMARY KEY,
  created_by BIGINT NOT NULL REFERENCES users(telegram_id),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100) NOT NULL, -- 'support', 'manager', 'courier'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_template_responses_category ON template_responses(category);

-- 6. Добавить колонку в orders для менеджера
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manager_notes TEXT;

-- 7. Добавить баланс пользователя
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;

-- 8. История баланса
CREATE TABLE IF NOT EXISTS balance_history (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  operation VARCHAR(100), -- 'referral_bonus', 'review_cashback', 'order_discount', 'withdrawal'
  order_id INT REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_balance_history_user ON balance_history(user_id);

-- 9. История статусов заказа (для трекинга)
CREATE TABLE IF NOT EXISTS order_status_history (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by BIGINT REFERENCES users(telegram_id),
  changed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);

-- 10. Ожидаемое время доставки
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expected_delivery_date TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_id BIGINT REFERENCES users(telegram_id);
