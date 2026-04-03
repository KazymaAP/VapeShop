-- SPRINT 3: Courier + Support Features
-- Таблицы для курьеров, поддержки и чата

-- 1. Производительность курьера
CREATE TABLE IF NOT EXISTS courier_performance (
  id SERIAL PRIMARY KEY,
  courier_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  deliveries_today INT DEFAULT 0,
  deliveries_week INT DEFAULT 0,
  rating FLOAT DEFAULT 5.0,
  earnings DECIMAL(10,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_courier_performance_courier ON courier_performance(courier_id);

-- 2. Задачи доставки курьера
CREATE TABLE IF NOT EXISTS courier_deliveries (
  id SERIAL PRIMARY KEY,
  courier_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  photo_url VARCHAR(500),
  signature_url VARCHAR(500),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'assigned', -- 'assigned', 'in_progress', 'completed', 'failed'
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_courier_deliveries_courier ON courier_deliveries(courier_id);
CREATE INDEX IF NOT EXISTS idx_courier_deliveries_order ON courier_deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_courier_deliveries_status ON courier_deliveries(status);

-- 3. Обращения в поддержку
CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  assigned_to BIGINT REFERENCES users(telegram_id) ON DELETE SET NULL,
  related_order_id INT REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to);

-- 4. Ответы в поддержку
CREATE TABLE IF NOT EXISTS support_ticket_replies (
  id SERIAL PRIMARY KEY,
  ticket_id INT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(telegram_id),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_ticket ON support_ticket_replies(ticket_id);

-- 5. Сообщения чата (WebSocket)
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(255) NOT NULL, -- 'order_123', 'support_456', etc.
  sender_id BIGINT NOT NULL REFERENCES users(telegram_id),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);

-- 6. Оценки доставок (от клиентов)
CREATE TABLE IF NOT EXISTS delivery_ratings (
  id SERIAL PRIMARY KEY,
  delivery_id INT NOT NULL REFERENCES courier_deliveries(id) ON DELETE CASCADE,
  courier_id BIGINT NOT NULL REFERENCES users(telegram_id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_courier ON delivery_ratings(courier_id);
