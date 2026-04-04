# 💾 Database Schema

Полное описание всех таблиц PostgreSQL для VapeShop.

---

## 📊 Основные таблицы

### `users`

Профили пользователей Telegram.

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  username VARCHAR(255) UNIQUE,
  role ENUM('customer', 'seller', 'manager', 'admin', 'super_admin') DEFAULT 'customer',
  phone VARCHAR(20),
  email VARCHAR(255) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
```

| Колона | Тип | Описание |
|--------|-----|---------|
| id | SERIAL | Уникальный ID |
| telegram_id | BIGINT | ID пользователя в Telegram |
| first_name | VARCHAR | Имя из Telegram |
| last_name | VARCHAR | Фамилия из Telegram |
| username | VARCHAR | Username (@username) |
| role | ENUM | Роль: customer, seller, manager, admin, super_admin |
| phone | VARCHAR | Номер телефона |
| email | VARCHAR | Электронная почта |
| is_active | BOOLEAN | Активен ли пользователь |
| created_at | TIMESTAMP | Дата регистрации |
| updated_at | TIMESTAMP | Дата последнего обновления |

---

### `categories`

Категории товаров.

```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  icon_url VARCHAR(255),
  position INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

| Колона | Тип | Описание |
|--------|-----|---------|
| id | SERIAL | Уникальный ID |
| name | VARCHAR | Название категории (e.g., "Pods", "Liquids") |
| description | TEXT | Описание |
| icon_url | VARCHAR | URL иконки |
| position | INT | Порядок отображения |
| is_active | BOOLEAN | Видима ли категория |
| created_at | TIMESTAMP | Дата создания |

---

### `products`

Каталог товаров.

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  category_id INT REFERENCES categories(id),
  image_url VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_deleted_at ON products(deleted_at);
```

| Колона | Тип | Описание |
|--------|-----|---------|
| id | SERIAL | Уникальный ID |
| name | VARCHAR | Название товара |
| description | TEXT | Описание и характеристики |
| price | DECIMAL | Цена в рублях |
| stock | INT | Количество в наличии |
| category_id | INT FK | Ссылка на категорию |
| image_url | VARCHAR | URL основного изображения |
| is_active | BOOLEAN | Видим ли товар (soft delete) |
| deleted_at | TIMESTAMP | Дата удаления (soft delete) |
| created_at | TIMESTAMP | Дата добавления |
| updated_at | TIMESTAMP | Дата обновления |

---

### `cart_items`

Товары в корзинах пользователей.

```sql
CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id),
  product_id INT NOT NULL REFERENCES products(id),
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_telegram_id, product_id)
);

-- Индексы
CREATE INDEX idx_cart_items_user_id ON cart_items(user_telegram_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);
```

| Колона | Тип | Описание |
|--------|-----|---------|
| id | SERIAL | Уникальный ID |
| user_telegram_id | BIGINT FK | Кто добавил |
| product_id | INT FK | Какой товар |
| quantity | INT | Количество |
| created_at | TIMESTAMP | Когда добавлено |
| updated_at | TIMESTAMP | Когда обновлено |

---

### `orders`

История заказов.

```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id),
  status ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded') 
    DEFAULT 'pending',
  total DECIMAL(10, 2) NOT NULL,
  delivery_type VARCHAR(20),  -- 'pickup', 'courier'
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  cancelled_at TIMESTAMP
);

-- Индексы
CREATE INDEX idx_orders_user_id ON orders(user_telegram_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

| Колона | Тип | Описание |
|--------|-----|---------|
| id | SERIAL | Уникальный номер заказа |
| user_telegram_id | BIGINT FK | Кто заказал |
| status | ENUM | Статус: pending, paid, shipped, delivered, cancelled, refunded |
| total | DECIMAL | Сумма заказа |
| delivery_type | VARCHAR | Тип доставки: pickup, courier |
| address | TEXT | Адрес доставки |
| notes | TEXT | Примечания |
| created_at | TIMESTAMP | Дата создания |
| paid_at | TIMESTAMP | Дата оплаты |
| shipped_at | TIMESTAMP | Дата отправки |
| delivered_at | TIMESTAMP | Дата доставки |
| cancelled_at | TIMESTAMP | Дата отмены |

---

### `order_items`

Товары в каждом заказе.

```sql
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id),
  product_id INT NOT NULL REFERENCES products(id),
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,  -- Цена в момент заказа
  created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
```

| Колона | Тип | Описание |
|--------|-----|---------|
| id | SERIAL | Уникальный ID |
| order_id | INT FK | Номер заказа |
| product_id | INT FK | ID товара |
| quantity | INT | Количество |
| price | DECIMAL | Цена в момент заказа (может отличаться от текущей) |
| created_at | TIMESTAMP | Когда добавлено |

---

## ⭐ ОТЗЫВЫ И РЕЙТИНГ

### `reviews`

Отзывы пользователей на товары.

```sql
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id),
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  text TEXT,
  image_urls TEXT[],  -- Array of URLs
  helpful_count INT DEFAULT 0,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  cashback_awarded BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  UNIQUE(product_id, user_telegram_id)
);

-- Индексы
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_telegram_id);
CREATE INDEX idx_reviews_status ON reviews(status);
```

| Колона | Тип | Описание |
|--------|-----|---------|
| id | SERIAL | Уникальный ID |
| product_id | INT FK | На какой товар |
| user_telegram_id | BIGINT FK | От кого |
| rating | INT | Оценка 1-5 |
| title | VARCHAR | Заголовок отзыва |
| text | TEXT | Текст отзыва |
| image_urls | TEXT[] | Массив URL изображений |
| helpful_count | INT | Сколько отметили как полезно |
| status | ENUM | pending, approved, rejected |
| cashback_awarded | BOOLEAN | Выплачен ли кэшбэк |
| created_at | TIMESTAMP | Дата написания |
| approved_at | TIMESTAMP | Дата одобрения админом |

---

## 🎁 РЕФЕРАЛЬНАЯ СИСТЕМА

### `referral_codes`

Реферальные коды пользователей.

```sql
CREATE TABLE referral_codes (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL UNIQUE REFERENCES users(telegram_id),
  code VARCHAR(20) NOT NULL UNIQUE,
  bonus_per_use DECIMAL(10, 2) DEFAULT 500,
  max_uses INT,
  current_uses INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_codes_user_id ON referral_codes(user_telegram_id);
```

| Колона | Тип | Описание |
|--------|-----|---------|
| id | SERIAL | Уникальный ID |
| user_telegram_id | BIGINT FK | Кто владелец кода |
| code | VARCHAR | Сам код (e.g., JOHN123) |
| bonus_per_use | DECIMAL | Бонус при использовании |
| max_uses | INT | Максимум использований |
| current_uses | INT | Уже использовано |
| is_active | BOOLEAN | Активен ли код |
| created_at | TIMESTAMP | Дата создания |

---

### `referral_uses`

История использования реферальных кодов.

```sql
CREATE TABLE referral_uses (
  id SERIAL PRIMARY KEY,
  referral_code_id INT NOT NULL REFERENCES referral_codes(id),
  new_user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id),
  bonus_amount DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(referral_code_id, new_user_telegram_id)
);

-- Индексы
CREATE INDEX idx_referral_uses_code_id ON referral_uses(referral_code_id);
CREATE INDEX idx_referral_uses_user_id ON referral_uses(new_user_telegram_id);
```

| Колона | Тип | Описание |
|--------|-----|---------|
| id | SERIAL | Уникальный ID |
| referral_code_id | INT FK | Какой код использовали |
| new_user_telegram_id | BIGINT FK | Новый пользователь |
| bonus_amount | DECIMAL | Размер бонуса |
| created_at | TIMESTAMP | Когда использовано |

---

### `user_bonuses`

Баланс бонусов каждого пользователя.

```sql
CREATE TABLE user_bonuses (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL UNIQUE REFERENCES users(telegram_id),
  total_earned DECIMAL(10, 2) DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  current_balance DECIMAL(10, 2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_user_bonuses_user_id ON user_bonuses(user_telegram_id);
```

| Колона | Тип | Описание |
|--------|-----|---------|
| id | SERIAL | Уникальный ID |
| user_telegram_id | BIGINT FK | Пользователь |
| total_earned | DECIMAL | Всего заработано бонусов |
| total_spent | DECIMAL | Всего потрачено |
| current_balance | DECIMAL | Текущий баланс |
| updated_at | TIMESTAMP | Дата последнего обновления |

---

## 💾 ОТЛОЖЕННЫЕ ТОВАРЫ И СРАВНЕНИЯ

### `saved_for_later`

Отложенная корзина (Save for Later).

```sql
CREATE TABLE saved_for_later (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id),
  product_id INT NOT NULL REFERENCES products(id),
  saved_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_telegram_id, product_id)
);

-- Индексы
CREATE INDEX idx_saved_for_later_user_id ON saved_for_later(user_telegram_id);
CREATE INDEX idx_saved_for_later_product_id ON saved_for_later(product_id);
```

---

### `product_comparisons`

Сохранённые сравнения товаров.

```sql
CREATE TABLE product_comparisons (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id),
  product_ids INT[] NOT NULL,  -- Array of product IDs (max 4)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_product_comparisons_user_id ON product_comparisons(user_telegram_id);
```

---

## 📋 АУДИТ И ЛОГИРОВАНИЕ

### `audit_log`

История всех критичных действий (DELETE, UPDATE).

```sql
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT REFERENCES users(telegram_id),
  action VARCHAR(50) NOT NULL,  -- 'DELETE', 'UPDATE', 'INSERT'
  table_name VARCHAR(100) NOT NULL,
  record_id INT,
  details JSONB,  -- Дополнительная информация
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_audit_log_user_id ON audit_log(user_telegram_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
```

| Колона | Тип | Описание |
|--------|-----|---------|
| id | SERIAL | Уникальный ID |
| user_telegram_id | BIGINT FK | Кто совершил действие |
| action | VARCHAR | DELETE, UPDATE, INSERT |
| table_name | VARCHAR | Какая таблица затронута |
| record_id | INT | ID записи |
| details | JSONB | JSON с изменениями |
| ip_address | INET | IP адрес |
| user_agent | TEXT | User-Agent браузера |
| created_at | TIMESTAMP | Когда произошло |

---

## ⚙️ КОНФИГУРАЦИЯ

### `settings`

Глобальные настройки приложения.

```sql
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

| Колона | Тип | Описание |
|--------|-----|---------|
| key | VARCHAR | Ключ (e.g., "min_order_amount") |
| value | TEXT | Значение |
| description | TEXT | Описание |

**Примеры**:
```
min_order_amount = 100
max_order_amount = 50000
review_cashback = 50
referral_bonus = 500
```

---

## 🔗 СВЯЗИ МЕЖДУ ТАБЛИЦАМИ

```
users ─────┬─── cart_items ──── products
           │
           ├─── orders ─────┬─── order_items ──── products
           │                │
           │                └─── audit_log
           │
           ├─── reviews ─────┬─── products
           │                │
           │                └─── audit_log
           │
           ├─── referral_codes ─── referral_uses
           │
           ├─── user_bonuses
           │
           ├─── saved_for_later ── products
           │
           └─── product_comparisons

categories ─── products
```

---

## 🚀 ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ

```sql
-- Поиск пользователя
CREATE INDEX idx_users_telegram_id ON users(telegram_id);

-- Фильтрация товаров
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_category_id ON products(category_id);

-- Корзина пользователя
CREATE INDEX idx_cart_items_user_id ON cart_items(user_telegram_id);

-- Заказы пользователя
CREATE INDEX idx_orders_user_id ON orders(user_telegram_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Отзывы товара
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_status ON reviews(status);

-- Аудит
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
```

---

## 📝 МИГРАЦИИ

Все миграции находятся в `db/migrations/`:

- `001_init.sql` - Инициализация схемы
- `002_orders.sql` - Таблицы заказов
- ...
- `018_referral_system.sql` - Реферальная система
- `019_saved_for_later.sql` - Отложенная корзина
- `020_product_reviews.sql` - Система отзывов
- `021_product_comparison.sql` - Сравнение товаров

Все миграции **идемпотентны** (можно запускать несколько раз).

---

## 🔄 Заполнение начальными данными

```sql
-- Категории
INSERT INTO categories (name, description, position)
VALUES 
  ('Pods', 'Картридж-системы', 1),
  ('Liquids', 'Жидкости для вейпа', 2),
  ('Accessories', 'Аксессуары', 3);

-- Товары
INSERT INTO products (name, description, price, stock, category_id)
VALUES 
  ('Vape Pod 3000', 'High-performance pod', 1500.00, 50, 1),
  ('Premium Liquid 50ml', 'Smooth flavor', 800.00, 100, 2);

-- Настройки
INSERT INTO settings (key, value, description)
VALUES 
  ('min_order_amount', '100', 'Минимальная сумма заказа'),
  ('review_cashback', '50', 'Кэшбэк за отзыв');
```

---

**Версия**: 1.0.0  
**Дата**: 2026-04-04
