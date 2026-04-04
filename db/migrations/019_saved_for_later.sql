-- Миграция 019: Отложенная корзина (Save for later)
-- Позволяет пользователям сохранять товары для позднего просмотра

CREATE TABLE IF NOT EXISTS saved_for_later (
  id BIGSERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1,
  notes TEXT,
  saved_at TIMESTAMP DEFAULT NOW(),
  moved_to_cart_at TIMESTAMP
);

-- Индексы
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_for_later_unique ON saved_for_later(user_telegram_id, product_id);
CREATE INDEX IF NOT EXISTS idx_saved_for_later_user ON saved_for_later(user_telegram_id, saved_at DESC);

-- Функция для переноса товара в корзину
CREATE OR REPLACE FUNCTION move_saved_to_cart(
  p_user_telegram_id BIGINT,
  p_product_id BIGINT,
  p_quantity INT DEFAULT 1
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Добавляем в корзину
  INSERT INTO cart_items (user_telegram_id, product_id, quantity)
  VALUES (p_user_telegram_id, p_product_id, p_quantity)
  ON CONFLICT (user_telegram_id, product_id) DO UPDATE SET
    quantity = cart_items.quantity + p_quantity;
  
  -- Обновляем время переноса
  UPDATE saved_for_later SET moved_to_cart_at = NOW()
  WHERE user_telegram_id = p_user_telegram_id AND product_id = p_product_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;
