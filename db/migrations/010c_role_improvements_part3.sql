-- Migration 010: Role Improvements Part 3 - Support, Courier, Chat features
-- Date: 2026-04-03
-- Description: Add support_tickets, courier_performance, chat_messages tables

BEGIN TRANSACTION;

-- ===== 1. SUPPORT_TICKETS TABLE: Customer support requests =====
CREATE TABLE IF NOT EXISTS support_tickets (
    id BIGSERIAL PRIMARY KEY,
    ticket_number VARCHAR(20) UNIQUE NOT NULL, -- e.g., "TK-001234"
    user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    related_order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50), -- 'order_issue', 'product_quality', 'delivery_problem', 'payment_issue', 'general_inquiry', 'refund_request'
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'waiting_customer', 'resolved', 'closed'
    assigned_to BIGINT REFERENCES users(telegram_id) ON DELETE SET NULL, -- support agent
    assigned_at TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    resolution_notes TEXT,
    customer_satisfaction_score INT, -- 1-5 after resolution
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_ticket_number ON support_tickets(ticket_number);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);

-- Auto-generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    v_number VARCHAR(20);
BEGIN
    SELECT 'TK-' || LPAD(nextval('support_tickets_id_seq')::text, 6, '0') INTO v_number;
    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_number IS NULL THEN
        NEW.ticket_number := generate_ticket_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_ticket_number
BEFORE INSERT ON support_tickets
FOR EACH ROW
EXECUTE FUNCTION set_ticket_number();

-- ===== 2. SUPPORT_TICKET_REPLIES TABLE: Messages in a ticket =====
CREATE TABLE IF NOT EXISTS support_ticket_replies (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    author_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    attachment_urls TEXT[], -- array of URLs to attached images/files
    is_internal BOOLEAN DEFAULT false, -- internal note (not visible to customer)
    created_at TIMESTAMP DEFAULT NOW(),
    edited_at TIMESTAMP,
    edit_count INT DEFAULT 0
);

CREATE INDEX idx_support_ticket_replies_ticket_id ON support_ticket_replies(ticket_id);
CREATE INDEX idx_support_ticket_replies_author_id ON support_ticket_replies(author_id);
CREATE INDEX idx_support_ticket_replies_created_at ON support_ticket_replies(created_at);

-- ===== 3. SUPPORT_KB TABLE: Knowledge base articles =====
CREATE TABLE IF NOT EXISTS support_kb (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50), -- 'delivery', 'products', 'payment', 'account', 'refunds'
    tags TEXT[],
    is_published BOOLEAN DEFAULT false,
    view_count BIGINT DEFAULT 0,
    helpful_count INT DEFAULT 0,
    unhelpful_count INT DEFAULT 0,
    created_by BIGINT REFERENCES users(telegram_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_support_kb_slug ON support_kb(slug);
CREATE INDEX idx_support_kb_category ON support_kb(category);
CREATE INDEX idx_support_kb_published ON support_kb(is_published);

-- ===== 4. COURIER_DELIVERIES TABLE: Delivery tasks for couriers =====
CREATE TABLE IF NOT EXISTS courier_deliveries (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    courier_id BIGINT REFERENCES users(telegram_id) ON DELETE SET NULL, -- can be null if unassigned
    assigned_at TIMESTAMP,
    assigned_by BIGINT REFERENCES users(telegram_id) ON DELETE SET NULL, -- manager who assigned
    status VARCHAR(50) DEFAULT 'assigned', -- 'assigned', 'en_route', 'arrived', 'completed', 'failed', 'cancelled'
    scheduled_date DATE,
    estimated_delivery_time TIMESTAMP,
    actual_delivery_time TIMESTAMP,
    delivery_address TEXT NOT NULL,
    delivery_notes TEXT,
    customer_phone VARCHAR(20),
    customer_name VARCHAR(100),
    signature_image_url TEXT,
    proof_image_urls TEXT[], -- array of photo evidence
    failure_reason TEXT, -- if delivery failed
    attempts INT DEFAULT 0,
    route_sequence INT, -- order in delivery route
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_courier_deliveries_courier_id ON courier_deliveries(courier_id);
CREATE INDEX idx_courier_deliveries_order_id ON courier_deliveries(order_id);
CREATE INDEX idx_courier_deliveries_status ON courier_deliveries(status);
CREATE INDEX idx_courier_deliveries_scheduled_date ON courier_deliveries(scheduled_date);
CREATE INDEX idx_courier_deliveries_assigned_at ON courier_deliveries(assigned_at);

-- ===== 5. COURIER_PERFORMANCE TABLE: Track courier stats =====
CREATE TABLE IF NOT EXISTS courier_performance (
    id BIGSERIAL PRIMARY KEY,
    courier_id BIGINT NOT NULL UNIQUE REFERENCES users(telegram_id) ON DELETE CASCADE,
    total_deliveries INT DEFAULT 0,
    successful_deliveries INT DEFAULT 0,
    failed_deliveries INT DEFAULT 0,
    cancelled_deliveries INT DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 5,
    total_ratings INT DEFAULT 0,
    total_earnings DECIMAL(10, 2) DEFAULT 0,
    bonus_earned DECIMAL(10, 2) DEFAULT 0,
    today_deliveries INT DEFAULT 0,
    today_earnings DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'on_break', 'offline', 'suspended'
    last_delivery_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_courier_performance_courier_id ON courier_performance(courier_id);
CREATE INDEX idx_courier_performance_average_rating ON courier_performance(average_rating DESC);

-- ===== 6. COURIER_RATINGS TABLE: Ratings from customers =====
CREATE TABLE IF NOT EXISTS courier_ratings (
    id BIGSERIAL PRIMARY KEY,
    courier_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    customer_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    delivery_id BIGINT NOT NULL REFERENCES courier_deliveries(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_courier_ratings_courier_id ON courier_ratings(courier_id);
CREATE INDEX idx_courier_ratings_customer_id ON courier_ratings(customer_id);
CREATE INDEX idx_courier_ratings_delivery_id ON courier_ratings(delivery_id);

-- Update courier average rating
CREATE OR REPLACE FUNCTION update_courier_average_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE courier_performance 
    SET average_rating = (
        SELECT ROUND(AVG(rating)::numeric, 2) FROM courier_ratings WHERE courier_id = NEW.courier_id
    ),
    total_ratings = (
        SELECT COUNT(*) FROM courier_ratings WHERE courier_id = NEW.courier_id
    )
    WHERE courier_id = NEW.courier_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_courier_rating
AFTER INSERT ON courier_ratings
FOR EACH ROW
EXECUTE FUNCTION update_courier_average_rating();

-- ===== 7. COURIER_GPS_TRACKING TABLE: Real-time location (optional) =====
CREATE TABLE IF NOT EXISTS courier_gps_tracking (
    id BIGSERIAL PRIMARY KEY,
    courier_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    delivery_id BIGINT REFERENCES courier_deliveries(id) ON DELETE SET NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy INT, -- GPS accuracy in meters
    speed DECIMAL(5, 2), -- speed in km/h
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_courier_gps_tracking_courier_id ON courier_gps_tracking(courier_id);
CREATE INDEX idx_courier_gps_tracking_delivery_id ON courier_gps_tracking(delivery_id);
CREATE INDEX idx_courier_gps_tracking_timestamp ON courier_gps_tracking(timestamp DESC);

-- Clean old GPS data (keep only 7 days)
-- SELECT cron.schedule('cleanup_gps_tracking', '0 2 * * *', 'DELETE FROM courier_gps_tracking WHERE timestamp < NOW() - INTERVAL ''7 days''');

-- ===== 8. CHAT_MESSAGES TABLE: Real-time chat (Manager <-> Customer, Support <-> Customer) =====
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    from_user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    to_user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'file', 'system'
    content TEXT,
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_from_user_id ON chat_messages(from_user_id);
CREATE INDEX idx_chat_messages_to_user_id ON chat_messages(to_user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_is_read ON chat_messages(is_read);

-- ===== 9. CHAT_CONVERSATIONS TABLE: Conversation metadata =====
CREATE TABLE IF NOT EXISTS chat_conversations (
    id BIGSERIAL PRIMARY KEY,
    participant1_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    participant2_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    related_order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(participant1_id, participant2_id)
);

CREATE INDEX idx_chat_conversations_participant1 ON chat_conversations(participant1_id);
CREATE INDEX idx_chat_conversations_participant2 ON chat_conversations(participant2_id);
CREATE INDEX idx_chat_conversations_last_message_at ON chat_conversations(last_message_at DESC);

-- ===== 10. UPDATE USERS TABLE: Add courier-specific fields =====
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS is_courier_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS courier_start_time TIME,
ADD COLUMN IF NOT EXISTS courier_end_time TIME,
ADD COLUMN IF NOT EXISTS courier_coverage_area TEXT,
ADD COLUMN IF NOT EXISTS average_courier_rating DECIMAL(3, 2);

-- ===== 11. GAMIFICATION TABLE: User levels, badges, achievements =====
CREATE TABLE IF NOT EXISTS user_gamification (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(telegram_id) ON DELETE CASCADE,
    level INT DEFAULT 1,
    experience_points BIGINT DEFAULT 0,
    next_level_xp BIGINT DEFAULT 1000,
    badges TEXT[], -- array of badge IDs earned
    total_purchases INT DEFAULT 0,
    total_reviews INT DEFAULT 0,
    total_referrals INT DEFAULT 0,
    streak_days INT DEFAULT 0,
    last_purchase_date DATE,
    last_activity_date TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_gamification_user_id ON user_gamification(user_id);
CREATE INDEX idx_user_gamification_level ON user_gamification(level DESC);
CREATE INDEX idx_user_gamification_experience_points ON user_gamification(experience_points DESC);

-- ===== 12. BADGES TABLE: Available badges in the system =====
CREATE TABLE IF NOT EXISTS badges (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    requirement_type VARCHAR(50), -- 'purchases', 'reviews', 'referrals', 'level', 'streak'
    requirement_value INT,
    color VARCHAR(20), -- 'gold', 'silver', 'bronze', 'blue', etc.
    rarity VARCHAR(20) -- 'common', 'uncommon', 'rare', 'epic', 'legendary'
);

INSERT INTO badges (name, title, description, requirement_type, requirement_value, rarity) VALUES
    ('first_purchase', 'Первая покупка', 'Первый заказ в магазине', 'purchases', 1, 'common'),
    ('power_shopper', 'Мощный покупатель', '10 заказов', 'purchases', 10, 'uncommon'),
    ('mega_shopper', 'Мега-покупатель', '50 заказов', 'purchases', 50, 'rare'),
    ('reviewer', 'Рецензент', 'Первый отзыв', 'reviews', 1, 'common'),
    ('super_reviewer', 'Суперрецензент', '10 отзывов', 'reviews', 10, 'rare'),
    ('referral_master', 'Мастер рефереров', '5 приглашённых', 'referrals', 5, 'rare'),
    ('level_10', 'Уровень 10', 'Достичь уровня 10', 'level', 10, 'epic')
ON CONFLICT DO NOTHING;

-- ===== 13. A_B_TESTS TABLE: A/B testing configuration =====
CREATE TABLE IF NOT EXISTS ab_tests (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    test_type VARCHAR(50), -- 'homepage_banner', 'product_card', 'checkout_flow'
    variant_a_name VARCHAR(50),
    variant_b_name VARCHAR(50),
    variant_a_config JSONB,
    variant_b_config JSONB,
    is_active BOOLEAN DEFAULT false,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    winner VARCHAR(10), -- 'A' or 'B' after test ends
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===== 14. A_B_TEST_RESULTS TABLE: Results and metrics =====
CREATE TABLE IF NOT EXISTS ab_test_results (
    id BIGSERIAL PRIMARY KEY,
    test_id BIGINT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(telegram_id) ON DELETE SET NULL,
    variant VARCHAR(10), -- 'A' or 'B'
    views INT DEFAULT 0,
    clicks INT DEFAULT 0,
    purchases INT DEFAULT 0,
    revenue DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===== 15. FINAL VERIFICATION =====
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('support_tickets', 'support_ticket_replies', 'support_kb',
                     'courier_deliveries', 'courier_performance', 'courier_ratings', 'courier_gps_tracking',
                     'chat_messages', 'chat_conversations',
                     'user_gamification', 'badges',
                     'ab_tests', 'ab_test_results');

COMMIT;

-- ===== SUCCESS MESSAGE =====
-- Migration 010 Part 3 completed successfully!
-- All role improvements tables created.
-- Next: Update lib/auth.ts and start implementing Sprint 1 APIs
