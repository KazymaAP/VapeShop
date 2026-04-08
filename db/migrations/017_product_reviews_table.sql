-- Migration: Add product_reviews table for reviews functionality
-- Purpose: Store customer reviews and ratings for products

CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  rating NUMERIC(2,1) CHECK (rating >= 1 AND rating <= 5),
  user_name VARCHAR(255),
  user_avatar VARCHAR(512),
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  helpful_count INT DEFAULT 0,
  unhelpful_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraint: один отзыв от пользователя за товар
  UNIQUE(product_id, user_telegram_id)
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id, rating DESC);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_telegram_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(product_id, rating) WHERE rating IS NOT NULL;

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_product_reviews_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_reviews_timestamp_trigger ON product_reviews;
CREATE TRIGGER product_reviews_timestamp_trigger
BEFORE UPDATE ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_reviews_timestamp();

COMMENT ON TABLE product_reviews IS 'Customer reviews and ratings for products';
COMMENT ON COLUMN product_reviews.id IS 'Unique review identifier';
COMMENT ON COLUMN product_reviews.product_id IS 'Product being reviewed';
COMMENT ON COLUMN product_reviews.user_telegram_id IS 'Reviewer telegram ID';
COMMENT ON COLUMN product_reviews.comment IS 'Review text';
COMMENT ON COLUMN product_reviews.rating IS 'Rating from 1 to 5';
COMMENT ON COLUMN product_reviews.is_verified_purchase IS 'Whether reviewer purchased the product';
COMMENT ON COLUMN product_reviews.helpful_count IS 'Number of users who found review helpful';
