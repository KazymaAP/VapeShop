-- Миграция 016: Добавление индексов для оптимизации производительности
-- Дата: 2026-04-04
-- Описание: Индексы для часто используемых фильтров и сортировок

-- Индекс для поиска заказов по пользователю
CREATE INDEX IF NOT EXISTS idx_orders_user_telegram_id ON orders(user_telegram_id);

-- Индекс для фильтра по статусу заказа
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Индекс для сортировки по дате создания (обратный порядок)
CREATE INDEX IF NOT EXISTS idx_orders_created_at DESC ON orders(created_at DESC);

-- Индекс для поиска элементов заказа
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Индекс для истории заказов
CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON order_history(order_id);

-- Индекс для активных товаров (soft delete)
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Индекс для поиска товаров по категории
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Индекс для поиска товаров по бренду
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);

-- Индекс для корзины
CREATE INDEX IF NOT EXISTS idx_cart_items_user_telegram_id ON cart_items(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- Индекс для избранного
CREATE INDEX IF NOT EXISTS idx_wishlist_user_telegram_id ON wishlist(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON wishlist(product_id);

-- Индекс для отзывов
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_telegram_id ON reviews(user_telegram_id);

-- Индекс для адресов
CREATE INDEX IF NOT EXISTS idx_addresses_user_telegram_id ON addresses(user_telegram_id);

-- Индекс для лога аудита
CREATE INDEX IF NOT EXISTS idx_audit_log_user_telegram_id ON audit_log(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Индекс для попыток авторизации
CREATE INDEX IF NOT EXISTS idx_auth_attempts_user_telegram_id ON auth_attempts(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_created_at ON auth_attempts(created_at DESC);

-- Индекс для кэша initData (защита от replay attacks)
CREATE INDEX IF NOT EXISTS idx_init_data_cache_user_telegram_id ON init_data_cache(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_init_data_cache_signature ON init_data_cache(signature);
CREATE INDEX IF NOT EXISTS idx_init_data_cache_expired_at ON init_data_cache(expired_at);
