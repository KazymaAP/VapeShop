-- Migration: Add missing indexes and optimization
-- Purpose: Improve query performance

-- Индекс для часто используемого запроса user заказов
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_telegram_id, status, created_at DESC);

-- Индекс для tracking
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id, changed_at DESC);

-- Индекс для chat сообщений
CREATE INDEX IF NOT EXISTS idx_chat_messages_order_id ON chat_messages(order_id, created_at ASC);

-- Индекс для заметок менеджерa
CREATE INDEX IF NOT EXISTS idx_manager_notes_history_order_id ON manager_notes_history(order_id, created_at DESC);

-- Индекс для адресов доставки
CREATE INDEX IF NOT EXISTS idx_addresses_user_default ON addresses(user_telegram_id, is_default DESC);

-- Индекс для сравнения товаров
CREATE INDEX IF NOT EXISTS idx_product_comparisons_user ON product_comparisons(user_telegram_id, created_at DESC);

-- Индекс для брошенных корзин
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_user ON abandoned_carts(user_telegram_id, abandoned_at DESC);

-- Индекс для уведомлений
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_telegram_id, is_read, created_at DESC);

-- Индекс для FAQоказ
CREATE INDEX IF NOT EXISTS idx_faq_sort ON faq(sort_order, id);

-- Оптимизация для FOREIGN KEYS (если есть)
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id) WHERE is_active = true;

-- Коли это не требуется (много индексов замедляет INSERT/UPDATE):
-- Раскомментируй, если в базе более миллиона заказов

-- CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);

COMMENT ON INDEX idx_orders_user_status IS 'Custom index for user orders with status filtering';
