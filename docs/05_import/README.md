# 📦 Phase P5: Импорт товаров и активация

**Версия:** 1.0  
**Дата:** 2025  
**Автор:** VapeShop Team

## 📋 Оглавление

1. [Обзор системы импорта](#-обзор-системы-импорта)
2. [Архитектура](#-архитектура)
3. [Компоненты системы](#-компоненты-системы)
4. [Процесс использования](#-процесс-использования)
5. [Требования к CSV](#-требования-к-csv)
6. [Активация товаров](#-активация-товаров)
7. [API Endpoints](#-api-endpoints)
8. [Безопасность](#-безопасность)
9. [Решение проблем](#-решение-проблем)
10. [FAQ](#-faq)

---

## 📋 Обзор системы импорта

### Что это?

Система импорта товаров — это специализированный модуль управления каталогом товаров для интернет-магазина VapeShop. Система позволяет быстро загружать большие партии товаров из CSV файлов, проверять данные и активировать их в основном каталоге.

### Основные возможности

- ✅ **Массовая загрузка товаров** через CSV файлы
- ✅ **Двухэтапная проверка** — валидация и активация
- ✅ **Управление ценами** — выбор ценовых уровней (4 варианта)
- ✅ **Автоматическая проверка дубликатов** по названию
- ✅ **Загрузка изображений** при активации
- ✅ **Полная история операций** для аудита

### Для кого?

| Роль                 | Возможности                                  |
| -------------------- | -------------------------------------------- |
| **Администратор**    | Полный доступ к импорту, активации, удалению |
| **Менеджер товаров** | Импорт, просмотр и активация товаров         |
| **Система**          | Валидация, логирование, аудит всех операций  |

---

## 🏗️ Архитектура

### Диаграмма процесса

```
┌─────────────────────────────────────────────────────────────┐
│                    СИСТЕМА ИМПОРТА ТОВАРОВ                  │
└─────────────────────────────────────────────────────────────┘

            ┌─────────────────┐
            │  CSV FILE       │
            │ (raw data)      │
            └────────┬────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │ ЭТАП 1: ЗАГРУЗКА CSV   │
        │ (/admin/import)        │
        │ • Валидация структуры  │
        │ • Проверка дубликатов  │
        │ • Сохранение временно  │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │ ТАБЛИЦА: price_import  │
        │ (временное хранилище)  │
        │ id_imported = false    │
        └────────┬───────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
    ┌──────────┐    ┌──────────────┐
    │ Удалить  │    │ ЭТАП 2:      │
    │ (DELETE) │    │ ПРОСМОТР     │
    └──────────┘    │ (/price-import)│
                    │ Фильтры/поиск │
                    └────────┬──────┘
                             │
                             ▼
                    ┌────────────────────────┐
                    │ ЭТАП 3: АКТИВАЦИЯ      │
                    │ (/admin/activate)      │
                    │ • Выбор цены           │
                    │ • Выбор категории      │
                    │ • Загрузка изображений │
                    │ • Установка флагов     │
                    └────────┬───────────────┘
                             │
                             ▼
                    ┌────────────────────────┐
                    │ ТАБЛИЦА: products      │
                    │ (основной каталог)     │
                    │ Товар в продаже! ✓     │
                    └────────────────────────┘
```

### Три этапа процесса

| Этап | Название         | Компонент                     | Описание                                          |
| ---- | ---------------- | ----------------------------- | ------------------------------------------------- |
| 1️⃣   | **Загрузка CSV** | POST `/api/admin/import`      | Получение и валидация CSV, временное сохранение   |
| 2️⃣   | **Проверка**     | GET `/api/admin/price-import` | Просмотр импортированных товаров, фильтрация      |
| 3️⃣   | **Активация**    | POST `/api/admin/activate`    | Выбор параметров и перемещение в основной каталог |

---

## 📊 Компоненты системы

### Таблица: `price_import`

Временное хранилище импортированных товаров.

```sql
CREATE TABLE price_import (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  specification TEXT,
  stock INT NOT NULL,
  price_tier_1 DECIMAL(10,2),
  price_tier_2 DECIMAL(10,2),
  price_tier_3 DECIMAL(10,2),
  distributor_price DECIMAL(10,2),
  duplicate_name VARCHAR(255),  -- Если найден дубликат
  is_activated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activated_at TIMESTAMP NULL,
  product_id INT NULL REFERENCES products(id),
  error_message TEXT NULL
);
```

### Таблица: `products` (основной каталог)

Основная таблица товаров (существующая).

```sql
-- Расширенные поля для импорта:
ALTER TABLE products ADD COLUMN IF NOT EXISTS:
  import_source VARCHAR(50),     -- 'csv_import', 'manual'
  import_batch_id INT,           -- Связь с импортом
  price_tier_id INT,             -- Выбранный ценовый уровень
  is_promotion BOOLEAN DEFAULT FALSE,
  is_bestseller BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE
```

### Компоненты UI

| Путь                  | Компонент       | Функция               |
| --------------------- | --------------- | --------------------- |
| `/admin/import`       | Upload форма    | Загрузка CSV файла    |
| `/admin/price-import` | Таблица товаров | Просмотр и управление |
| `/admin/activate`     | Модальное окно  | Активация товаров     |

### API маршруты

- `POST /api/admin/import` — загрузка CSV
- `GET /api/admin/price-import` — список импортированных
- `POST /api/admin/activate` — активация товара
- `DELETE /api/admin/price-import/[id]` — удаление из очереди

---

## 🚀 Процесс использования

### Шаг 1: Подготовка CSV файла

Подготовьте CSV файл со следующей структурой:

```
name,specification,stock,price_tier_1,price_tier_2,price_tier_3,distributor_price
```

**Пример:**

```
Vape Pod Pro,Никотин 20мг, 50 мл,100,250.00,230.00,200.00,150.00
Atomizer RDA,Диаметр 24мм,75,180.00,165.00,150.00,100.00
```

### Шаг 2: Загрузить CSV (страница `/admin/import`)

1. Перейти на страницу `/admin/import`
2. Нажать кнопку "Загрузить CSV"
3. Выбрать файл (макс. размер 10 МБ)
4. Система проверит структуру и дубликаты
5. При успехе — товары появятся в таблице с статусом "неактивирован"

**Возможные ошибки:**

- ❌ **Неверный формат CSV** — проверьте наличие всех колонок
- ❌ **Дубликаты найдены** — товары с такими именами уже есть
- ❌ **Некорректные цены** — цены должны быть числами

### Шаг 3: Просмотреть импортированные (страница `/admin/price-import`)

1. Перейти на `/admin/price-import`
2. Таблица показывает все загруженные товары
3. Фильтры:
   - **По статусу:** неактивирован / активирован
   - **По названию:** быстрый поиск
   - **По дате:** последние загрузки

**Действия:**

- 👁️ **Просмотр деталей** — открыть полную информацию
- ✏️ **Активировать** — перейти к шагу активации
- 🗑️ **Удалить** — удалить из очереди импорта

### Шаг 4: Активировать товары (страница `/admin/activate`)

1. На странице `/admin/price-import` нажать "Активировать" на товаре
2. Откроется модальное окно с форма для заполнения:
   - **Выбор цены** (4 варианта: tier_1, tier_2, tier_3, distributor)
   - **Категория** (выпадающий список)
   - **Бренд** (опционально)
   - **Изображение** (загрузить или использовать по умолчанию)
   - **Флаги:** Акция, Хит, Новинка
3. Нажать "Активировать"
4. Товар перемещается в основной каталог (`products`)

### Шаг 5: Готово в каталоге

Товар становится доступен на сайте и в API:

```
GET /api/products/[id] — товар доступен покупателям
```

---

## 📝 Требования к CSV

### Обязательные колонки

| Колонка             | Тип     | Пример       | Описание                                   |
| ------------------- | ------- | ------------ | ------------------------------------------ |
| `name`              | TEXT    | Vape Pod Pro | Название товара (макс. 255 символов)       |
| `specification`     | TEXT    | Никотин 20мг | Спецификация (опубликуется как описание)   |
| `stock`             | INT     | 100          | Количество на складе (положительное число) |
| `price_tier_1`      | DECIMAL | 250.00       | Цена уровня 1 (рознич на кол-во)           |
| `price_tier_2`      | DECIMAL | 230.00       | Цена уровня 2 (от 10 шт)                   |
| `price_tier_3`      | DECIMAL | 200.00       | Цена уровня 3 (от 50 шт)                   |
| `distributor_price` | DECIMAL | 150.00       | Цена для дистрибьюторов (от 100 шт)        |

### Формат CSV

```csv
name,specification,stock,price_tier_1,price_tier_2,price_tier_3,distributor_price
Vape Pod Pro,Никотин 20мг 50 мл,100,250.00,230.00,200.00,150.00
Atomizer RDA,Диаметр 24мм Нержавейка,75,180.00,165.00,150.00,100.00
Coil Kanthal,0.4 Ohm 10 штук,200,120.00,110.00,100.00,70.00
```

### ✅ Правильный формат

- ✓ Кодировка: **UTF-8**
- ✓ Разделитель: **запятая (,)**
- ✓ Цены: **точка (.) как разделитель**
- ✓ Первая строка: **заголовки колонок**
- ✓ Размер файла: **до 10 МБ**
- ✓ Максимум строк: **10 000 товаров за один импорт**

### ❌ Неправильный формат

```csv
# ❌ Неверная кодировка (Windows-1251)
# ❌ Разделитель точка с запятой (;)
# ❌ Цены через запятую: 250,00 (должно 250.00)
# ❌ Отсутствует обязательная колонка
# ❌ Пустые строки в середине файла
```

### Пример полного CSV файла

```csv
name,specification,stock,price_tier_1,price_tier_2,price_tier_3,distributor_price
Vape Pod Pro Ultra,Никотин 20мг 50 мл Вишня,100,250.00,230.00,200.00,150.00
Atomizer RDA Genesis,Диаметр 24мм Нержавейка 316L,75,180.00,165.00,150.00,100.00
Coil Kanthal A1,0.4 Ohm 10 штук в упаковке,200,120.00,110.00,100.00,70.00
Хлопок органический,100% хлопок премиум,150,85.00,75.00,65.00,45.00
Мод BOX TC,200W 2 аккумулятора Черный,50,2500.00,2300.00,2100.00,1800.00
Жидкость для вейпа,Фруктовый микс 30 мл,500,199.00,180.00,160.00,120.00
```

---

## 🔄 Активация товаров

### Диаграмма активации

```
Товар в очереди (price_import)
         │
         ├─ Проверка наличия
         ├─ Выбор цены (4 варианта)
         ├─ Выбор категории
         ├─ Загрузка изображения
         └─ Установка флагов
         │
         ▼
Товар в каталоге (products)
```

### Выбор цены (4 варианта)

При активации администратор выбирает одну из четырех загруженных цен:

| Цена                | Поле                | Применение   | Пример |
| ------------------- | ------------------- | ------------ | ------ |
| 💰 **Tier 1**       | `price_tier_1`      | Розница 1 шт | 250.00 |
| 💵 **Tier 2**       | `price_tier_2`      | От 10 шт     | 230.00 |
| 💴 **Tier 3**       | `price_tier_3`      | От 50 шт     | 200.00 |
| 📦 **Дистрибьютор** | `distributor_price` | От 100 шт    | 150.00 |

**По умолчанию:** выбирается `price_tier_1` (розница)

### Выбор категории и бренда

```
Категория (обязательно):
  - Модули/Боксы
  - Атомайзеры
  - Расходники
  - Жидкости
  - Аксессуары

Бренд (опционально):
  - Вавада
  - GeekVape
  - Voopoo
  - (собственное имя)
```

### Загрузка изображений

- **Основное изображение:** обязательно (JPG/PNG, макс. 5 МБ)
- **Дополнительные изображения:** опционально (до 5 штук)
- **Формат:** JPG или PNG
- **Размер:** рекомендуется 800x800px (минимум 400x400px)

### Флаги активации

```javascript
{
  "is_promotion": false,    // Товар на акции
  "is_bestseller": false,   // Хит продаж (звезда)
  "is_new": false           // Новое поступление
}
```

### Форма активации (JSON)

```json
{
  "id_imported": 42,
  "price_tier": "price_tier_1",
  "category_id": 5,
  "brand_name": "GeekVape",
  "image_url": "https://cdn.vapeshop.ru/products/42.jpg",
  "additional_images": ["image1.jpg", "image2.jpg"],
  "is_promotion": true,
  "is_bestseller": false,
  "is_new": true
}
```

---

## ⚙️ API Endpoints

### 1. POST `/api/admin/import`

**Загрузка CSV файла**

**Запрос:**

```bash
curl -X POST http://localhost:3000/api/admin/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@products.csv"
```

**Ответ (200 OK):**

```json
{
  "success": true,
  "message": "Загружено 150 товаров",
  "stats": {
    "total": 150,
    "new": 148,
    "duplicates": 2
  },
  "duplicates": [
    {
      "name": "Vape Pod Pro",
      "count": 2,
      "existing_id": 5
    }
  ]
}
```

**Ошибки:**

```json
{
  "success": false,
  "error": "INVALID_CSV_FORMAT",
  "message": "Отсутствует колонка: price_tier_1"
}
```

### 2. GET `/api/admin/price-import`

**Получение списка импортированных товаров**

**Запрос:**

```bash
curl -X GET "http://localhost:3000/api/admin/price-import?status=inactive&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Query параметры:**

| Параметр | Тип    | Описание                              |
| -------- | ------ | ------------------------------------- |
| `status` | string | `inactive` или `active`               |
| `search` | string | Поиск по названию                     |
| `page`   | int    | Номер страницы (по умолчанию 1)       |
| `limit`  | int    | Товаров на странице (по умолчанию 20) |

**Ответ (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "name": "Vape Pod Pro",
      "specification": "Никотин 20мг 50 мл",
      "stock": 100,
      "price_tier_1": 250.0,
      "price_tier_2": 230.0,
      "price_tier_3": 200.0,
      "distributor_price": 150.0,
      "is_activated": false,
      "created_at": "2025-04-02T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "pages": 8,
    "limit": 20
  }
}
```

### 3. POST `/api/admin/activate`

**Активация товара в каталоге**

**Запрос:**

```bash
curl -X POST http://localhost:3000/api/admin/activate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id_imported": 42,
    "price_tier": "price_tier_1",
    "category_id": 5,
    "brand_name": "GeekVape",
    "image_url": "https://cdn.vapeshop.ru/products/42.jpg",
    "is_promotion": true,
    "is_bestseller": false,
    "is_new": true
  }'
```

**Body параметры:**

| Параметр        | Тип    | Обязательно | Описание                                             |
| --------------- | ------ | ----------- | ---------------------------------------------------- |
| `id_imported`   | int    | ✓           | ID товара в price_import                             |
| `price_tier`    | string | ✓           | Выбранная цена (tier_1, tier_2, tier_3, distributor) |
| `category_id`   | int    | ✓           | ID категории товара                                  |
| `brand_name`    | string | ✗           | Название бренда                                      |
| `image_url`     | string | ✗           | URL основного изображения                            |
| `is_promotion`  | bool   | ✗           | Флаг акции (по умолчанию false)                      |
| `is_bestseller` | bool   | ✗           | Флаг хита (по умолчанию false)                       |
| `is_new`        | bool   | ✗           | Флаг новинки (по умолчанию false)                    |

**Ответ (201 Created):**

```json
{
  "success": true,
  "message": "Товар активирован",
  "product_id": 128,
  "data": {
    "id": 128,
    "name": "Vape Pod Pro",
    "slug": "vape-pod-pro",
    "category_id": 5,
    "brand": "GeekVape",
    "price": 250.0,
    "stock": 100,
    "is_active": true,
    "created_at": "2025-04-02T10:05:00Z"
  }
}
```

**Ошибки:**

```json
{
  "success": false,
  "error": "PRODUCT_ALREADY_ACTIVE",
  "message": "Товар уже активирован"
}
```

### 4. DELETE `/api/admin/price-import/[id]`

**Удаление товара из очереди импорта**

**Запрос:**

```bash
curl -X DELETE http://localhost:3000/api/admin/price-import/42 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Ответ (200 OK):**

```json
{
  "success": true,
  "message": "Товар удалён из очереди"
}
```

**Ошибка:**

```json
{
  "success": false,
  "error": "PRODUCT_NOT_FOUND",
  "message": "Товар не найден"
}
```

---

## 🔐 Безопасность

### Аутентификация и авторизация

```javascript
// Все API endpoints требуют:
✓ Valid JWT токен в заголовке Authorization
✓ Роль пользователя: admin или manager

if (!user.role.includes('admin', 'manager')) {
  return res.status(403).json({ error: 'FORBIDDEN' });
}
```

### Валидация данных

```javascript
// Входные данные валидируются:
✓ CSV структура (наличие всех колонок)
✓ Типы данных (цены - decimal, stock - int)
✓ Диапазоны значений (цены > 0, stock >= 0)
✓ Размер файла (макс. 10 МБ)
✓ Формат изображений (JPG/PNG, макс. 5 МБ)
```

### Логирование операций

```sql
CREATE TABLE import_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  action VARCHAR(50),        -- 'upload', 'activate', 'delete'
  product_count INT,
  status VARCHAR(20),        -- 'success', 'error'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Все действия логируются:**

- 📝 Загрузка CSV (файл, кол-во товаров)
- ✓ Активация товара (ID, параметры)
- 🗑️ Удаление товара (ID)
- ⚠️ Ошибки при обработке

### Защита от атак

| Угроза                         | Защита                                  |
| ------------------------------ | --------------------------------------- |
| **SQL Injection**              | Prepared statements, ORM                |
| **CSV Injection**              | Проверка на формулы в первый символ     |
| **Загрузка файлов**            | Проверка MIME-type, размера, расширения |
| **DoS**                        | Rate limiting на API endpoints          |
| **Несанкционированный доступ** | Role-based access control (RBAC)        |

---

## 🐛 Решение проблем

### Проблема: Дубликаты товаров

**Симптом:**

```
При загрузке CSV система говорит: "Найдены дубликаты"
```

**Причины:**

1. **Товар с таким же названием уже в каталоге** — система предотвращает добавление дубликатов
2. **Несколько товаров с одним названием в CSV** — проверьте исходный файл

**Решение:**

```sql
-- Проверить дубликаты в БД
SELECT name, COUNT(*) as count FROM products
WHERE name LIKE '%Vape Pod Pro%'
GROUP BY name HAVING count > 1;

-- Удалить старый товар (если он неактуален)
DELETE FROM products WHERE id = 5 AND is_active = FALSE;

-- Или переименовать импортируемый товар
-- Обновить CSV: "Vape Pod Pro" → "Vape Pod Pro v2"
```

**Если товар нужно обновить:**

1. Удалите старый товар из каталога
2. Загрузите CSV с обновленными данными
3. Активируйте товар как новый

### Проблема: Ошибка при импорте CSV

**Симптом:**

```
"INVALID_CSV_FORMAT" — Отсутствует колонка: price_tier_1
```

**Решение:**

1. Проверьте **первую строку CSV** — должны быть все 7 колонок
2. Проверьте **кодировку файла** — должна быть UTF-8
3. Проверьте **разделитель** — должны быть запятые (,)
4. Откройте CSV в текстовом редакторе и проверьте структуру

**Правильная первая строка:**

```
name,specification,stock,price_tier_1,price_tier_2,price_tier_3,distributor_price
```

### Проблема: Товар не активируется

**Симптом:**

```
POST /api/admin/activate → ошибка 500
```

**Проверка:**

```bash
# 1. Проверить, что товар существует в очереди
curl -X GET http://localhost:3000/api/admin/price-import?id=42 \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Проверить, не активирован ли уже
curl -X GET http://localhost:3000/api/admin/price-import?id=42 \
  -H "Authorization: Bearer YOUR_TOKEN"
# Если is_activated = true, товар уже активирован

# 3. Проверить логи ошибок
SELECT * FROM import_logs WHERE status = 'error' ORDER BY created_at DESC LIMIT 5;
```

**Решение:**

- Проверьте, что `category_id` существует в таблице `categories`
- Убедитесь, что товар не активирован дважды
- Проверьте права доступа (требуется роль admin)

### Проблема: Как удалить товар после активации?

**Если товар активирован (в каталоге):**

```bash
# 1. Удалить из основного каталога
curl -X DELETE http://localhost:3000/api/admin/products/128 \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Удалить запись из price_import (если нужно)
curl -X DELETE http://localhost:3000/api/admin/price-import/42 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Или через SQL (осторожно!):**

```sql
-- Удалить товар из каталога
DELETE FROM products WHERE id = 128;

-- Удалить запись импорта
DELETE FROM price_import WHERE id = 42;

-- Проверить, что всё удалено
SELECT * FROM products WHERE id = 128;
SELECT * FROM price_import WHERE id = 42;
```

### Проблема: Большой файл не загружается

**Симптом:**

```
413 Payload Too Large
```

**Решение:**

- Максимальный размер файла: **10 МБ**
- Если файл больше, разделите его на несколько частей
- Каждый файл загружайте отдельно

**Как разделить CSV:**

```bash
# Linux/Mac: разделить на 5000 строк
split -l 5000 large_products.csv products_

# Затем загрузить каждый файл
for file in products_*; do
  curl -X POST http://localhost:3000/api/admin/import \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -F "file=@$file"
done
```

### Проблема: Изображение не загружается

**Решение:**

- **Формат:** только JPG или PNG
- **Размер:** максимум 5 МБ
- **Разрешение:** минимум 400x400px

**Проверить изображение:**

```bash
# Проверить размер и формат
file products_image.jpg      # должно вывести: JPEG image data

# Проверить размер файла
ls -lh products_image.jpg    # должен быть < 5 МБ

# Проверить разрешение (Linux/Mac с ImageMagick)
identify products_image.jpg  # должно быть >= 400x400
```

---

## ❓ FAQ

### В: Можно ли обновить товар после активации?

**О:** Не через систему импорта. Используйте интерфейс редактирования товара:

```
/admin/products/[id]/edit
```

Или обновите прямо в БД (для админов):

```sql
UPDATE products SET
  price = 300.00,
  stock = 50
WHERE id = 128;
```

### В: Как импортировать 1 миллион товаров?

**О:** Разделите на 100 файлов по 10 000 товаров каждый и загружайте в цикле:

```javascript
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function uploadMultipleCSV(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const form = new FormData();
    form.append('file', fs.createReadStream(`${directory}/${file}`));

    try {
      const response = await axios.post('http://localhost:3000/api/admin/import', form, {
        headers: {
          ...form.getHeaders(),
          Authorization: 'Bearer YOUR_TOKEN',
        },
      });
      console.log(`✓ ${file}: ${response.data.stats.total} товаров`);
    } catch (error) {
      console.error(`✗ ${file}: ${error.message}`);
    }
  }
}

uploadMultipleCSV('./csv_files');
```

### В: Есть ли скрипт миграции из других платформ?

**О:** Нет встроенного скрипта, но вы можете:

1. Экспортировать товары из старой платформы в CSV
2. Преобразовать в требуемый формат
3. Загрузить через `POST /api/admin/import`

**Пример преобразования (Node.js):**

```javascript
const csv = require('csv-parse/sync');
const fs = require('fs');

const oldData = csv.parse(fs.readFileSync('old_products.csv'), {
  columns: true,
});

const newData = oldData.map((row) => ({
  name: row.title,
  specification: row.description,
  stock: parseInt(row.qty),
  price_tier_1: parseFloat(row.price),
  price_tier_2: parseFloat(row.price) * 0.92,
  price_tier_3: parseFloat(row.price) * 0.84,
  distributor_price: parseFloat(row.price) * 0.6,
}));

// Сохранить новый CSV
```

### В: Можно ли автоматизировать импорт (каждый день, например)?

**О:** Да, используйте cron job или GitHub Actions:

```bash
# crontab -e
0 2 * * * curl -X POST http://localhost:3000/api/admin/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/var/www/daily_products.csv"
```

### В: Что происходит с неиспользованными товарами из импорта?

**О:** Товары остаются в таблице `price_import` до тех пор, пока вы их не удалите. Рекомендуется удалять неиспользованные товары через 30 дней.

```sql
-- Удалить неактивированные товары старше 30 дней
DELETE FROM price_import
WHERE is_activated = FALSE
AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### В: Какой максимальный размер изображения?

**О:**

- **Макс. размер файла:** 5 МБ
- **Рекомендуемое разрешение:** 800x800 пиксель
- **Минимальное разрешение:** 400x400 пиксель
- **Форматы:** JPG, PNG

---

## 📞 Поддержка

**Документация обновлена:** 2025-04-02  
**Версия API:** 1.0  
**Последнее изменение:** Добавлена обработка дубликатов и логирование

**Вопросы и предложения:**

- 💬 Slack: #vapeshop-support
- 📧 Email: support@vapeshop.ru
- 🐛 Issues: https://github.com/vapeshop/docs/issues

---

**© 2025 VapeShop. All rights reserved.**
