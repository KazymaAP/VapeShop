-- Migration 010: Role Improvements Part 2 - Customer-facing features
-- Date: 2026-04-03
-- Description: Add referral, saved_for_later, compare_items, user_balance tables

BEGIN TRANSACTION;

-- ===== 1. USER_BALANCE TABLE: Track cashback and bonuses =====
CREATE TABLE IF NOT EXISTS user_balance (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(telegram_id) ON DELETE CASCADE,
    current_balance DECIMAL(10, 2) DEFAULT 0,
    lifetime_earned DECIMAL(10, 2) DEFAULT 0,
    lifetime_spent DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_balance_user_id ON user_balance(user_id);

-- ===== 2. BALANCE_TRANSACTIONS TABLE: Track balance changes =====
CREATE TABLE IF NOT EXISTS balance_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'referral_reward', 'cashback', 'review_bonus', 'purchase', 'refund', 'manual_admin', 'coupon'
    source_order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
    source_referral_id BIGINT,
    description TEXT,
    balance_before DECIMAL(10, 2),
    balance_after DECIMAL(10, 2),
    created_by BIGINT REFERENCES users(telegram_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_balance_transactions_user_id ON balance_transactions(user_id);
CREATE INDEX idx_balance_transactions_type ON balance_transactions(transaction_type);
CREATE INDEX idx_balance_transactions_created_at ON balance_transactions(created_at DESC);
CREATE INDEX idx_balance_transactions_source_order ON balance_transactions(source_order_id);

-- ===== 3. REFERRAL_STATS TABLE: Track referral earnings =====
CREATE TABLE IF NOT EXISTS referral_stats (
    id BIGSERIAL PRIMARY KEY,
    referrer_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    referral_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    referral_code VARCHAR(50),
    invited_at TIMESTAMP DEFAULT NOW(),
    first_purchase_at TIMESTAMP,
    first_purchase_amount DECIMAL(10, 2),
    total_referred_purchases BIGINT DEFAULT 0,
    total_referred_amount DECIMAL(10, 2) DEFAULT 0,
    referrer_reward DECIMAL(10, 2) DEFAULT 0, -- amount earned from this referral
    referral_reward DECIMAL(10, 2) DEFAULT 0, -- discount/reward given to referred user
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_referral_stats_referrer ON referral_stats(referrer_id);
CREATE INDEX idx_referral_stats_referral ON referral_stats(referral_id);
CREATE INDEX idx_referral_stats_first_purchase_at ON referral_stats(first_purchase_at);

-- ===== 4. SAVED_FOR_LATER TABLE: Shopping cart "Save for later" =====
CREATE TABLE IF NOT EXISTS saved_for_later (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INT DEFAULT 1,
    price_when_saved DECIMAL(10, 2), -- price at time of saving
    saved_at TIMESTAMP DEFAULT NOW(),
    moved_to_cart_at TIMESTAMP,
    purchased_at TIMESTAMP
);

CREATE INDEX idx_saved_for_later_user_id ON saved_for_later(user_id);
CREATE INDEX idx_saved_for_later_product_id ON saved_for_later(product_id);
CREATE INDEX idx_saved_for_later_saved_at ON saved_for_later(saved_at DESC);
CREATE UNIQUE INDEX idx_saved_for_later_unique ON saved_for_later(user_id, product_id);

-- ===== 5. COMPARE_ITEMS TABLE: Product comparison feature =====
CREATE TABLE IF NOT EXISTS compare_items (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_compare_items_user_id ON compare_items(user_id);
CREATE INDEX idx_compare_items_added_at ON compare_items(added_at DESC);
CREATE UNIQUE INDEX idx_compare_items_unique ON compare_items(user_id, product_id);

-- Limit to 4 items per user
CREATE OR REPLACE FUNCTION limit_compare_items()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM compare_items 
    WHERE user_id = NEW.user_id 
    AND id NOT IN (
        SELECT id FROM compare_items 
        WHERE user_id = NEW.user_id 
        ORDER BY added_at DESC 
        LIMIT 4
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_limit_compare_items
AFTER INSERT ON compare_items
FOR EACH ROW
EXECUTE FUNCTION limit_compare_items();

-- ===== 6. WISHLIST UPDATES: Add notifications =====
ALTER TABLE wishlist
ADD COLUMN IF NOT EXISTS notify_on_discount BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notify_on_restock BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS price_when_added DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMP;

CREATE INDEX idx_wishlist_notify_on_discount ON wishlist(notify_on_discount);
CREATE INDEX idx_wishlist_notify_on_restock ON wishlist(notify_on_restock);

-- ===== 7. PRODUCT_REVIEWS UPDATES: Add engagement metrics =====
ALTER TABLE product_reviews
ADD COLUMN IF NOT EXISTS helpful_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS unhelpful_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_images BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_video BOOLEAN DEFAULT false;

-- Create table for review images
CREATE TABLE IF NOT EXISTS review_images (
    id BIGSERIAL PRIMARY KEY,
    review_id BIGINT NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_review_images_review_id ON review_images(review_id);

-- ===== 8. REVIEW_HELPFULNESS TABLE: Track review votes =====
CREATE TABLE IF NOT EXISTS review_helpfulness (
    id BIGSERIAL PRIMARY KEY,
    review_id BIGINT NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL, -- true = helpful, false = not helpful
    voted_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(review_id, user_id)
);

CREATE INDEX idx_review_helpfulness_review_id ON review_helpfulness(review_id);
CREATE INDEX idx_review_helpfulness_user_id ON review_helpfulness(user_id);

-- ===== 9. ORDER_RECOMMENDATIONS TABLE: AI-based recommendations =====
CREATE TABLE IF NOT EXISTS order_recommendations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    reason VARCHAR(100), -- 'frequently_bought_together', 'viewed_similar', 'trending', 'new_arrival'
    score DECIMAL(5, 2) DEFAULT 0, -- 0-100 relevance score
    displayed_at TIMESTAMP,
    clicked_at TIMESTAMP,
    purchased_at TIMESTAMP
);

CREATE INDEX idx_order_recommendations_user_id ON order_recommendations(user_id);
CREATE INDEX idx_order_recommendations_product_id ON order_recommendations(product_id);
CREATE INDEX idx_order_recommendations_score ON order_recommendations(score DESC);

-- ===== 10. UPDATE ORDERS TABLE: Add reorder tracking =====
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS is_reorder BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reorder_from_order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS total_items_count INT,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

CREATE INDEX idx_orders_is_reorder ON orders(is_reorder);
CREATE INDEX idx_orders_payment_method ON orders(payment_method);

-- ===== 11. PRODUCT_VIEWS TABLE: Track product popularity =====
CREATE TABLE IF NOT EXISTS product_views (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(telegram_id) ON DELETE SET NULL, -- NULL for anonymous views
    view_source VARCHAR(50), -- 'search', 'category', 'recommendations', 'direct', 'external'
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_product_views_product_id ON product_views(product_id);
CREATE INDEX idx_product_views_user_id ON product_views(user_id);
CREATE INDEX idx_product_views_created_at ON product_views(created_at DESC);

-- Update products table view counter
CREATE OR REPLACE FUNCTION update_product_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products SET views_count = views_count + 1 WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_views
AFTER INSERT ON product_views
FOR EACH ROW
EXECUTE FUNCTION update_product_view_count();

-- ===== 12. FREQUENTLY_BOUGHT_TOGETHER TABLE: Association rules =====
CREATE TABLE IF NOT EXISTS frequently_bought_together (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    associated_product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    buy_together_count INT DEFAULT 1,
    confidence DECIMAL(5, 2), -- percentage of people who bought product_id also bought associated_product_id
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_frequently_bought_together_product ON frequently_bought_together(product_id);
CREATE INDEX idx_frequently_bought_together_confidence ON frequently_bought_together(confidence DESC);

-- ===== 13. CREATE PAYMENT_METHODS TABLE: Track user payment options =====
CREATE TABLE IF NOT EXISTS payment_methods (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    method_type VARCHAR(50) NOT NULL, -- 'telegram_stars', 'card', 'wallet', 'balance'
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    method_data JSONB, -- encrypted payment details
    added_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
);

CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_is_primary ON payment_methods(is_primary);

-- ===== 14. REFERRAL_CODES TABLE: Generate unique referral codes =====
CREATE TABLE IF NOT EXISTS referral_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    reward_type VARCHAR(50), -- 'percent', 'fixed', 'both'
    referrer_reward DECIMAL(10, 2), -- amount referrer gets
    referral_reward DECIMAL(10, 2), -- amount referred user gets
    usage_limit INT,
    usage_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_active ON referral_codes(is_active);

-- Generate unique code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(50) AS $$
DECLARE
    v_code VARCHAR(50);
BEGIN
    LOOP
        v_code := 'REF' || UPPER(substr(md5(random()::text || clock_timestamp()::text), 1, 10));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM referral_codes WHERE code = v_code);
    END LOOP;
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- ===== 15. FINAL VERIFICATION =====
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('user_balance', 'balance_transactions', 'referral_stats', 
                     'saved_for_later', 'compare_items', 'review_images', 
                     'review_helpfulness', 'order_recommendations', 'product_views',
                     'frequently_bought_together', 'payment_methods', 'referral_codes');

COMMIT;

-- ===== SUCCESS MESSAGE =====
-- Migration 010 Part 2 completed successfully!
-- Next: Apply migration 010_role_improvements_part3.sql
