-- SPRINT 4: Общие улучшения - Геймификация, A/B тестирование, аналитика

-- 1. Уровни и бейджи пользователей
CREATE TABLE IF NOT EXISTS user_levels (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE UNIQUE,
  level INT DEFAULT 1, -- 1, 2, 3, 4, 5
  experience INT DEFAULT 0,
  badges TEXT[] DEFAULT ARRAY[]::TEXT[], -- 'first_purchase', 'reviewer', 'referrer', etc.
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_levels_user ON user_levels(user_id);

-- 2. Лидерборд
CREATE TABLE IF NOT EXISTS leaderboard (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE UNIQUE,
  total_spent DECIMAL(10,2) DEFAULT 0,
  rank INT,
  period VARCHAR(50) DEFAULT 'all', -- 'week', 'month', 'all'
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard(rank);

-- 3. A/B тестирование
CREATE TABLE IF NOT EXISTS ab_tests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  variant_a TEXT,
  variant_b TEXT,
  metric VARCHAR(100), -- 'click_rate', 'conversion', 'revenue'
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed'
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Результаты A/B тестирования
CREATE TABLE IF NOT EXISTS ab_test_results (
  id SERIAL PRIMARY KEY,
  test_id INT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  variant VARCHAR(1), -- 'A' or 'B'
  result DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_test ON ab_test_results(test_id);

-- 5. События для аналитики
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
  event_name VARCHAR(255) NOT NULL,
  event_properties JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);

-- 6. SEO метаданные страниц
CREATE TABLE IF NOT EXISTS seo_metadata (
  id SERIAL PRIMARY KEY,
  page_path VARCHAR(500) UNIQUE,
  title VARCHAR(255),
  description VARCHAR(500),
  keywords VARCHAR(500),
  og_image VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);
