-- Миграция 003: Система уведомлений
-- Дата: 2024
-- Описание: Таблицы для управления уведомлениями

-- ============================================================
-- 1. Таблица настроек уведомлений
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_settings (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT TRUE,
  target_role VARCHAR(50) NOT NULL, -- admin, manager, seller, buyer
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_notification_settings_event_type 
  ON notification_settings(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_settings_target_role 
  ON notification_settings(target_role);

-- Начальные данные
INSERT INTO notification_settings (event_type, is_enabled, target_role)
VALUES
  ('order_new_admin', true, 'admin'),
  ('order_status_changed_buyer', true, 'buyer'),
  ('order_ready_ship', true, 'buyer'),
  ('abandoned_cart', true, 'buyer')
ON CONFLICT (event_type) DO NOTHING;

-- ============================================================
-- 2. Таблица истории отправленных уведомлений
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_history (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  message_text TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'sent', -- sent, failed, pending
  error_message TEXT,
  FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_notification_history_user 
  ON notification_history(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_event_type 
  ON notification_history(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at 
  ON notification_history(sent_at DESC);

-- ============================================================
-- 3. Таблица для отслеживания брошенных корзин
-- ============================================================
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL UNIQUE,
  total_items INT NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  abandoned_at TIMESTAMP DEFAULT NOW(),
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMP,
  recovery_clicked BOOLEAN DEFAULT FALSE,
  recovered_at TIMESTAMP,
  FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_user 
  ON abandoned_carts(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_abandoned_at 
  ON abandoned_carts(abandoned_at DESC);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_reminder_sent 
  ON abandoned_carts(reminder_sent);

-- ============================================================
-- Обновление таблицы orders (если нет полей для кода)
-- ============================================================
-- Эти поля должны быть уже добавлены в миграции 002
-- Если их нет, раскомментируйте:
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS code_6digit VARCHAR(6);
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMP;

-- ============================================================
-- Примечания
-- ============================================================
-- notification_settings - управляет включением/выключением типов уведомлений
-- notification_history - логирует все отправленные уведомления для аналитики
-- abandoned_carts - отслеживает брошенные корзины для кампаний восстановления
