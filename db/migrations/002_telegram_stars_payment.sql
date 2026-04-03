-- SQL миграция для поддержки платежей Telegram Stars
-- Файл: db/migrations/002_telegram_stars_payment.sql

-- Убедитесь, что в таблице orders есть все необходимые поля
-- Если таблица уже существует, выполните ALTER TABLE для добавления недостающих колонок

-- 1. Если таблица ещё не создана, создайте её со следующей структурой:
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id BIGINT NOT NULL,
  status VARCHAR DEFAULT 'pending', 
  -- Статусы: pending (ожидание оплаты), new (оплачен, ожидает комплектации), 
  -- confirmed (подтвержден), readyship (готов к отправке), shipped (отправлен), 
  -- done (завершён), cancelled (отменён)
  total DECIMAL NOT NULL,
  delivery_method VARCHAR, -- 'pickup' или 'courier'
  delivery_date DATE,
  address TEXT,
  promo_code VARCHAR,
  discount DECIMAL DEFAULT 0,
  paid_at TIMESTAMP, -- Время оплаты
  code_6digit INT, -- 6-значный код для доставки (от 100000 до 999999)
  code_expires_at TIMESTAMP, -- Время истечения кода (24 часа после оплаты)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
);

-- 2. Если таблица уже существует, добавьте недостающие колонки:
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS code_6digit INT,
ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMP;

-- 3. Создайте таблицу для хранения логов платежей (опционально, для отладки)
CREATE TABLE IF NOT EXISTS payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  user_telegram_id BIGINT NOT NULL,
  status VARCHAR, -- 'pending', 'confirmed', 'failed'
  amount INT, -- В звёздах (целое число)
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
);

-- 4. Создайте таблицу для хранения 6-значных кодов (альтернатива, если нужно отдельное хранилище)
CREATE TABLE IF NOT EXISTS delivery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE,
  code_6digit INT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  UNIQUE(code_6digit)
);

-- 5. Создайте индексы для оптимизации запросов:
CREATE INDEX IF NOT EXISTS idx_orders_user_telegram_id ON orders(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_logs_order_id ON payment_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_codes_expires_at ON delivery_codes(expires_at);

-- 6. Создайте триггер для автоматического обновления updated_at:
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
CREATE TRIGGER trigger_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_orders_updated_at();

-- 7. Проверьте, что все поля созданы правильно:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders';
