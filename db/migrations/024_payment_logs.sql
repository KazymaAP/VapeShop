-- Миграция для логирования платежей и обеспечения идемпотентности
-- Дата: 2026-04-04
-- Описание: Создание таблицы payment_logs для предотвращения повторной обработки платежей

CREATE TABLE IF NOT EXISTS payment_logs (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  order_id UUID,
  telegram_payment_charge_id VARCHAR(255) UNIQUE,
  provider_payment_charge_id VARCHAR(255),
  amount_received INTEGER,
  currency VARCHAR(10),
  status VARCHAR(50),
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_payment_logs_telegram_id ON payment_logs(telegram_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_order_id ON payment_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_charge_id ON payment_logs(telegram_payment_charge_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_processed_at ON payment_logs(processed_at DESC);

-- Комментарии
COMMENT ON TABLE payment_logs IS 'Таблица для логирования платежей и обеспечения идемпотентности';
COMMENT ON COLUMN payment_logs.telegram_payment_charge_id IS 'Уникальный ID платежа от Telegram (для идемпотентности)';
COMMENT ON COLUMN payment_logs.provider_payment_charge_id IS 'ID платежа от провайдера (Stripe, etc.)';
COMMENT ON COLUMN payment_logs.status IS 'Статус обработки платежа (success, failed, pending)';
