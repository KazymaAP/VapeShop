-- Миграция 017: Добавить soft delete поддержку для товаров и других сущностей
-- Дата: 2026-04-04

-- Добавить колонку is_active для товаров (если её ещё нет)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Создать индекс для быстрого поиска активных товаров
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);

-- Добавить soft delete для категорий
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- Добавить soft delete для брендов
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_brands_is_active ON brands(is_active);

-- Функция для soft delete товара
CREATE OR REPLACE FUNCTION soft_delete_product(product_id INT)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET is_active = false, deleted_at = NOW()
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;

-- Функция для восстановления товара
CREATE OR REPLACE FUNCTION restore_product(product_id INT)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET is_active = true, deleted_at = NULL
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;

-- Представление для активных товаров (для удобства)
CREATE OR REPLACE VIEW active_products AS
SELECT * FROM products WHERE is_active = true;

-- Представление для удалённых товаров (для администратора)
CREATE OR REPLACE VIEW deleted_products AS
SELECT * FROM products WHERE is_active = false;
