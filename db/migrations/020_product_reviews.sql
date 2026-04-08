-- Миграция 020: Система отзывов и рейтинга с кэшбэком
-- Позволяет пользователям оставлять отзывы на товары

CREATE TABLE IF NOT EXISTS product_reviews (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255) NOT NULL,
  text TEXT,
  images_urls TEXT[], -- JSON array of image URLs
  helpful_count INT DEFAULT 0,
  unhelpful_count INT DEFAULT 0,
  cashback_amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Таблица для отслеживания полезных отзывов
CREATE TABLE IF NOT EXISTS review_helpfulness (
  id BIGSERIAL PRIMARY KEY,
  review_id BIGINT NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_reviews_unique ON product_reviews(product_id, user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id, status, rating DESC);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user ON product_reviews(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_review_helpfulness_review ON review_helpfulness(review_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_helpfulness_unique ON review_helpfulness(review_id, user_telegram_id);

-- Функция для обновления рейтинга товара на основе отзывов
CREATE OR REPLACE FUNCTION update_product_rating(p_product_id BIGINT)
RETURNS DECIMAL AS $$
DECLARE
  avg_rating DECIMAL;
  review_count INT;
BEGIN
  SELECT 
    AVG(rating)::DECIMAL,
    COUNT(*)::INT
  INTO avg_rating, review_count
  FROM product_reviews
  WHERE product_id = p_product_id AND status = 'approved';
  
  UPDATE products SET 
    rating = avg_rating,
    review_count = review_count,
    updated_at = NOW()
  WHERE id = p_product_id;
  
  RETURN avg_rating;
END;
$$ LANGUAGE plpgsql;

-- Функция для начисления кэшбэка за отзыв
CREATE OR REPLACE FUNCTION award_review_cashback(
  p_review_id BIGINT,
  p_cashback_amount DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_telegram_id BIGINT;
BEGIN
  SELECT user_telegram_id INTO v_user_telegram_id
  FROM product_reviews
  WHERE id = p_review_id;
  
  -- Начисляем бонус
  PERFORM add_user_bonus(
    v_user_telegram_id,
    p_cashback_amount,
    'Кэшбэк за отзыв'
  );
  
  -- Отмечаем в отзыве
  UPDATE product_reviews SET cashback_amount = p_cashback_amount
  WHERE id = p_review_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Функция для отметки отзыва как полезного
CREATE OR REPLACE FUNCTION mark_review_helpful(
  p_review_id BIGINT,
  p_user_telegram_id BIGINT,
  p_is_helpful BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO review_helpfulness (review_id, user_telegram_id, is_helpful)
  VALUES (p_review_id, p_user_telegram_id, p_is_helpful)
  ON CONFLICT (review_id, user_telegram_id) DO UPDATE SET
    is_helpful = p_is_helpful;
  
  -- Обновляем счётчики
  IF p_is_helpful THEN
    UPDATE product_reviews SET helpful_count = helpful_count + 1
    WHERE id = p_review_id;
  ELSE
    UPDATE product_reviews SET unhelpful_count = unhelpful_count + 1
    WHERE id = p_review_id;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Добавляем колонки к products для рейтинга и счётчика отзывов (если не существуют)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;
