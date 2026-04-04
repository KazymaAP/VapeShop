-- Миграция 018: Реферальная система с кодами и бонусами
-- Создаёт таблицы для управления реферальными кодами и начислением бонусов

-- Таблица реферальных кодов
CREATE TABLE IF NOT EXISTS referral_codes (
  id BIGSERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  code VARCHAR(20) UNIQUE NOT NULL,
  bonus_amount DECIMAL(10,2) DEFAULT 100.00,
  used_count INT DEFAULT 0,
  max_uses INT, -- NULL = unlimited
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Таблица истории использования реферальных кодов
CREATE TABLE IF NOT EXISTS referral_uses (
  id BIGSERIAL PRIMARY KEY,
  referral_code_id BIGINT NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referrer_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  referred_user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  bonus_amount DECIMAL(10,2) NOT NULL,
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'completed', -- pending, completed, cancelled
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Таблица баланса бонусов пользователей
CREATE TABLE IF NOT EXISTS user_bonuses (
  user_telegram_id BIGINT PRIMARY KEY REFERENCES users(telegram_id) ON DELETE CASCADE,
  total_earned DECIMAL(10,2) DEFAULT 0,
  available_balance DECIMAL(10,2) DEFAULT 0,
  spent DECIMAL(10,2) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Таблица истории операций с бонусами
CREATE TABLE IF NOT EXISTS bonus_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'earned', 'spent', 'cancelled', 'expired'
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  related_referral_use_id BIGINT REFERENCES referral_uses(id),
  related_order_id BIGINT REFERENCES orders(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_active ON referral_codes(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_referral_uses_referrer ON referral_uses(referrer_telegram_id);
CREATE INDEX IF NOT EXISTS idx_referral_uses_referred ON referral_uses(referred_user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_user_bonuses_balance ON user_bonuses(available_balance);
CREATE INDEX IF NOT EXISTS idx_bonus_transactions_user ON bonus_transactions(user_telegram_id, created_at);

-- Функция для генерации случайного кода
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR AS $$
DECLARE
  new_code VARCHAR(20);
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := CONCAT(
      SUBSTRING('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', FLOOR(RANDOM() * 36) + 1, 1),
      SUBSTRING('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', FLOOR(RANDOM() * 36) + 1, 1),
      SUBSTRING('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', FLOOR(RANDOM() * 36) + 1, 1),
      SUBSTRING('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', FLOOR(RANDOM() * 36) + 1, 1),
      SUBSTRING('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', FLOOR(RANDOM() * 36) + 1, 1),
      SUBSTRING('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', FLOOR(RANDOM() * 36) + 1, 1)
    );
    
    SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Функция для добавления бонуса пользователю
CREATE OR REPLACE FUNCTION add_user_bonus(
  p_user_telegram_id BIGINT,
  p_amount DECIMAL,
  p_reason TEXT,
  p_referral_use_id BIGINT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Вставляем или обновляем баланс
  INSERT INTO user_bonuses (user_telegram_id, total_earned, available_balance)
  VALUES (p_user_telegram_id, p_amount, p_amount)
  ON CONFLICT (user_telegram_id) DO UPDATE SET
    total_earned = user_bonuses.total_earned + p_amount,
    available_balance = user_bonuses.available_balance + p_amount,
    last_updated = NOW();
  
  -- Логируем транзакцию
  INSERT INTO bonus_transactions (user_telegram_id, type, amount, reason, related_referral_use_id)
  VALUES (p_user_telegram_id, 'earned', p_amount, p_reason, p_referral_use_id);
END;
$$ LANGUAGE plpgsql;

-- Функция для использования бонуса (скидка на заказ)
CREATE OR REPLACE FUNCTION use_user_bonus(
  p_user_telegram_id BIGINT,
  p_amount DECIMAL,
  p_order_id BIGINT
)
RETURNS BOOLEAN AS $$
DECLARE
  available DECIMAL;
BEGIN
  -- Проверяем доступный баланс
  SELECT available_balance INTO available FROM user_bonuses 
  WHERE user_telegram_id = p_user_telegram_id;
  
  IF available IS NULL OR available < p_amount THEN
    RETURN false;
  END IF;
  
  -- Списываем бонус
  UPDATE user_bonuses SET
    available_balance = available_balance - p_amount,
    spent = spent + p_amount,
    last_updated = NOW()
  WHERE user_telegram_id = p_user_telegram_id;
  
  -- Логируем транзакцию
  INSERT INTO bonus_transactions (user_telegram_id, type, amount, reason, related_order_id)
  VALUES (p_user_telegram_id, 'spent', p_amount, 'Скидка на заказ', p_order_id);
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;
