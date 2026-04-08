-- Migration 010: Role Improvements Part 1 - Core Tables, New Roles, Audit System
-- Date: 2026-04-03
-- Description: Add super_admin role, courier role, support role + audit_log + promotions + gift_certificates + product_history

BEGIN TRANSACTION;

-- ===== 1. UPDATE USERS TABLE: Add new roles =====
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'customer',
ADD COLUMN IF NOT EXISTS balance DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_updated_at TIMESTAMP DEFAULT NOW();

-- Ensure super_admin and support roles can exist (already supports custom roles)
-- Update existing manager/admin/seller to proper roles if needed
UPDATE users SET role = 'admin' WHERE role = 'admin' OR role IS NULL;

-- Create enum for roles (optional, for documentation)
-- ALTER TYPE user_roles RENAME TO user_roles_old;
-- CREATE TYPE user_roles AS ENUM ('customer', 'manager', 'admin', 'seller', 'super_admin', 'courier', 'support');
-- ALTER TABLE users ALTER COLUMN role TYPE user_roles USING role::user_roles;
-- DROP TYPE user_roles_old;

CREATE INDEX idx_users_balance ON users(balance) WHERE balance > 0;
CREATE INDEX idx_users_role ON users(role);

-- ===== 2. AUDIT LOG TABLE: Track all admin actions =====
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'export', 'login', etc.
    target_type VARCHAR(50) NOT NULL, -- 'product', 'user', 'order', 'promotion', etc.
    target_id BIGINT,
    target_name VARCHAR(255),
    details JSONB DEFAULT '{}', -- {old_value, new_value, reason, etc.}
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'success', -- 'success', 'failed', 'partial'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_target_type ON audit_log(target_type);

-- Auto-cleanup: keep only last 1 year of logs
-- SELECT cron.schedule('cleanup_audit_logs', '0 2 * * *', 'DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL ''1 year''');

-- ===== 3. PROMOTIONS TABLE: Schedule sales and discounts =====
CREATE TABLE IF NOT EXISTS promotions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'discount_percent', 'discount_fixed', 'cashback', 'gift', 'free_shipping'
    value DECIMAL(10, 2) NOT NULL, -- e.g., 20 (for 20%), 500 (for 500 rubles), etc.
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_archived BOOLEAN DEFAULT false,
    applicable_categories TEXT[], -- array of category IDs
    applicable_products TEXT[], -- array of product IDs
    applicable_brands TEXT[], -- array of brand IDs
    excluded_products TEXT[], -- exclude specific products
    minimum_purchase DECIMAL(10, 2) DEFAULT 0, -- minimum cart value to apply
    maximum_discount DECIMAL(10, 2), -- cap on discount (optional)
    usage_limit BIGINT, -- max number of uses
    usage_count BIGINT DEFAULT 0,
    promo_code VARCHAR(50), -- optional: require this code
    active_days TEXT DEFAULT 'MON,TUE,WED,THU,FRI,SAT,SUN', -- days of week
    active_hours TEXT DEFAULT '00:00-23:59', -- time range HH:MM-HH:MM
    created_by BIGINT REFERENCES users(telegram_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_promotions_is_active ON promotions(is_active);
CREATE INDEX idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX idx_promotions_promo_code ON promotions(promo_code);

-- Auto-update active status based on dates
CREATE OR REPLACE FUNCTION update_promotion_active_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE promotions 
    SET is_active = (NOW() BETWEEN start_date AND end_date)
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_promotion_active_status
AFTER INSERT ON promotions
FOR EACH ROW
EXECUTE FUNCTION update_promotion_active_status();

-- ===== 4. GIFT CERTIFICATES TABLE: Digital gift cards =====
CREATE TABLE IF NOT EXISTS gift_certificates (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    balance DECIMAL(10, 2) NOT NULL, -- remaining balance
    created_by BIGINT REFERENCES users(telegram_id),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    recipient_telegram_id BIGINT REFERENCES users(telegram_id) ON DELETE SET NULL,
    used_by_telegram_id BIGINT REFERENCES users(telegram_id) ON DELETE SET NULL,
    used_at TIMESTAMP,
    used_in_order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
    notes TEXT
);

CREATE INDEX idx_gift_certificates_code ON gift_certificates(code);
CREATE INDEX idx_gift_certificates_recipient ON gift_certificates(recipient_telegram_id);
CREATE INDEX idx_gift_certificates_active ON gift_certificates(is_active);
CREATE INDEX idx_gift_certificates_expires_at ON gift_certificates(expires_at);

-- ===== 5. PRODUCT HISTORY TABLE: Track product changes =====
CREATE TABLE IF NOT EXISTS product_history (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    changed_by BIGINT REFERENCES users(telegram_id),
    change_type VARCHAR(50), -- 'price_change', 'stock_update', 'status_change', 'image_update', 'details_update'
    old_values JSONB, -- {price, stock, name, etc.}
    new_values JSONB,
    reason TEXT, -- why was it changed
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_product_history_product_id ON product_history(product_id);
CREATE INDEX idx_product_history_created_at ON product_history(created_at DESC);
CREATE INDEX idx_product_history_changed_by ON product_history(changed_by);

-- ===== 6. UPDATE ORDERS TABLE: Add manager notes and timestamps =====
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS manager_notes TEXT,
ADD COLUMN IF NOT EXISTS manager_notes_updated_by BIGINT REFERENCES users(telegram_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS manager_notes_updated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP, -- when admin confirmed
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP, -- when shipped
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP, -- when delivered
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP, -- when rejected
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX idx_orders_manager_notes_updated_at ON orders(manager_notes_updated_at);
CREATE INDEX idx_orders_confirmed_at ON orders(confirmed_at);

-- ===== 7. UPDATE PRODUCTS TABLE: Add pricing history fields =====
ALTER TABLE products
ADD COLUMN IF NOT EXISTS old_price DECIMAL(10, 2), -- for showing strikethrough price
ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5, 2) DEFAULT 0, -- 0-100%
ADD COLUMN IF NOT EXISTS is_hit BOOLEAN DEFAULT false, -- mark as bestseller
ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false, -- mark as new arrival
ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS views_count BIGINT DEFAULT 0, -- track popularity
ADD COLUMN IF NOT EXISTS purchases_count BIGINT DEFAULT 0;

CREATE INDEX idx_products_is_hit ON products(is_hit);
CREATE INDEX idx_products_is_new ON products(is_new);
CREATE INDEX idx_products_discount_percent ON products(discount_percent) WHERE discount_percent > 0;
CREATE INDEX idx_products_price_updated_at ON products(price_updated_at);

-- Auto-calculate discount_percent when old_price is set
CREATE OR REPLACE FUNCTION calculate_discount_percent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.old_price IS NOT NULL AND NEW.old_price > 0 THEN
        NEW.discount_percent := ROUND(((NEW.old_price - NEW.price) / NEW.old_price * 100)::numeric, 2);
    ELSE
        NEW.discount_percent := 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_discount_percent
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION calculate_discount_percent();

-- ===== 8. CREATE MANAGER_NOTES_HISTORY TABLE: Track comment edits =====
CREATE TABLE IF NOT EXISTS manager_notes_history (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    note_content TEXT NOT NULL,
    created_by BIGINT REFERENCES users(telegram_id),
    created_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_manager_notes_history_order_id ON manager_notes_history(order_id);
CREATE INDEX idx_manager_notes_history_created_by ON manager_notes_history(created_by);
CREATE INDEX idx_manager_notes_history_created_at ON manager_notes_history(created_at DESC);

-- ===== 9. CREATE TEMPLATE_RESPONSES TABLE: Quick reply templates =====
CREATE TABLE IF NOT EXISTS template_responses (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50), -- 'delivery', 'product', 'payment', 'complaint', 'general'
    is_active BOOLEAN DEFAULT true,
    usage_count BIGINT DEFAULT 0,
    created_by BIGINT REFERENCES users(telegram_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_template_responses_category ON template_responses(category);
CREATE INDEX idx_template_responses_active ON template_responses(is_active);

-- Seed default templates
INSERT INTO template_responses (title, content, category) VALUES
    ('Заказ подтвержден', 'Ваш заказ подтвержден. Вскоре он будет отправлен на склад.', 'general'),
    ('Отправлен', 'Ваш заказ отправлен в пути. Ожидаемое время доставки: 1-3 дня.', 'delivery'),
    ('Требуется уточнение', 'Уточните, пожалуйста, адрес доставки или способ доставки.', 'delivery'),
    ('Товар закончился', 'К сожалению, выбранный товар закончился. Предлагаем альтернативу.', 'product'),
    ('Проблема с платежом', 'Не удалось обработать платёж. Попробуйте позже или используйте другой способ.', 'payment')
ON CONFLICT DO NOTHING;

-- ===== 10. CREATE RBAC TABLES: Role-based access control =====
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- 'super_admin', 'admin', 'manager', 'support', 'courier', 'customer'
    description TEXT,
    is_system_role BOOLEAN DEFAULT false, -- can't be deleted if true
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id BIGSERIAL PRIMARY KEY,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL, -- 'products:read', 'products:write', 'users:delete', 'orders:export', etc.
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(role_id, permission)
);

-- Seed system roles
INSERT INTO roles (name, description, is_system_role) VALUES
    ('super_admin', 'Super Administrator - Full access', true),
    ('admin', 'Administrator - Manage products, orders, users', true),
    ('manager', 'Order Manager - Manage orders, customers', true),
    ('support', 'Support Agent - Help customers, manage tickets', true),
    ('courier', 'Courier - Deliver orders', true),
    ('customer', 'Customer - Browse and purchase', true)
ON CONFLICT DO NOTHING;

-- Seed super_admin permissions
INSERT INTO role_permissions (role_id, permission)
SELECT r.id, perm FROM roles r, 
UNNEST(ARRAY[
    'users:read', 'users:write', 'users:delete',
    'products:read', 'products:write', 'products:delete',
    'orders:read', 'orders:write', 'orders:delete',
    'audit:read', 'audit:export',
    'roles:read', 'roles:write', 'roles:delete',
    'promotions:read', 'promotions:write', 'promotions:delete',
    'analytics:read'
]) perm
WHERE r.name = 'super_admin'
AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission = perm)
ON CONFLICT DO NOTHING;

-- Seed admin permissions
INSERT INTO role_permissions (role_id, permission)
SELECT r.id, perm FROM roles r,
UNNEST(ARRAY[
    'products:read', 'products:write', 'products:delete',
    'products:bulk_edit', 'products:clone',
    'orders:read', 'orders:write',
    'orders:export',
    'users:read',
    'reviews:moderate',
    'promotions:read', 'promotions:write',
    'banners:read', 'banners:write',
    'analytics:read',
    'gift_certificates:read', 'gift_certificates:write'
]) perm
WHERE r.name = 'admin'
AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission = perm)
ON CONFLICT DO NOTHING;

-- Seed manager permissions
INSERT INTO role_permissions (role_id, permission)
SELECT r.id, perm FROM roles r,
UNNEST(ARRAY[
    'orders:read', 'orders:write',
    'orders:notes', 'orders:export_for_delivery',
    'users:read',
    'products:read',
    'template_responses:read', 'template_responses:use',
    'chat:read', 'chat:write'
]) perm
WHERE r.name = 'manager'
AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission = perm)
ON CONFLICT DO NOTHING;

-- Seed support permissions
INSERT INTO role_permissions (role_id, permission)
SELECT r.id, perm FROM roles r,
UNNEST(ARRAY[
    'users:read', 'users:search',
    'orders:read', 'orders:write_limited',
    'support_tickets:read', 'support_tickets:write',
    'template_responses:read', 'template_responses:use',
    'promotions:read',
    'chat:read', 'chat:write'
]) perm
WHERE r.name = 'support'
AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission = perm)
ON CONFLICT DO NOTHING;

-- Seed courier permissions
INSERT INTO role_permissions (role_id, permission)
SELECT r.id, perm FROM roles r,
UNNEST(ARRAY[
    'courier_deliveries:read',
    'courier_deliveries:update',
    'courier_deliveries:complete',
    'courier_performance:read'
]) perm
WHERE r.name = 'courier'
AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission = perm)
ON CONFLICT DO NOTHING;

-- Seed customer permissions
INSERT INTO role_permissions (role_id, permission)
SELECT r.id, perm FROM roles r,
UNNEST(ARRAY[
    'products:read',
    'orders:read_own',
    'orders:create',
    'cart:read', 'cart:write',
    'reviews:read', 'reviews:write',
    'profile:read', 'profile:write'
]) perm
WHERE r.name = 'customer'
AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission = perm)
ON CONFLICT DO NOTHING;

-- ===== 11. GRANTS FOR LOG FUNCTION =====
-- Function to safely log actions to audit_log
CREATE OR REPLACE FUNCTION log_audit_action(
    p_user_id BIGINT,
    p_action VARCHAR,
    p_target_type VARCHAR,
    p_target_id BIGINT,
    p_target_name VARCHAR,
    p_details JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    v_log_id BIGINT;
BEGIN
    INSERT INTO audit_log (
        user_id, action, target_type, target_id, target_name, details, ip_address, user_agent, created_at
    ) VALUES (
        p_user_id, p_action, p_target_type, p_target_id, p_target_name, p_details, p_ip_address, p_user_agent, NOW()
    )
    RETURNING id INTO v_log_id;
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- ===== 12. FINAL CHECKS =====
-- Verify new columns
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'users' AND column_name IN ('role', 'balance', 'balance_updated_at');

SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('audit_log', 'promotions', 'gift_certificates', 'product_history', 
                     'manager_notes_history', 'template_responses', 'roles', 'role_permissions');

COMMIT;

-- ===== SUCCESS MESSAGE =====
-- Migration 010 Part 1 completed successfully!
-- Next: Apply migration 010_role_improvements_part2.sql
