-- SQL миграция для управления доставкой (Phase P4)
-- Файл: db/migrations/004_delivery_management.sql
-- Создание таблиц для управления пунктами выдачи и адресами пользователей

-- 1. Создаём таблицу пунктов выдачи
CREATE TABLE IF NOT EXISTS pickup_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Создаём таблицу адресов пользователей
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id BIGINT NOT NULL,
  address TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
  UNIQUE(user_telegram_id, address)
);

-- 3. Добавляем колонки в таблицу orders, если их ещё нет
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS pickup_point_id UUID,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS delivery_date DATE;

-- 4. Добавляем внешний ключ для pickup_point_id в orders
ALTER TABLE orders
ADD CONSTRAINT IF NOT EXISTS fk_orders_pickup_point_id
FOREIGN KEY (pickup_point_id) REFERENCES pickup_points(id) ON DELETE SET NULL;

-- 5. Создаём индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_pickup_points_is_active ON pickup_points(is_active);
CREATE INDEX IF NOT EXISTS idx_pickup_points_created_at ON pickup_points(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_addresses_user_telegram_id ON addresses(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_addresses_is_default ON addresses(user_telegram_id, is_default);
CREATE INDEX IF NOT EXISTS idx_addresses_created_at ON addresses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_method ON orders(delivery_method);
CREATE INDEX IF NOT EXISTS idx_orders_pickup_point_id ON orders(pickup_point_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);

-- 6. Создаём триггер для автоматического обновления updated_at в pickup_points
CREATE OR REPLACE FUNCTION update_pickup_points_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pickup_points_updated_at ON pickup_points;
CREATE TRIGGER trigger_pickup_points_updated_at
BEFORE UPDATE ON pickup_points
FOR EACH ROW
EXECUTE FUNCTION update_pickup_points_updated_at();

-- 7. Создаём триггер для автоматического обновления updated_at в addresses
CREATE OR REPLACE FUNCTION update_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_addresses_updated_at ON addresses;
CREATE TRIGGER trigger_addresses_updated_at
BEFORE UPDATE ON addresses
FOR EACH ROW
EXECUTE FUNCTION update_addresses_updated_at();

-- 8. Добавляем начальные данные (примеры пунктов выдачи)
INSERT INTO pickup_points (name, address, is_active)
VALUES
  ('Пункт выдачи - Центр', 'г. Москва, ул. Тверская, д. 1', TRUE),
  ('Пункт выдачи - Восток', 'г. Москва, ул. Комсомольская, д. 42', TRUE),
  ('Пункт выдачи - Запад', 'г. Москва, ул. Кутузовский проспект, д. 7', TRUE)
ON CONFLICT DO NOTHING;
