-- Миграция 009: Добавление индексов для оптимизации производительности
-- Дата: 2026-04-03
-- Описание: Индексы на часто используемые поля для быстрых запросов

-- Индексы для пользователей и авторизации
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON users(is_blocked);

-- Индексы для заказов
CREATE INDEX IF NOT EXISTS idx_orders_user_telegram_id ON orders(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at DESC);

-- Индексы для корзины
CREATE INDEX IF NOT EXISTS idx_carts_user_telegram_id ON carts(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_carts_updated_at ON carts(updated_at DESC);

-- Индексы для товаров
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Индексы для адресов
CREATE INDEX IF NOT EXISTS idx_addresses_user_telegram_id ON addresses(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_addresses_is_default ON addresses(is_default);

-- Индексы для избранного (wishlist)
CREATE INDEX IF NOT EXISTS idx_wishlist_user_telegram_id ON wishlist(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON wishlist(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_product ON wishlist(user_telegram_id, product_id);

-- Индексы для отзывов
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_telegram_id ON reviews(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- Индексы для страниц и контента
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_banners_is_active ON banners(is_active);
CREATE INDEX IF NOT EXISTS idx_banners_order_index ON banners(order_index);

-- Индексы для промокодов
CREATE INDEX IF NOT EXISTS idx_promocodes_code ON promocodes(code);
CREATE INDEX IF NOT EXISTS idx_promocodes_valid_from_until ON promocodes(valid_from, valid_until);

-- Индексы для истории
CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON order_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_created_at ON order_history(created_at DESC);

-- Индексы для импорта цен
CREATE INDEX IF NOT EXISTS idx_price_import_is_activated ON price_import(is_activated);
CREATE INDEX IF NOT EXISTS idx_price_import_created_at ON price_import(created_at DESC);

-- Индексы для уведомлений
CREATE INDEX IF NOT EXISTS idx_notification_settings_event_type ON notification_settings(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_history_user_telegram_id ON notification_history(user_telegram_id);

-- Индекс для занятых корзин (abandoned carts)
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_user_telegram_id ON abandoned_carts(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_created_at ON abandoned_carts(created_at DESC);

-- Составные индексы для общих поисков
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- Индексы для избежания N+1 запросов
CREATE INDEX IF NOT EXISTS idx_categories_id ON categories(id);
CREATE INDEX IF NOT EXISTS idx_brands_id ON brands(id);

-- Индекс на точку пикапа
CREATE INDEX IF NOT EXISTS idx_pickup_points_is_active ON pickup_points(is_active);
