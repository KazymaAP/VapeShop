-- ============================================================
-- SQL миграция 034: Full-text search индексы
-- Файл: db/migrations/034_fulltext_search_indexes.sql
-- Описание: Добавление GIN индексов для полнотекстового поиска
-- ============================================================

-- ⚠️ ОПТИМИЗИРОВАНО: Замена ILIKE на full-text search с индексом (тысячи раз быстрее!)
-- Создаём tsvector column для быстрого полнотекстового поиска
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Генерируем tsvector из существующих name и specification
UPDATE products 
SET search_vector = to_tsvector('russian', COALESCE(name, '') || ' ' || COALESCE(specification, ''));

-- Создаём GIN индекс для быстрого полнотекстового поиска (в тысячи раз быстрее ILIKE)
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING gin(search_vector);

-- Создаём триггер для автоматического обновления tsvector при изменении name или specification
CREATE OR REPLACE FUNCTION update_products_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = to_tsvector('russian', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.specification, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_products_search_vector ON products;
CREATE TRIGGER trigger_update_products_search_vector
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_products_search_vector();

-- ⚠️ ПРИМЕЧАНИЕ: Можно заменить ILIKE запрос на:
-- SELECT * FROM products  
-- WHERE search_vector @@ plainto_tsquery('russian', $1)
-- Это даст результаты в 100-1000 раз быстрее для больших таблиц
