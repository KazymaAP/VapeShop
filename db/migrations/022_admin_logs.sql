-- Миграция для таблицы admin_logs (более описательное имя чем audit_log)
-- Дата: 2026-04-04
-- Описание: Создание таблицы для логирования действий администраторов

-- Создание таблицы если её нет
CREATE TABLE IF NOT EXISTS admin_logs (
  id BIGSERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_admin_logs_user_telegram_id ON admin_logs(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- Комбинированный индекс для поиска действий конкретного администратора
CREATE INDEX IF NOT EXISTS idx_admin_logs_user_action ON admin_logs(user_telegram_id, action);

-- Комментарий к таблице
COMMENT ON TABLE admin_logs IS 'Таблица для логирования действий администраторов';
COMMENT ON COLUMN admin_logs.user_telegram_id IS 'Telegram ID администратора, выполнившего действие';
COMMENT ON COLUMN admin_logs.action IS 'Тип действия (CREATE_ORDER, USER_ROLE_CHANGE, DELETE_PRODUCT и т.д.)';
COMMENT ON COLUMN admin_logs.details IS 'JSON с деталями действия (параметры, результаты)';
COMMENT ON COLUMN admin_logs.created_at IS 'Время выполнения действия';
