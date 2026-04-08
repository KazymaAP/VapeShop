-- MEDIUM Priority: Missing Database Indexes for Performance
-- This migration adds indexes on frequently queried columns

-- Indexes for Orders table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_telegram_id ON orders(user_telegram_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_deleted_at ON orders(deleted_at) WHERE deleted_at IS NULL;

-- Indexes for Products table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_deleted_at ON products(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Indexes for Carts table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_carts_user_telegram_id ON carts(user_telegram_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_carts_updated_at ON carts(updated_at);

-- Indexes for Payment logs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_logs_order_id ON payment_logs(order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_logs_user_id ON payment_logs(user_telegram_id);

-- Indexes for Referral system
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referral_bonuses_user ON referral_bonuses(user_telegram_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referral_bonuses_referred_by ON referral_bonuses(referred_by);

-- Indexes for Audit logs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_deleted ON products(is_active, deleted_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_product ON order_items(order_id, product_id);
