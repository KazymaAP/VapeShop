-- Migration: 037_fix_decimal_precision_for_currency.sql
-- Description: Изменяет поля денежных сумм на DECIMAL для избежания ошибок округления и переполнения

-- Таблица orders
ALTER TABLE orders
  ALTER COLUMN total TYPE DECIMAL(12, 2) USING total::DECIMAL(12, 2),
  ALTER COLUMN discount TYPE DECIMAL(10, 2) USING discount::DECIMAL(10, 2);

-- Таблица order_items  
ALTER TABLE order_items
  ALTER COLUMN price TYPE DECIMAL(10, 2) USING price::DECIMAL(10, 2),
  ALTER COLUMN total TYPE DECIMAL(12, 2) USING total::DECIMAL(12, 2);

-- Таблица products
ALTER TABLE products
  ALTER COLUMN price TYPE DECIMAL(10, 2) USING price::DECIMAL(10, 2);

-- Таблица carts (если есть денежные значения)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='carts' AND column_name='total') THEN
    ALTER TABLE carts ALTER COLUMN total TYPE DECIMAL(12, 2) USING total::DECIMAL(12, 2);
  END IF;
END $$;

-- Таблица payments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='amount') THEN
    ALTER TABLE payments ALTER COLUMN amount TYPE DECIMAL(12, 2) USING amount::DECIMAL(12, 2);
  END IF;
END $$;

-- Таблица coupon_codes / promo_codes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupon_codes' AND column_name='discount_amount') THEN
    ALTER TABLE coupon_codes ALTER COLUMN discount_amount TYPE DECIMAL(10, 2) USING discount_amount::DECIMAL(10, 2);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='promo_codes' AND column_name='discount_amount') THEN
    ALTER TABLE promo_codes ALTER COLUMN discount_amount TYPE DECIMAL(10, 2) USING discount_amount::DECIMAL(10, 2);
  END IF;
END $$;

-- Комментарии
COMMENT ON COLUMN orders.total IS 'Order total amount in currency (DECIMAL for precision)';
COMMENT ON COLUMN orders.discount IS 'Discount amount in currency (DECIMAL for precision)';
COMMENT ON COLUMN order_items.price IS 'Item price in currency (DECIMAL for precision)';
COMMENT ON COLUMN products.price IS 'Product price in currency (DECIMAL for precision)';

-- Index для быстрого поиска по цене (полезно для фильтрации диапазонов)
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_order_items_price ON order_items(price);
