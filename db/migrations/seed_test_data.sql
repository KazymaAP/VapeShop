-- Seed data for role improvements testing
-- Insert test users, products, orders for development/testing

BEGIN TRANSACTION;

-- ===== TEST USERS FOR EACH ROLE =====
INSERT INTO users (telegram_id, first_name, last_name, username, role, is_blocked, created_at)
VALUES
  (111111111, 'Test', 'SuperAdmin', 'testsuperadmin', 'super_admin', false, NOW()),
  (222222222, 'Test', 'Admin', 'testadmin', 'admin', false, NOW()),
  (333333333, 'Test', 'Manager', 'testmanager', 'manager', false, NOW()),
  (444444444, 'Test', 'Support', 'testsupport', 'support', false, NOW()),
  (555555555, 'Test', 'Courier', 'testcourier', 'courier', false, NOW()),
  (666666666, 'Test', 'Customer1', 'testcustomer1', 'customer', false, NOW()),
  (777777777, 'Test', 'Customer2', 'testcustomer2', 'customer', false, NOW()),
  (888888888, 'Test', 'Customer3', 'testcustomer3', 'customer', false, NOW())
ON CONFLICT (telegram_id) DO NOTHING;

-- ===== CREATE USER_BALANCE RECORDS =====
INSERT INTO user_balance (user_id, current_balance, lifetime_earned, lifetime_spent)
SELECT telegram_id, 0, 0, 0 FROM users WHERE role IN ('customer', 'courier')
ON CONFLICT (user_id) DO NOTHING;

-- ===== CREATE COURIER_PERFORMANCE RECORDS =====
INSERT INTO courier_performance (courier_id, total_deliveries, successful_deliveries, average_rating, status)
VALUES
  (555555555, 0, 0, 5, 'active')
ON CONFLICT (courier_id) DO NOTHING;

-- ===== CREATE USER_GAMIFICATION RECORDS =====
INSERT INTO user_gamification (user_id, level, experience_points, next_level_xp, badges)
SELECT telegram_id, 1, 0, 1000, '{}'::text[] FROM users WHERE role = 'customer'
ON CONFLICT (user_id) DO NOTHING;

-- ===== CREATE TEST PRODUCTS (if not exist) =====
-- Assuming categories exist: ID 1, 2, 3
-- Assuming brands exist: ID 1, 2, 3

-- Test products for bulk edit testing
INSERT INTO products (name, description, price, stock, category_id, brand_id, rating, reviews_count, created_at, updated_at)
VALUES
  ('Test IQOS Heets', 'Premium heated tobacco sticks for IQOS', 500.00, 100, 1, 1, 4.8, 45, NOW(), NOW()),
  ('Test Lost Mary', 'Disposable vape with 1600 puffs', 750.00, 50, 1, 2, 4.7, 32, NOW(), NOW()),
  ('Test Vape Juice', 'Premium e-liquid 60ml bottle', 300.00, 200, 2, 3, 4.6, 28, NOW(), NOW()),
  ('Test Vape Mod', 'Advanced vaping device with display', 1200.00, 30, 3, 1, 4.9, 55, NOW(), NOW()),
  ('Test Accessories', 'Charging cable and stand', 150.00, 500, 4, 2, 4.5, 12, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- ===== CREATE TEST ORDERS =====
-- Get product IDs to use in orders
DO $$
DECLARE
  v_product1_id BIGINT;
  v_product2_id BIGINT;
  v_product3_id BIGINT;
BEGIN
  SELECT id INTO v_product1_id FROM products WHERE name = 'Test IQOS Heets' LIMIT 1;
  SELECT id INTO v_product2_id FROM products WHERE name = 'Test Lost Mary' LIMIT 1;
  SELECT id INTO v_product3_id FROM products WHERE name = 'Test Vape Juice' LIMIT 1;

  -- Create test orders
  INSERT INTO orders (user_id, total_amount, status, delivery_type, created_at, updated_at)
  VALUES
    (666666666, 1250.00, 'pending', 'delivery', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    (666666666, 800.00, 'confirmed', 'pickup', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
    (777777777, 2100.00, 'shipped', 'delivery', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    (888888888, 450.00, 'delivered', 'delivery', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours')
  ON CONFLICT DO NOTHING;
END $$;

-- ===== CREATE TEST PROMOTIONS =====
INSERT INTO promotions (name, description, type, value, start_date, end_date, is_active, applicable_categories, minimum_purchase)
VALUES
  ('Spring Sale 20%', 'All products 20% off', 'discount_percent', 20, NOW(), NOW() + INTERVAL '7 days', true, '{1,2}'::text[], 0),
  ('Free Shipping', 'Free shipping on orders over 1000', 'discount_fixed', 0, NOW(), NOW() + INTERVAL '30 days', true, '{1,2,3,4}'::text[], 1000),
  ('Cashback 5%', 'Get 5% cashback on every purchase', 'cashback', 5, NOW(), NOW() + INTERVAL '90 days', true, NULL, 0)
ON CONFLICT DO NOTHING;

-- ===== CREATE TEST GIFT CERTIFICATES =====
INSERT INTO gift_certificates (code, amount, balance, created_by, expires_at, is_active, notes)
VALUES
  ('GIFT-2024-001', 1000, 1000, 222222222, NOW() + INTERVAL '1 year', true, 'Test gift certificate 1'),
  ('GIFT-2024-002', 5000, 5000, 222222222, NOW() + INTERVAL '1 year', true, 'Test gift certificate 2'),
  ('GIFT-2024-003', 500, 0, 222222222, NOW() + INTERVAL '1 year', false, 'Test gift certificate (used)')
ON CONFLICT DO NOTHING;

-- ===== CREATE TEST TEMPLATE RESPONSES =====
INSERT INTO template_responses (title, content, category, is_active, created_by)
VALUES
  ('Order Confirmed', 'Your order has been confirmed and will be processed soon.', 'general', true, 222222222),
  ('In Transit', 'Your order is in transit and should arrive within 1-3 business days.', 'delivery', true, 222222222),
  ('Delivery Issue', 'We''ve encountered an issue with your delivery. Please contact support.', 'delivery', true, 222222222),
  ('Product Question', 'Thank you for your inquiry. Please provide more details about your question.', 'product', true, 222222222),
  ('Payment Failed', 'Your payment could not be processed. Please try again or use another payment method.', 'payment', true, 222222222)
ON CONFLICT (title) DO NOTHING;

-- ===== CREATE TEST SUPPORT TICKETS =====
INSERT INTO support_tickets (user_id, subject, description, category, priority, status, assigned_to, created_at)
VALUES
  (666666666, 'Order delayed', 'My order #12345 hasn''t arrived yet', 'delivery_problem', 'normal', 'open', 444444444, NOW() - INTERVAL '2 days'),
  (777777777, 'Product quality issue', 'The product arrived damaged', 'product_quality', 'high', 'in_progress', 444444444, NOW() - INTERVAL '1 day'),
  (888888888, 'Payment not working', 'Card payment keeps failing', 'payment_issue', 'urgent', 'open', 444444444, NOW() - INTERVAL '6 hours')
ON CONFLICT DO NOTHING;

-- ===== CREATE TEST COURIER DELIVERIES =====
DO $$
DECLARE
  v_order_id BIGINT;
BEGIN
  SELECT id INTO v_order_id FROM orders WHERE status = 'shipped' LIMIT 1;
  
  IF v_order_id IS NOT NULL THEN
    INSERT INTO courier_deliveries (order_id, courier_id, assigned_by, status, scheduled_date, estimated_delivery_time, delivery_address, customer_name, customer_phone, created_at)
    VALUES
      (v_order_id, 555555555, 333333333, 'en_route', CURRENT_DATE, NOW() + INTERVAL '2 hours', 'Test Address, Moscow 123456', 'John Doe', '+7-900-123-45-67', NOW())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ===== CREATE TEST REFERRAL STATS =====
INSERT INTO referral_stats (referrer_id, referral_id, referral_code, invited_at, is_active)
VALUES
  (666666666, 777777777, 'REF1234567890', NOW() - INTERVAL '1 month', true),
  (666666666, 888888888, 'REF0987654321', NOW() - INTERVAL '2 weeks', true)
ON CONFLICT DO NOTHING;

-- ===== CREATE TEST SAVED_FOR_LATER ITEMS =====
DO $$
DECLARE
  v_product_id BIGINT;
BEGIN
  SELECT id INTO v_product_id FROM products WHERE name = 'Test IQOS Heets' LIMIT 1;
  
  IF v_product_id IS NOT NULL THEN
    INSERT INTO saved_for_later (user_id, product_id, quantity, price_when_saved, saved_at)
    VALUES
      (666666666, v_product_id, 2, 500.00, NOW())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ===== CREATE TEST COMPARE ITEMS =====
DO $$
DECLARE
  v_product1 BIGINT;
  v_product2 BIGINT;
BEGIN
  SELECT id INTO v_product1 FROM products WHERE name = 'Test IQOS Heets' LIMIT 1;
  SELECT id INTO v_product2 FROM products WHERE name = 'Test Lost Mary' LIMIT 1;
  
  IF v_product1 IS NOT NULL AND v_product2 IS NOT NULL THEN
    INSERT INTO compare_items (user_id, product_id, added_at)
    VALUES
      (666666666, v_product1, NOW()),
      (666666666, v_product2, NOW())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ===== CREATE TEST PRODUCT VIEWS =====
DO $$
DECLARE
  v_product_id BIGINT;
BEGIN
  SELECT id INTO v_product_id FROM products WHERE name = 'Test IQOS Heets' LIMIT 1;
  
  IF v_product_id IS NOT NULL THEN
    INSERT INTO product_views (product_id, user_id, view_source, created_at)
    VALUES
      (v_product_id, 666666666, 'category', NOW() - INTERVAL '1 day'),
      (v_product_id, 777777777, 'search', NOW() - INTERVAL '2 days'),
      (v_product_id, 888888888, 'recommendations', NOW() - INTERVAL '3 days')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ===== CREATE TEST AUDIT LOG ENTRIES =====
INSERT INTO audit_log (user_id, action, target_type, target_id, target_name, details, status, created_at)
VALUES
  (222222222, 'create', 'product', 1, 'Test Product 1', jsonb_build_object('price', 500, 'stock', 100), 'success', NOW() - INTERVAL '2 days'),
  (222222222, 'update', 'product', 1, 'Test Product 1', jsonb_build_object('old_price', 500, 'new_price', 450), 'success', NOW() - INTERVAL '1 day'),
  (333333333, 'update', 'order', 1, 'Order #1', jsonb_build_object('status_from', 'pending', 'status_to', 'confirmed'), 'success', NOW()),
  (111111111, 'export', 'orders', NULL, NULL, jsonb_build_object('format', 'xlsx', 'rows', 150), 'success', NOW() - INTERVAL '6 hours')
ON CONFLICT DO NOTHING;

-- ===== VERIFY INSERTS =====
SELECT 'Users created:' as result, COUNT(*) as count FROM users WHERE telegram_id >= 111111111;
SELECT 'Products created:' as result, COUNT(*) as count FROM products WHERE name LIKE 'Test%';
SELECT 'Orders created:' as result, COUNT(*) as count FROM orders WHERE user_id >= 666666666;
SELECT 'Promotions created:' as result, COUNT(*) as count FROM promotions WHERE name LIKE '%Sale%' OR name LIKE '%Shipping%';
SELECT 'Gift certificates created:' as result, COUNT(*) as count FROM gift_certificates WHERE code LIKE 'GIFT%';
SELECT 'Support tickets created:' as result, COUNT(*) as count FROM support_tickets WHERE user_id >= 666666666;
SELECT 'Template responses created:' as result, COUNT(*) as count FROM template_responses WHERE created_by = 222222222;
SELECT 'Audit logs created:' as result, COUNT(*) as count FROM audit_log WHERE user_id IN (222222222, 333333333, 111111111);

COMMIT;

-- ===== SUCCESS MESSAGE =====
-- Test data seed completed successfully!
-- Ready for development and testing
