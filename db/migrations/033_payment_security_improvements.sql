-- ============================================================
-- Миграция 033: Добавление UNIQUE constraint для payment_logs
-- Файл: db/migrations/033_payment_security_improvements.sql
-- Описание: Предотвращение дублирования платежей на уровне БД
-- ============================================================

-- ⚠️ ВАЖНО: Если таблица payment_logs не существует, скрипт её создаёт
CREATE TABLE IF NOT EXISTS payment_logs (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  order_id UUID NOT NULL,
  telegram_payment_charge_id VARCHAR(255) NOT NULL,
  amount_received BIGINT NOT NULL,
  currency VARCHAR(10) DEFAULT 'XTR',
  status VARCHAR(50) DEFAULT 'success',
  processed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Добавляем UNIQUE constraint если его ещё нет
-- Это гарантирует что один telegram_payment_charge_id никогда не будет обработан дважды
ALTER TABLE payment_logs 
ADD CONSTRAINT unique_telegram_payment_charge_id UNIQUE (telegram_payment_charge_id);

-- Индекс для быстрого поиска платежей по заказу
CREATE INDEX IF NOT EXISTS idx_payment_logs_order_id ON payment_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_telegram_id ON payment_logs(telegram_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_charge_id ON payment_logs(telegram_payment_charge_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON payment_logs(created_at DESC);

-- ============================================================
-- Дополнительная защита: Убедимся что orders таблица имеет индекс на paid_at
-- для быстрого нахождения оплаченных заказов
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_orders_telegram_id_status ON orders(user_telegram_id, status);

-- ============================================================
-- Логирование миграции
-- ============================================================
INSERT INTO migrations_log (migration_name, executed_at, status)
VALUES ('033_payment_security_improvements', NOW(), 'success')
ON CONFLICT (migration_name) DO UPDATE SET executed_at = NOW(), status = 'success';
