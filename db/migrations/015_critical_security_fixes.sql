-- Миграция для критических исправлений безопасности
-- Дата: 2026-04-04
-- Автор: Copilot
-- Описание: Добавление soft delete для товаров, проверка целостности данных, добавление аудит логов

-- 1. Добавляем is_active для товаров (soft delete вместо жёсткого удаления)
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Добавляем created_by и updated_by для отслеживания кто изменил товар
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_by BIGINT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_by BIGINT;

-- 3. Создаём таблицу audit_log для логирования всех критичных операций
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50),
  record_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address INET
);

-- 4. Индексы для audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_user_telegram_id ON audit_log(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);

-- 5. Добавляем колонку paid_at, code_6digit для заказов
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS code_6digit INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manager_note TEXT;

-- 6. Добавляем таблицу для логирования неудачных попыток авторизации
CREATE TABLE IF NOT EXISTS auth_attempts (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT,
  status VARCHAR(20),
  error_message TEXT,
  ip_address INET,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_telegram_id ON auth_attempts(telegram_id);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_created_at ON auth_attempts(created_at);

-- 7. Добавляем таблицу для хранения хешей initData для защиты от replay attacks
CREATE TABLE IF NOT EXISTS init_data_cache (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  hash_sha256 VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_init_data_cache_telegram_id ON init_data_cache(telegram_id);
CREATE INDEX IF NOT EXISTS idx_init_data_cache_hash ON init_data_cache(hash_sha256);

-- 8. Убеждаемся что все товары помечены как активные (для старых данных)
UPDATE products SET is_active = true WHERE is_active IS NULL;

-- 9. Делаем is_active NOT NULL
ALTER TABLE products ALTER COLUMN is_active SET NOT NULL;

-- 10. Проверяем все старые запросы на is_active = true для consistency
-- Все SELECT должны содержать WHERE is_active = true

COMMIT;
