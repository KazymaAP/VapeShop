# 📊 Структура базы данных VapeShop

## Описание

Полная документация по миграциям и схеме базы данных PostgreSQL для проекта VapeShop.

## Миграции

### Порядок применения миграций

Все миграции должны выполняться **в последовательном порядке** от 001 до 008:

```bash
# Миграции применяются автоматически при запуске приложения
# Или вручную через psql:
psql -U user -d vapeshop -f db/migrations/001_initial_schema.sql
psql -U user -d vapeshop -f db/migrations/002_telegram_stars_payment.sql
psql -U user -d vapeshop -f db/migrations/003_notification_settings.sql
psql -U user -d vapeshop -f db/migrations/004_delivery_management.sql
psql -U user -d vapeshop -f db/migrations/008_content_management.sql
```

### 001 - Базовая схема (initial_schema.sql)

**Создает:** Базовые таблицы системы

- **users** - Пользователи (Telegram профили)
  - `telegram_id` (BIGINT PRIMARY KEY) - Telegram ID
  - `role` (VARCHAR) - Роль: admin, manager, seller, customer
  - `is_blocked` (BOOLEAN) - Флаг блокировки
  - `username`, `first_name`, `last_name` - Данные профиля
- **categories** - Категории товаров
  - `id` (SERIAL PRIMARY KEY)
  - `name` (VARCHAR UNIQUE) - Название категории
  - `icon_emoji` (VARCHAR) - Эмодзи категории
  - `sort_order` (INT) - Порядок сортировки

- **brands** - Бренды
  - `id` (SERIAL PRIMARY KEY)
  - `name` (VARCHAR UNIQUE) - Название бренда
  - `logo_url` (TEXT) - URL логотипа

- **products** - Товары
  - `id` (SERIAL PRIMARY KEY)
  - `name`, `specification` - Наименование и характеристики
  - `price` (DECIMAL) - Цена
  - `stock` (INT) - Остаток на складе
  - `category_id`, `brand_id` - Связи с категорией и брендом
  - `images` (TEXT[]) - Массив URL изображений
  - `is_promotion`, `is_hit`, `is_new` (BOOLEAN) - Флаги товара
  - `rating` (DECIMAL) - Средний рейтинг

- **cart_items** - Товары в корзине пользователя
  - `id` (SERIAL PRIMARY KEY)
  - `user_telegram_id` (BIGINT) - Телеграм ID пользователя
  - `product_id` (INT) - ID товара
  - `quantity` (INT) - Количество
  - Уникальность: (user_telegram_id, product_id)

- **price_import** - Импортированные товары (CSV)
  - `id` (SERIAL PRIMARY KEY)
  - `name`, `specification` - Название и характеристики
  - `price_tier_1, price_tier_2, price_tier_3` - Цены по уровням
  - `distributor_price` - Дистрибьюторская цена
  - `is_activated` (BOOLEAN) - Активирован ли товар

- **order_items** - Товары в заказе
  - `id` (SERIAL PRIMARY KEY)
  - `order_id` (UUID) - ID заказа
  - `product_id` (INT) - ID товара
  - `quantity`, `price` - Количество и цена

- **reviews** - Отзывы и рейтинги
  - `id` (SERIAL PRIMARY KEY)
  - `product_id` (INT) - ID товара
  - `user_telegram_id` (BIGINT) - ID пользователя
  - `rating` (INT) - Рейтинг 1-5
  - `comment` (TEXT) - Текст отзыва
  - `is_verified` (BOOLEAN) - Проверенный покупатель

- **wishlist** - Избранное (wishlist)
  - `id` (SERIAL PRIMARY KEY)
  - `user_telegram_id` (BIGINT) - ID пользователя
  - `product_id` (INT) - ID товара

**Статус:** ✅ Production Ready

### 002 - Платежи Telegram Stars (telegram_stars_payment.sql)

**Создает:** Таблицы для управления заказами и платежами

- **orders** - Заказы
  - `id` (UUID PRIMARY KEY)
  - `user_telegram_id` (BIGINT) - ID пользователя
  - `status` (VARCHAR) - Статус заказа (pending, new, confirmed, readyship, shipped, done, cancelled)
  - `total` (DECIMAL) - Сумма заказа
  - `code_6digit` (INT) - 6-значный код доставки
  - `code_expires_at` (TIMESTAMP) - Время истечения кода (24 часа)
  - `paid_at` (TIMESTAMP) - Время оплаты
  - Поля доставки: `delivery_method`, `pickup_point_id`, `address`, `delivery_date`
  - `promo_code`, `discount` - Промокод и размер скидки

- **payment_logs** - Логи платежей
  - Для отладки платежей через Telegram Stars

- **delivery_codes** - Коды доставки (альтернативное хранилище)

**Статус:** ✅ Production Ready

### 003 - Уведомления (notification_settings.sql)

**Создает:** Таблицы для системы уведомлений

- **notification_settings** - Настройки типов уведомлений
  - Управление включением/отключением типов событий
  - События: order_new_admin, order_status_changed_buyer, abandoned_cart

- **notification_history** - История отправленных уведомлений
  - Логирование всех сообщений для аналитики

- **abandoned_carts** - Брошенные корзины
  - Отслеживание корзин для кампаний восстановления

**Статус:** ✅ Production Ready

### 004 - Доставка (delivery_management.sql)

**Создает:** Таблицы для управления доставкой

- **pickup_points** - Пункты выдачи товаров
  - `id` (UUID PRIMARY KEY)
  - `name` - Название пункта
  - `address` - Адрес
  - `is_active` (BOOLEAN) - Активен ли пункт

- **addresses** - Адреса пользователей для курьерской доставки
  - `id` (UUID PRIMARY KEY)
  - `user_telegram_id` (BIGINT) - ID пользователя
  - `address` (TEXT) - Адрес доставки
  - `is_default` (BOOLEAN) - Адрес по умолчанию

**Статус:** ✅ Production Ready

### 008 - Контент-менеджмент (content_management.sql)

**Создает:** Таблицы для управления статическим контентом

- **pages** - Страницы сайта
  - `slug` (TEXT PRIMARY KEY) - Уникальный идентификатор (about, contacts, etc.)
  - `title` - Заголовок страницы
  - `content` - HTML содержимое
  - `seo_description` - Для SEO

- **banners** - Баннеры на главной
  - `id` (SERIAL PRIMARY KEY)
  - `image_url` - URL изображения
  - `link` - Ссылка при клике
  - `order_index` - Порядок отображения
  - `is_active` (BOOLEAN) - Активен ли баннер

- **faq** - Часто задаваемые вопросы
  - `id` (SERIAL PRIMARY KEY)
  - `question` - Вопрос
  - `answer` - Ответ
  - `sort_order` - Порядок сортировки

**Статус:** ✅ Production Ready

### Отсутствующие миграции (создаются в 001)

Миграции для P5-P7 объединены в миграцию 001:

- **005** - CSV импорт (table price_import создается в 001)
- **006** - Промокоды (table promocodes должна быть, см. P6)
- **007** - Канбан-доска (не требует отдельной таблицы)

## Производство

### Проверка статуса миграций

```sql
-- Проверить все таблицы
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Проверить структуру таблицы
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products';

-- Проверить индексы
SELECT * FROM pg_indexes
WHERE tablename = 'products';
```

## Справка по статусам заказов

| Статус      | Описание                      |
| ----------- | ----------------------------- |
| `pending`   | Ожидание оплаты               |
| `new`       | Оплачен, ожидает комплектации |
| `confirmed` | Подтвержден менеджером        |
| `readyship` | Готов к отправке              |
| `shipped`   | Отправлен                     |
| `done`      | Завершен (код проверен)       |
| `cancelled` | Отменен                       |

---

**Версия документации:** 1.0  
**Последнее обновление:** 2024
