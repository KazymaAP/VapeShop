/**
 * 029_create_order_history_table.sql
 * Создает таблицу order_history для логирования изменений статуса заказов (HIGH-021)
 * 
 * Проблема: Код пытается вставить в order_history, но таблицы нет
 * Решение: Создать таблицу с полной информацией о истории заказов
 */

-- Таблица для логирования истории заказов (изменения статусов и операций)
CREATE TABLE IF NOT EXISTS order_history (
    id SERIAL PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Кто выполнил действие
    user_telegram_id BIGINT REFERENCES users(telegram_id) ON DELETE SET NULL,
    user_role VARCHAR(50),
    
    -- Какое действие было выполнено
    action VARCHAR(100) NOT NULL,  /* 'status_change', 'note_added', 'cancelled', 'delivered', etc */
    
    -- Если смена статуса - старый и новый статус
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    
    -- Примечания
    note TEXT,
    details JSONB,
    
    -- Время выполнения
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Дополнительные поля
    status VARCHAR(20) DEFAULT 'success'  /* 'success', 'failed', 'pending' */
);

-- Индексы для частых запросов
CREATE INDEX IF NOT EXISTS idx_order_history_order_id 
    ON order_history(order_id DESC);

CREATE INDEX IF NOT EXISTS idx_order_history_user_telegram_id 
    ON order_history(user_telegram_id);

CREATE INDEX IF NOT EXISTS idx_order_history_created_at 
    ON order_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_history_action 
    ON order_history(action);

CREATE INDEX IF NOT EXISTS idx_order_history_order_created 
    ON order_history(order_id, created_at DESC);

-- Добавляем комментарии для ясности
COMMENT ON TABLE order_history IS 'История изменений статусов и операций над заказами';
COMMENT ON COLUMN order_history.order_id IS 'Ссылка на заказ';
COMMENT ON COLUMN order_history.user_telegram_id IS 'Telegram ID пользователя, выполнившего действие';
COMMENT ON COLUMN order_history.action IS 'Тип действия (status_change, note_added, etc)';
COMMENT ON COLUMN order_history.old_status IS 'Старый статус заказа (для status_change)';
COMMENT ON COLUMN order_history.new_status IS 'Новый статус заказа (для status_change)';
COMMENT ON COLUMN order_history.details IS 'JSON с дополнительными деталями действия';

-- Логируем применение миграции
SELECT 'Migration 029: Created order_history table (HIGH-021)' AS status;
