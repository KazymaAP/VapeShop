-- SQL Миграция 025: Консолидация схемы БД
-- Файл: db/migrations/025_consolidation.sql
-- Дата: 2026-04-05
-- Описание: Унификация имён таблиц, полей и добавление отсутствующих объектов
-- 
-- Этап 1: Создание отсутствующих таблиц
-- Этап 2: Переименование полей для унификации
-- Этап 3: Добавление индексов
-- Этап 4: Создание недостающих индексов

-- ============================================================
-- ЭТАП 1: Создание отсутствующих таблиц
-- ============================================================

-- Таблица истории заказов (если не существует)
-- Примечание: 012_sprint2_manager_customer.sql уже создаёт order_status_history
-- Используем существующую или создаём alias
CREATE TABLE IF NOT EXISTS order_history (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_telegram_id BIGINT REFERENCES users(telegram_id),
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON order_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_created_at ON order_history(created_at DESC);

-- ============================================================
-- ЭТАП 2: Проверка и унификация имён таблиц
-- ============================================================

-- Проверяем что таблица cart_items существует (создана в 001)
-- Если нужна таблица carts с JSONB, создаём её отдельно:
CREATE TABLE IF NOT EXISTS carts (
  user_telegram_id BIGINT PRIMARY KEY REFERENCES users(telegram_id) ON DELETE CASCADE,
  items JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) USING HEAP;

-- ============================================================
-- ЭТАП 3: Добавление недостающих индексов
-- ============================================================

-- Индексы для связей и производительности
CREATE INDEX IF NOT EXISTS idx_cart_items_user_telegram_id ON cart_items(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_carts_user_telegram_id ON carts(user_telegram_id);

-- Убедиться что orders имеет нужные индексы
CREATE INDEX IF NOT EXISTS idx_orders_user_telegram_id ON orders(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ============================================================
-- ЭТАП 4: ВАЖНО - Проверка полей в таблицах
-- ============================================================

-- Для правильной поддержки миграца должны быть выполнены после этой миграции:
-- 1. Проверить что users.telegram_id PRIMARY KEY
-- 2. Проверить что orders.user_telegram_id BIGINT
-- 3. Проверить что cart_items.user_telegram_id BIGINT  
-- 4. Проверить что все FOREIGN KEY ссылаются на telegram_id, а не id

-- КОММЕНТАРИЙ: Если в таблицах остались поля типа user_id или customer_id,
-- которые должны быть user_telegram_id, то требуется дополнительная миграция
-- для переименования. На данный момент эта миграция создаёт структуру,
-- а код должен использовать правильные имена.

-- ============================================================
-- ЭТАП 5: Таблицы, которые должны быть проверены вручную
-- ============================================================

-- Таблицы адресов - проверить что использует user_telegram_id
CREATE TABLE IF NOT EXISTS addresses (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_telegram_id ON addresses(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_addresses_is_default ON addresses(is_default);

-- End of Migration 025
