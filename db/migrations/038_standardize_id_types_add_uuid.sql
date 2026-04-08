-- Migration: 038_standardize_id_types_add_uuid.sql
-- Description: Стандартизирует типы ID - добавляет UUID поддержку, готовит к миграции на UUID везде

-- Включить расширение для UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Для таблиц которые сейчас используют SERIAL, добавляем UUID столбец
-- Это позволит постепенно мигрировать
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS uuid UUID UNIQUE DEFAULT gen_random_uuid();

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS uuid UUID UNIQUE DEFAULT gen_random_uuid();

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS uuid UUID UNIQUE DEFAULT gen_random_uuid();

-- Миграция заказов на непротиворечивый формат
-- Заказы обычно используют UUID, это правильно
ALTER TABLE orders
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Для других таблиц которые могут использовать SERIAL
ALTER TABLE carts
  ADD COLUMN IF NOT EXISTS uuid UUID UNIQUE DEFAULT gen_random_uuid();

-- Создаём индексы для новых UUID столбцов
CREATE INDEX IF NOT EXISTS idx_products_uuid ON products(uuid);
CREATE INDEX IF NOT EXISTS idx_categories_uuid ON categories(uuid);
CREATE INDEX IF NOT EXISTS idx_brands_uuid ON brands(uuid);
CREATE INDEX IF NOT EXISTS idx_carts_uuid ON carts(uuid);

-- Комментарий о миграции
COMMENT ON COLUMN products.uuid IS 'UUID identifier for future migration - will eventually become the primary key';
COMMENT ON COLUMN categories.uuid IS 'UUID identifier for future migration - will eventually become the primary key';
COMMENT ON COLUMN brands.uuid IS 'UUID identifier for future migration - will eventually become the primary key';

-- Пока оставляем старые numeric ID как primary keys, чтобы не сломать существующие foreign keys
-- В будущей миграции переключимся на UUID как primary key

-- Гарантируем что все user_telegram_id консистентны во всех таблицах
-- использующих ссылки на пользователей
DO $$
BEGIN
  -- Проверяем существование и тип столбцов в разных таблицах
  -- Все они должны быть BIGINT для согласованности
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='user_telegram_id') THEN
    ALTER TABLE orders ALTER COLUMN user_telegram_id TYPE BIGINT USING user_telegram_id::BIGINT;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='carts' AND column_name='user_telegram_id') THEN
    ALTER TABLE carts ALTER COLUMN user_telegram_id TYPE BIGINT USING user_telegram_id::BIGINT;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='saved_for_later' AND column_name='user_telegram_id') THEN
    ALTER TABLE saved_for_later ALTER COLUMN user_telegram_id TYPE BIGINT USING user_telegram_id::BIGINT;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_reviews' AND column_name='user_telegram_id') THEN
    ALTER TABLE product_reviews ALTER COLUMN user_telegram_id TYPE BIGINT USING user_telegram_id::BIGINT;
  END IF;
END $$;

-- План миграции на UUID в будущем:
-- 1. Создать новые таблицы с UUID primary keys
-- 2. Мигрировать данные с преобразованием ID
-- 3. Обновить все foreign keys на новые таблицы
-- 4. Удалить старые таблицы
-- Это минимизирует риск данных и downtime
