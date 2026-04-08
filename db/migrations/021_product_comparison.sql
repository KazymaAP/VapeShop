-- Миграция 021: Сравнение товаров
-- Позволяет пользователям сравнивать до 4 товаров

CREATE TABLE IF NOT EXISTS product_comparisons (
  id BIGSERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  product_ids BIGINT[] NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_comparisons_user ON product_comparisons(user_telegram_id, created_at DESC);

-- Функция для создания/обновления сравнения
CREATE OR REPLACE FUNCTION save_product_comparison(
  p_user_telegram_id BIGINT,
  p_product_ids BIGINT[],
  p_note TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
  comparison_id BIGINT;
BEGIN
  -- Проверяем максимум 4 товара
  IF ARRAY_LENGTH(p_product_ids, 1) > 4 THEN
    RAISE EXCEPTION 'Maximum 4 products allowed in comparison';
  END IF;
  
  -- Сортируем IDs для консистентности
  INSERT INTO product_comparisons (user_telegram_id, product_ids, note)
  VALUES (p_user_telegram_id, ARRAY_AGG(id ORDER BY id)
    FROM (SELECT UNNEST(p_product_ids) AS id) t, p_note)
  RETURNING id INTO comparison_id;
  
  RETURN comparison_id;
END;
$$ LANGUAGE plpgsql;
