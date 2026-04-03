-- ============================================================
-- SQL миграция 001: Базовая схема VapeShop
-- Файл: db/migrations/001_initial_schema.sql
-- Описание: Создание всех базовых таблиц для системы
-- ============================================================

-- ============================================================
-- 1. Таблица пользователей (Telegram)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  telegram_id BIGINT PRIMARY KEY,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  username VARCHAR(255) UNIQUE,
  role VARCHAR(20) DEFAULT 'customer',
  -- Роли: admin (администратор), manager (менеджер), seller (продавец), customer (покупатель)
  is_blocked BOOLEAN DEFAULT FALSE,
  phone VARCHAR(20),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- ============================================================
-- 2. Таблица категорий товаров
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  icon_emoji VARCHAR(10),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);

-- ============================================================
-- 3. Таблица брендов
-- ============================================================
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  logo_url TEXT,
  website VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);

-- ============================================================
-- 4. Таблица товаров
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  specification TEXT,
  description TEXT,
  stock INT DEFAULT 0,
  price DECIMAL(10, 2) NOT NULL,
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  brand_id INT REFERENCES brands(id) ON DELETE SET NULL,
  images TEXT[] DEFAULT '{}',
  is_promotion BOOLEAN DEFAULT FALSE,
  is_hit BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  views INT DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, specification)
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_promotion ON products(is_promotion);
CREATE INDEX IF NOT EXISTS idx_products_is_hit ON products(is_hit);
CREATE INDEX IF NOT EXISTS idx_products_is_new ON products(is_new);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- ============================================================
-- 5. Таблица корзины пользователя
-- ============================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1,
  price DECIMAL(10, 2),
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_telegram_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items(product_id);

-- ============================================================
-- 6. Таблица импортированных товаров (CSV)
-- ============================================================
CREATE TABLE IF NOT EXISTS price_import (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  specification TEXT,
  stock INT,
  price_tier_1 DECIMAL(10, 2),
  price_tier_2 DECIMAL(10, 2),
  price_tier_3 DECIMAL(10, 2),
  distributor_price DECIMAL(10, 2),
  is_activated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_import_activated ON price_import(is_activated);
CREATE INDEX IF NOT EXISTS idx_price_import_name ON price_import(name);

-- ============================================================
-- 7. Таблица элементов заказа (связь many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id UUID NOT NULL,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1,
  price DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- ============================================================
-- 8. Таблица отзывов и рейтингов
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating INT NOT NULL,
  -- Рейтинг от 1 до 5
  comment TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  -- is_verified = true если покупатель купил товар
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, user_telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_telegram_id ON reviews(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- ============================================================
-- 9. Таблица избранного (wishlist)
-- ============================================================
CREATE TABLE IF NOT EXISTS wishlist (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_telegram_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product ON wishlist(product_id);

-- ============================================================
-- 10. Таблица промокодов (создается в миграции 003, но основная структура здесь)
-- ============================================================
-- CREATE TABLE IF NOT EXISTS promocodes (
--   code VARCHAR(50) PRIMARY KEY,
--   discount_type VARCHAR(20), -- 'percent' или 'fixed'
--   discount_value DECIMAL(10, 2),
--   valid_from TIMESTAMP,
--   valid_until TIMESTAMP,
--   min_order_amount DECIMAL(10, 2),
--   max_uses INT,
--   used_count INT DEFAULT 0,
--   created_at TIMESTAMP DEFAULT NOW(),
--   updated_at TIMESTAMP DEFAULT NOW()
-- );

-- ============================================================
-- 11. Функция для обновления updated_at в пользователях
-- ============================================================
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_users_updated_at();

-- ============================================================
-- 12. Функция для обновления updated_at в категориях
-- ============================================================
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_categories_updated_at ON categories;
CREATE TRIGGER trigger_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION update_categories_updated_at();

-- ============================================================
-- 13. Функция для обновления updated_at в брендах
-- ============================================================
CREATE OR REPLACE FUNCTION update_brands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_brands_updated_at ON brands;
CREATE TRIGGER trigger_brands_updated_at
BEFORE UPDATE ON brands
FOR EACH ROW
EXECUTE FUNCTION update_brands_updated_at();

-- ============================================================
-- 14. Функция для обновления updated_at в товарах
-- ============================================================
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_products_updated_at ON products;
CREATE TRIGGER trigger_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_products_updated_at();

-- ============================================================
-- 15. Функция для обновления рейтинга продукта
-- ============================================================
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET rating = (
    SELECT AVG(rating)::DECIMAL(3, 2)
    FROM reviews
    WHERE product_id = NEW.product_id AND is_verified = true
  )
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_rating ON reviews;
CREATE TRIGGER trigger_update_product_rating
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_rating();

-- ============================================================
-- Справочная информация
-- ============================================================
-- Статусы заказов (в таблице orders из миграции 002):
-- - pending: ожидание оплаты
-- - new: оплачен, ожидает комплектации
-- - confirmed: подтвержден менеджером
-- - readyship: готов к отправке
-- - shipped: отправлен
-- - done: завершён (код проверен)
-- - cancelled: отменён

-- Роли пользователей (в таблице users):
-- - admin: полные права на управление системой
-- - manager: управление заказами, уведомлениями
-- - seller: добавление товаров (не используется в MVP)
-- - customer: стандартный покупатель

-- Типы скидок в промокодах (в таблице promocodes):
-- - percent: процент от сумму (например, 10% = 10)
-- - fixed: фиксированная сумма в рублях (например, 100₽ = 100)
