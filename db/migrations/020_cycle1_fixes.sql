/**
 * Миграция 020: Критические исправления и оптимизация VapeShop (ЦИКЛ 1)
 * 
 * Изменения:
 * 1. Добавлены индексы на часто используемые колонки
 * 2. Добавлены CONSTRAINT'ы для целостности данных
 * 3. Оптимизация производительности запросов
 * 4. Добавлены недостающие поля для функционала курьеров и поддержки
 */

-- ============== ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ ==============

-- Индексы на order_items для N+1 оптимизации
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Индексы на заказы
CREATE INDEX IF NOT EXISTS idx_orders_user_telegram_id ON orders(user_telegram_id) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Индексы для быстрого поиска товаров
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (name gin_trgm_ops) WHERE is_active = true;

-- Индексы для избранного и сравнения
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_product ON wishlist(user_telegram_id, product_id) UNIQUE;

-- Индексы для отложенных товаров
CREATE INDEX IF NOT EXISTS idx_saved_for_later_user_id ON saved_for_later(user_telegram_id);

-- Индексы для уведомлений
CREATE INDEX IF NOT EXISTS idx_price_drop_notifications_user_id ON price_drop_notifications(user_telegram_id);

-- Индексы для логирования
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- Индексы для рефералов
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);

-- ============== ОПТИМИЗАЦИЯ ДЛЯ ПАГИНАЦИИ ==============

-- Индекс для быстрой пагинации пользователей в админке
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Индекс для быстрой пагинации заказов в админке  
CREATE INDEX IF NOT EXISTS idx_orders_user_status_created ON orders(user_telegram_id, status, created_at DESC);

-- ============== CONSTRAINT'Ы ДЛЯ ЦЕЛОСТНОСТИ ==============

-- Проверяем, что цены не отрицательные
ALTER TABLE products 
  ADD CONSTRAINT check_price_positive CHECK (price > 0);

ALTER TABLE order_items 
  ADD CONSTRAINT check_order_item_price_positive CHECK (price > 0);

ALTER TABLE order_items 
  ADD CONSTRAINT check_order_item_quantity_positive CHECK (quantity > 0);

-- Проверяем, что скидки в пределах 0-100%
ALTER TABLE products 
  ADD CONSTRAINT check_discount_valid CHECK (discount >= 0 AND discount <= 100);

-- ============== ДОБАВЛЕННЫЕ ПОЛЯ ДЛЯ ФУНКЦИОНАЛА ==============

-- Добавляем поле для отслеживания доставки в реальном времени
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_tracking_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_provider VARCHAR(50);

-- Добавляем поля для курьеров
ALTER TABLE users ADD COLUMN IF NOT EXISTS courier_vehicle_type VARCHAR(50) 
  CHECK (courier_vehicle_type IN ('car', 'bike', 'pedestrian', 'other'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS courier_is_available BOOLEAN DEFAULT true;

-- Добавляем таблицу для истории статусов доставки
CREATE TABLE IF NOT EXISTS delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  location JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_tracking_order_id ON delivery_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_timestamp ON delivery_tracking(timestamp DESC);

-- ============== ТАБЛИЦА ДЛЯ ОБНОВЛЕНИЯ ТЕМЫ ==============

-- Таблица для хранения выше указанных настроек пользователя (включая тему)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_telegram_id BIGINT PRIMARY KEY REFERENCES users(telegram_id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'auto')),
  language VARCHAR(10) DEFAULT 'ru',
  notifications_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== ТАБЛИЦА ДЛЯ ХРАНЕНИЯ КЭША ==============

-- Таблица для кэширования часто используемых данных (например, статистика дашборда)
CREATE TABLE IF NOT EXISTS cache_data (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cache_data_expires_at ON cache_data(expires_at);

-- ============== ДОБАВЛЕНИЕ ФУНКЦИЙ И ТРИГГЕРОВ ==============

-- Функция для автоматического удаления истёкших кэшей
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM cache_data WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Функция для обновления updated_at при изменении заказа
CREATE OR REPLACE FUNCTION update_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер на таблице orders для обновления updated_at
DROP TRIGGER IF EXISTS trg_update_order_updated_at ON orders;
CREATE TRIGGER trg_update_order_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_order_updated_at();

-- ============== ПРОВЕРКА ДАННЫХ ==============

-- Удаляем все orphaned entries (заказы без пользователей)
-- DELETE FROM orders WHERE user_telegram_id NOT IN (SELECT telegram_id FROM users);

-- ============== ЗАВЕРШЕНИЕ ==============

-- Вакуумируем таблицы для оптимизации
-- VACUUM ANALYZE;

COMMIT;
