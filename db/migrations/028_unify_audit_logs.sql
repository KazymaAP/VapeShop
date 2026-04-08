/**
 * 028_unify_audit_logs.sql
 * Унифицирует audit_log и admin_logs в одну таблицу (HIGH-023)
 * 
 * Проблема: Код использует обе таблицы (admin_logs и audit_log)
 * Решение: Использовать одну таблицу аудита с полной схемой
 */

-- Шаг 1: Расширяем audit_log если нужны новые поля
ALTER TABLE IF EXISTS audit_log 
ADD COLUMN IF NOT EXISTS user_telegram_id BIGINT;

-- Заполняем user_telegram_id из user_id (если не заполнено)
UPDATE audit_log 
SET user_telegram_id = user_id 
WHERE user_telegram_id IS NULL AND user_id IS NOT NULL;

-- Шаг 2: Мигрируем данные из admin_logs в audit_log (если таблица существует)
INSERT INTO audit_log (
  user_id, 
  user_telegram_id,
  action, 
  target_type, 
  target_id,
  details, 
  status, 
  created_at
)
SELECT 
  al.user_telegram_id,
  al.user_telegram_id,
  al.action,
  'admin_action'::VARCHAR(50),
  NULL,
  al.details,
  'success'::VARCHAR(20),
  al.created_at
FROM admin_logs al
WHERE NOT EXISTS (
  -- Избегаем дублей (проверяем если запись уже в audit_log)
  SELECT 1 FROM audit_log au 
  WHERE au.user_id = al.user_telegram_id 
  AND au.action = al.action 
  AND au.created_at = al.created_at
)
ON CONFLICT DO NOTHING;

-- Шаг 3: Удаляем старую таблицу admin_logs (она больше не нужна)
DROP TABLE IF EXISTS admin_logs CASCADE;

-- Шаг 4: Гарантируем что все индексы есть на audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_telegram_id ON audit_log(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_target_type ON audit_log(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_action ON audit_log(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_telegram_action ON audit_log(user_telegram_id, action);

-- Шаг 5: Обновляем комментарии для ясности
COMMENT ON TABLE audit_log IS 'Единая таблица логирования всех действий (аудит)';
COMMENT ON COLUMN audit_log.user_id IS 'Telegram ID пользователя (основном ключ, совпадает с user_telegram_id)';
COMMENT ON COLUMN audit_log.user_telegram_id IS 'Telegram ID пользователя (альтернативный доступ)';
COMMENT ON COLUMN audit_log.action IS 'Тип действия (CREATE, UPDATE, DELETE, EXPORT, etc.)';
COMMENT ON COLUMN audit_log.target_type IS 'Тип объекта (product, user, order, promotion, etc.)';
COMMENT ON COLUMN audit_log.target_id IS 'ID объекта действия';
COMMENT ON COLUMN audit_log.details IS 'JSON детали действия (old_value, new_value, reason)';
COMMENT ON COLUMN audit_log.status IS 'Статус (success, failed, partial)';
COMMENT ON COLUMN audit_log.created_at IS 'Время выполнения действия';

-- Логируем применение миграции
SELECT 'Migration 028: Unified audit_log table (HIGH-023)' AS status;
