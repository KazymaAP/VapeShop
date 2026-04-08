/**
 * 027_create_carts_table.sql
 * Создает таблицу carts для хранения корзин пользователей (HIGH-015)
 * 
 * Проблема: Корзина хранится в памяти (localStorage), но нужна на сервере
 * Решение: Создать постоянную таблицу carts с товарами
 */

-- Таблица для хранения корзин пользователей
CREATE TABLE IF NOT EXISTS carts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  
  -- Статус корзины: active, abandoned, converted
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'abandoned', 'converted')),
  
  -- Общая информация о корзине
  total_items INT DEFAULT 0,
  total_price DECIMAL(10, 2) DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'XTR',
  
  -- Время
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  abandoned_at TIMESTAMP,
  converted_at TIMESTAMP,
  
  -- Связь с заказом если процесс конвертван
  order_id VARCHAR(36) REFERENCES orders(id) ON DELETE SET NULL
);

-- Таблица для товаров в корзине
CREATE TABLE IF NOT EXISTS cart_items (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  cart_id VARCHAR(36) NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Количество товара
  quantity INT NOT NULL CHECK (quantity > 0),
  
  -- Цена в момент добавления в корзину
  price_at_add DECIMAL(10, 2) NOT NULL,
  
  -- Флаги
  is_promo BOOLEAN DEFAULT FALSE,
  
  -- Время
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_carts_user_telegram_id ON carts(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_carts_status ON carts(status);
CREATE INDEX IF NOT EXISTS idx_carts_created_at ON carts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_carts_abandoned_at ON carts(abandoned_at) WHERE status = 'abandoned';

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_added_at ON cart_items(added_at DESC);

-- Unique constraint для active корзины пользователя
CREATE UNIQUE INDEX IF NOT EXISTS idx_carts_user_active ON carts(user_telegram_id) WHERE status = 'active';

-- Триггер для обновления updated_at в carts
CREATE OR REPLACE FUNCTION update_carts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_carts_timestamp
  BEFORE UPDATE ON carts
  FOR EACH ROW
  EXECUTE FUNCTION update_carts_timestamp();

-- Триггер для обновления updated_at в cart_items
CREATE OR REPLACE FUNCTION update_cart_items_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cart_items_timestamp
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_items_timestamp();

-- Функция для получения или создания активной корзины пользователя
CREATE OR REPLACE FUNCTION get_or_create_user_cart(user_id BIGINT)
RETURNS VARCHAR(36) AS $$
DECLARE
  existing_cart_id VARCHAR(36);
  new_cart_id VARCHAR(36);
BEGIN
  -- Проверяем если уже есть активная корзина
  SELECT id INTO existing_cart_id FROM carts
  WHERE user_telegram_id = user_id AND status = 'active'
  LIMIT 1;
  
  IF existing_cart_id IS NOT NULL THEN
    RETURN existing_cart_id;
  END IF;
  
  -- Создаём новую корзину
  INSERT INTO carts (user_telegram_id, status)
  VALUES (user_id, 'active')
  RETURNING id INTO new_cart_id;
  
  RETURN new_cart_id;
END;
$$ LANGUAGE plpgsql;

-- Функция для добавления товара в корзину
CREATE OR REPLACE FUNCTION add_to_cart(
  p_user_id BIGINT,
  p_product_id VARCHAR(36),
  p_quantity INT
)
RETURNS TABLE(
  success BOOLEAN,
  cart_id VARCHAR(36),
  message TEXT
) AS $$
DECLARE
  v_cart_id VARCHAR(36);
  v_product_price DECIMAL(10, 2);
  v_product_exists BOOLEAN;
BEGIN
  -- Проверяем существование товара
  SELECT EXISTS(SELECT 1 FROM products WHERE id = p_product_id) INTO v_product_exists;
  IF NOT v_product_exists THEN
    RETURN QUERY SELECT FALSE, NULL::VARCHAR(36), 'Product not found'::TEXT;
    RETURN;
  END IF;
  
  -- Получаем или создаём корзину
  SELECT get_or_create_user_cart(p_user_id) INTO v_cart_id;
  
  -- Получаем цену товара
  SELECT price INTO v_product_price FROM products WHERE id = p_product_id;
  
  -- Проверяем если товар уже в корзине
  IF EXISTS(SELECT 1 FROM cart_items WHERE cart_id = v_cart_id AND product_id = p_product_id) THEN
    -- Увеличиваем количество
    UPDATE cart_items
    SET quantity = quantity + p_quantity
    WHERE cart_id = v_cart_id AND product_id = p_product_id;
  ELSE
    -- Добавляем новый товар
    INSERT INTO cart_items (cart_id, product_id, quantity, price_at_add)
    VALUES (v_cart_id, p_product_id, p_quantity, v_product_price);
  END IF;
  
  -- Обновляем итоги корзины
  UPDATE carts
  SET 
    total_items = (SELECT SUM(quantity) FROM cart_items WHERE cart_id = v_cart_id),
    total_price = (SELECT SUM(quantity * price_at_add) FROM cart_items WHERE cart_id = v_cart_id),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = v_cart_id;
  
  RETURN QUERY SELECT TRUE, v_cart_id, 'Added successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Функция для удаления товара из корзины
CREATE OR REPLACE FUNCTION remove_from_cart(p_cart_id VARCHAR(36), p_product_id VARCHAR(36))
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
BEGIN
  DELETE FROM cart_items
  WHERE cart_id = p_cart_id AND product_id = p_product_id;
  
  -- Обновляем итоги корзины
  UPDATE carts
  SET 
    total_items = (SELECT COALESCE(SUM(quantity), 0) FROM cart_items WHERE cart_id = p_cart_id),
    total_price = (SELECT COALESCE(SUM(quantity * price_at_add), 0) FROM cart_items WHERE cart_id = p_cart_id),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_cart_id;
  
  RETURN QUERY SELECT TRUE, 'Removed successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Функция для очистки заброшенных корзин (cron job)
CREATE OR REPLACE FUNCTION mark_abandoned_carts()
RETURNS TABLE(marked_count INT) AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE carts
  SET status = 'abandoned', abandoned_at = CURRENT_TIMESTAMP
  WHERE status = 'active' AND updated_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

-- Логируем применение миграции
SELECT 'Migration 027: Carts table and functions created' AS status;
