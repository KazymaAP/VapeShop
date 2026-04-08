/**
 * 026_critical_indexes.sql
 * Добавляет критические индексы для performance оптимизации (HIGH-005)
 * 
 * Проблема: Отсутствуют индексы на часто используемых полях
 * Решение: Добавить индексы на:
 * - Joins (user_telegram_id, manager_id)
 * - Filters (status, is_activated)
 * - Time-based queries (created_at)
 */

-- Таблица users (основные ключи)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);

-- Таблица orders (частые фильтры и joins)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_telegram_id ON orders(user_telegram_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_manager_id ON orders(manager_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_paid_at ON orders(paid_at);

-- Таблица order_items (joins)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Таблица products (фильтры и поиск)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name ON products(name);

-- Таблица price_import (фильтры)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_import_is_activated ON price_import(is_activated);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_import_created_at ON price_import(created_at DESC);

-- Таблица support_tickets (фильтры и joins)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_telegram_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- Таблица admin_logs (time-based queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_logs_user_telegram_id ON admin_logs(user_telegram_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- Таблица payment_logs (фильтры и joins)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_logs_telegram_id ON payment_logs(telegram_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_logs_order_id ON payment_logs(order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_logs_status ON payment_logs(status);

-- Таблица carts (joins и время)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_carts_user_telegram_id ON carts(user_telegram_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_carts_created_at ON carts(created_at DESC);

-- Таблица saved_for_later (joins)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saved_for_later_user_telegram_id ON saved_for_later(user_telegram_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saved_for_later_product_id ON saved_for_later(product_id);

-- Таблица rating_history (joins и фильтры)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rating_history_product_id ON rating_history(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rating_history_user_telegram_id ON rating_history(user_telegram_id);

-- Таблица product_comparisons (joins)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_comparisons_user_telegram_id ON product_comparisons(user_telegram_id);

-- Таблица promo_codes (фильтры)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promo_codes_is_active ON promo_codes(is_active);

-- Таблица referral_bonuses (joins)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referral_bonuses_user_telegram_id ON referral_bonuses(user_telegram_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referral_bonuses_source_order_id ON referral_bonuses(source_order_id);

-- Таблица courier_deliveries (фильтры и joins)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courier_deliveries_courier_id ON courier_deliveries(courier_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courier_deliveries_order_id ON courier_deliveries(order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courier_deliveries_status ON courier_deliveries(status);

-- Таблица notifications (фильтры)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_telegram_id ON notifications(user_telegram_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Таблица ab_tests (фильтры)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ab_tests_user_telegram_id ON ab_tests(user_telegram_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ab_tests_test_name ON ab_tests(test_name);

-- Таблица pages (фильтры и joins)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pages_is_published ON pages(is_published);

-- Таблица categories (фильтры)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_name ON categories(name);

-- Таблица brands (фильтры)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brands_name ON brands(name);

-- Таблица deliveries (фильтры)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deliveries_user_telegram_id ON deliveries(user_telegram_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deliveries_is_default ON deliveries(is_default);

-- Таблица RBAC tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission);

-- Таблица game_sessions (фильтры)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_sessions_user_telegram_id ON game_sessions(user_telegram_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at DESC);

-- Composite indexes для частых JOIN комбинаций
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_status ON orders(user_telegram_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_manager_status ON orders(manager_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_product ON order_items(order_id, product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_brand ON products(category_id, brand_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_user_status ON support_tickets(user_telegram_id, status);

-- ANALYZE для обновления статистики плана исполнения
ANALYZE;

-- Логируем применение миграции
SELECT 'Migration 026: Critical indexes added' AS status;
