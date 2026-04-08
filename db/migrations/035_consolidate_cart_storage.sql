-- ============================================================
-- SQL миграция 035: Консолидация систем хранения корзины
-- Файл: db/migrations/035_consolidate_cart_storage.sql
-- Описание: Унификация JSONB и relational cart_items систем
-- ============================================================

-- ⚠️ ПРОБЛЕМА: Существуют две несовместимые системы хранения корзины:
-- 1. Migration 001: cart_items (relational) - user_telegram_id -> product_id
-- 2. Migration 027: carts (JSONB) + cart_items (relational, но другая структура)
-- Решение: Оставляем JSONB систему из миграции 027 (используется в коде)
--          и удаляем старую cart_items из миграции 001

-- 1. Убеждаемся, что таблица carts существует с нужной структурой
ALTER TABLE carts ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- 2. Создаём корректную cart_items таблицу если её нет (на основе миграции 027)
CREATE TABLE IF NOT EXISTS cart_items_v2 (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  cart_id VARCHAR(36) NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity > 0),
  price_at_add DECIMAL(10, 2) NOT NULL,
  is_promo BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cart_id, product_id)
);

-- 3. Создаём индексы для cart_items_v2
CREATE INDEX IF NOT EXISTS idx_cart_items_v2_cart_id ON cart_items_v2(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_v2_product_id ON cart_items_v2(product_id);

-- 4. Удаляем старую cart_items таблицу из миграции 001 (если существует и не используется)
-- ⚠️ ОСТОРОЖНО: Это удаляет данные! Убедиться, что они не используются в production
-- DROP TABLE IF EXISTS cart_items CASCADE;

-- 5. Добавляем индекс на carts таблицу для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_carts_user_telegram_id ON carts(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_carts_status ON carts(status) WHERE status != 'converted';
CREATE INDEX IF NOT EXISTS idx_carts_updated_at ON carts(updated_at DESC);

-- 6. Добавляем функцию для обновления updated_at в carts
CREATE OR REPLACE FUNCTION update_carts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_carts_updated_at ON carts;
CREATE TRIGGER trigger_carts_updated_at
BEFORE UPDATE ON carts
FOR EACH ROW
EXECUTE FUNCTION update_carts_updated_at();

-- 7. ⚠️ ПРИМЕЧАНИЕ: Миграция 001 создавала старую cart_items таблицу
-- которая conflicted с миграцией 027. Рекомендуется в будущем:
-- - Переименовать/удалить старые миграции
-- - Консолидировать нумерацию миграций (010/010b/010c -> 010/011/012)
-- - Использовать только JSONB систему для простоты
