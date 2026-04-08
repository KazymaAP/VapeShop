-- Migration 017: Add PHASE 3 UX improvements columns
-- Добавляет столбцы для улучшений пользовательского интерфейса

-- Для товаров: рейтинг, отзывы, сравнение
ALTER TABLE products
ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Создаём таблицу сравнения товаров
CREATE TABLE IF NOT EXISTS product_comparison (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id BIGINT NOT NULL,
  product_ids UUID[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_user_comparison UNIQUE(user_telegram_id)
);

-- Для заказов: временная шкала статусов
CREATE TABLE IF NOT EXISTS order_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  description TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_order_status UNIQUE(order_id, status)
);

-- Для доставки: информация о курьере
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS courier_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS courier_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS courier_location VARCHAR(500),
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 8);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating DESC);
CREATE INDEX IF NOT EXISTS idx_product_comparison_user ON product_comparison(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_order_timeline_order ON order_timeline(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_courier ON orders(courier_name) WHERE courier_name IS NOT NULL;

-- История рейтинга товаров
CREATE TABLE IF NOT EXISTS rating_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_telegram_id BIGINT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_user_product_rating UNIQUE(product_id, user_telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_rating_history_product ON rating_history(product_id);
CREATE INDEX IF NOT EXISTS idx_rating_history_user ON rating_history(user_telegram_id);
