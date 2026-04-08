-- Migration: 036_fix_duplicate_tables_and_add_soft_delete.sql
-- Description: Исправляет дублирующиеся таблицы, добавляет IF NOT EXISTS, и добавляет поля для soft delete

-- Проверим существование таблиц и add IF NOT EXISTS во все CREATE TABLE
-- Таблица products: добавим поля для soft delete
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by BIGINT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deletion_reason VARCHAR(255);

-- Таблица categories: добавим deleted_at
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Таблица audit_log: гарантируем существование с правильной структурой
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT,
  user_telegram_id BIGINT,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  old_data JSONB,
  new_data JSONB,
  details TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Создание индексов для audit_log если их нет
CREATE INDEX IF NOT EXISTS idx_audit_log_user_telegram_id ON audit_log(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- Таблица order_history: гарантируем существование
CREATE TABLE IF NOT EXISTS order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  changed_by BIGINT
);

CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON order_history(order_id);

-- Таблица saved_for_later: гарантируем правильную структуру
CREATE TABLE IF NOT EXISTS saved_for_later (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id BIGINT NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id),
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_telegram_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_for_later_user ON saved_for_later(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_saved_for_later_product ON saved_for_later(product_id);

-- Таблица product_reviews: гарантируем правильную структуру
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_telegram_id BIGINT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  UNIQUE(product_id, user_telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_telegram_id);

-- Гарантируем что products и categories имеют правильные плани foreign keys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_category_id_fkey') THEN
    ALTER TABLE products ADD CONSTRAINT products_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES categories(id);
  END IF;
END $$;

-- Добавим индексы для быстрого фильтрования soft-deleted записей
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_user_telegram_id ON orders(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Комментарии к новым полям
COMMENT ON COLUMN products.deleted_at IS 'Timestamp when product was soft-deleted';
COMMENT ON COLUMN products.deleted_by IS 'Telegram ID of admin who deleted this product';
COMMENT ON COLUMN products.deletion_reason IS 'Reason for soft deletion';

COMMENT ON TABLE audit_log IS 'Audit log for tracking changes to sensitive data';
COMMENT ON TABLE order_history IS 'History of order status changes';
