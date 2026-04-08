-- Миграция P8: Контент-менеджмент (страницы, баннеры, FAQ)
-- Дата: 2024
-- Описание: Создание таблиц для управления статическим контентом

-- Таблица для страниц (About, Contacts, Terms и т.д.)
CREATE TABLE IF NOT EXISTS pages (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  seo_description TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для баннеров на главной странице
CREATE TABLE IF NOT EXISTS banners (
  id SERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  link TEXT,
  title TEXT,
  description TEXT,
  order_index INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для FAQ (Часто задаваемые вопросы)
CREATE TABLE IF NOT EXISTS faq (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации поиска
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_published ON pages(is_published);
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active);
CREATE INDEX IF NOT EXISTS idx_banners_order ON banners(order_index);
CREATE INDEX IF NOT EXISTS idx_faq_active ON faq(is_active);
CREATE INDEX IF NOT EXISTS idx_faq_order ON faq(sort_order);

-- Комментарии для документации
COMMENT ON TABLE pages IS 'Статические страницы сайта (About, Contacts, Terms и т.д.)';
COMMENT ON TABLE pages.slug IS 'Уникальный идентификатор страницы (например: about, contacts, terms)';
COMMENT ON TABLE pages.title IS 'Название страницы (отображается в заголовке)';
COMMENT ON TABLE pages.content IS 'HTML контент страницы';
COMMENT ON TABLE pages.seo_description IS 'SEO описание для поисковых систем';

COMMENT ON TABLE banners IS 'Баннеры для отображения на главной странице';
COMMENT ON TABLE banners.image_url IS 'URL изображения баннера (Supabase или внешний URL)';
COMMENT ON TABLE banners.link IS 'Ссылка по клику на баннер (опционально)';
COMMENT ON TABLE banners.order_index IS 'Порядок отображения на странице';
COMMENT ON TABLE banners.is_active IS 'Активен ли баннер (видит ли его покупатель)';

COMMENT ON TABLE faq IS 'Часто задаваемые вопросы';
COMMENT ON TABLE faq.question IS 'Текст вопроса';
COMMENT ON TABLE faq.answer IS 'Текст ответа (может быть с форматированием)';
COMMENT ON TABLE faq.sort_order IS 'Порядок отображения на странице';
COMMENT ON TABLE faq.is_active IS 'Активен ли вопрос';
