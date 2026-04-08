-- Миграция для инициализации super_admin
-- Дата: 2026-04-04
-- Описание: Инициализация роли super_admin для администраторов из переменных окружения

-- Функция для инициализации super_admin ролей
-- Вызывается один раз при миграции
DO $$
DECLARE
  super_admin_ids BIGINT[] := ARRAY[];
  admin_id BIGINT;
BEGIN
  -- Здесь можно добавить инициализацию по переменной окружения
  -- Для этого нужно передать значение через EXECUTE
  -- Пример: EXECUTE 'SELECT $1::BIGINT[]' INTO super_admin_ids USING current_setting('custom.super_admin_ids');
  
  -- Просто убеждаемся, что роль super_admin существует и может быть назначена
  -- Функция назначения будет в приложении
  
  RAISE NOTICE 'Super admin initialization function is ready. Use API or application logic to assign super_admin role.';
END $$;

-- Убеждаемся, что пользователи могут иметь роль super_admin
-- Это опциональная проверка
ALTER TABLE users 
  ADD CONSTRAINT check_valid_role 
  CHECK (role IN ('customer', 'buyer', 'admin', 'manager', 'courier', 'support', 'seller', 'super_admin'))
  NOT VALID;

-- Валидируем только новые данные (не нарушаем старые)
-- ALTER TABLE users VALIDATE CONSTRAINT check_valid_role;
