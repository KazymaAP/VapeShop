# 📋 Checklist реализации системы доставки (P4)

**Версия:** 1.0  
**Статус:** Complete  
**Формат:** Пошаговая реализация с проверками

---

## 🎯 Обзор фаз

```
Phase 1: Database        ▓▓▓▓▓ ✅
Phase 2: Admin APIs      ▓▓▓▓▓ ✅
Phase 3: Customer APIs   ▓▓▓▓▓ ✅
Phase 4: Public APIs     ▓▓▓▓▓ ✅
Phase 5: Order Integration▓▓▓▓▓ ✅
Phase 6: Cart Component  ▓▓▓▓▓ ✅
Phase 7: Profile Component▓▓▓▓▓ ✅
Phase 8: Admin Panel     ▓▓▓▓▓ ✅
Phase 9: Testing        ▓▓▓▓▓ ✅
Phase 10: Deployment    ▓▓▓▓▓ ✅
```

---

## 📊 Phase 1: Database Setup

### 1.1 SQL миграция

- [ ] Создана таблица `pickup_points`
  - [ ] Поле `id` (UUID PRIMARY KEY)
  - [ ] Поле `name` (VARCHAR 255)
  - [ ] Поле `address` (TEXT)
  - [ ] Поле `is_active` (BOOLEAN DEFAULT TRUE)
  - [ ] Поле `created_at` (TIMESTAMP DEFAULT NOW())
  - [ ] Поле `updated_at` (TIMESTAMP DEFAULT NOW())

- [ ] Создана таблица `addresses`
  - [ ] Поле `id` (UUID PRIMARY KEY)
  - [ ] Поле `user_telegram_id` (BIGINT, FOREIGN KEY)
  - [ ] Поле `address` (TEXT)
  - [ ] Поле `is_default` (BOOLEAN DEFAULT FALSE)
  - [ ] Поле `created_at` (TIMESTAMP)
  - [ ] Поле `updated_at` (TIMESTAMP)
  - [ ] Constraint: UNIQUE(user_telegram_id, address)

- [ ] Обновлена таблица `orders`
  - [ ] Добавлено поле `delivery_method` (VARCHAR 50)
  - [ ] Добавлено поле `pickup_point_id` (UUID, FK)
  - [ ] Добавлено поле `address` (TEXT)
  - [ ] Добавлено поле `delivery_date` (DATE)

### 1.2 Индексы

- [ ] Создан индекс `idx_pickup_points_is_active` на (is_active)
- [ ] Создан индекс `idx_pickup_points_created_at` на (created_at DESC)
- [ ] Создан индекс `idx_addresses_user_telegram_id` на (user_telegram_id)
- [ ] Создан индекс `idx_addresses_is_default` на (user_telegram_id, is_default)
- [ ] Создан индекс `idx_addresses_created_at` на (created_at DESC)
- [ ] Создан индекс `idx_orders_delivery_method` на (delivery_method)
- [ ] Создан индекс `idx_orders_pickup_point_id` на (pickup_point_id)
- [ ] Создан индекс `idx_orders_delivery_date` на (delivery_date)

### 1.3 Триггеры

- [ ] Создан триггер `trigger_pickup_points_updated_at`
  - Автоматически обновляет `updated_at` при изменении

- [ ] Создан триггер `trigger_addresses_updated_at`
  - Автоматически обновляет `updated_at` при изменении

### 1.4 Начальные данные

- [ ] Добавлены 3 примера пунктов выдачи:
  - [ ] "Пункт выдачи - Центр"
  - [ ] "Пункт выдачи - Восток"
  - [ ] "Пункт выдачи - Запад"

**Проверка:**

```sql
SELECT COUNT(*) FROM pickup_points;
SELECT COUNT(*) FROM addresses;
SELECT * FROM information_schema.columns
WHERE table_name='orders' AND column_name IN ('delivery_method','pickup_point_id','address','delivery_date');
```

**Ожидаемый результат:** 3 пункта, 0 адресов (пока), 4 новых колонки в orders

---

## 📊 Phase 2: Admin APIs

### 2.1 GET /api/admin/pickup-points

- [ ] Создан файл `pages/api/admin/pickup-points.ts`
- [ ] Реализован GET handler
  - [ ] Поддержка пагинации (page, limit)
  - [ ] Возвращает pickup_points + pagination metadata
  - [ ] Требует админ аутентификацию
  - [ ] Сортировка по created_at DESC

**Тест:**

```bash
curl -H "X-Telegram-Id: 123456789" \
     "http://localhost:3000/api/admin/pickup-points?page=1&limit=20"
```

**Ожидаемый результат:** 200 OK с массивом pickup_points и pagination объектом

### 2.2 POST /api/admin/pickup-points

- [ ] Реализован POST handler
  - [ ] Валидация: name обязателен и не пуст
  - [ ] Валидация: address обязателен и не пуст
  - [ ] Создает новый пункт с is_active = true
  - [ ] Возвращает созданный объект
  - [ ] Логирует действие администратора
  - [ ] Требует админ аутентификацию
  - [ ] Возвращает 201 Created

**Тест:**

```bash
curl -X POST http://localhost:3000/api/admin/pickup-points \
     -H "Content-Type: application/json" \
     -H "X-Telegram-Id: 123456789" \
     -d '{"name":"Test Point","address":"Test Address"}'
```

**Ожидаемый результат:** 201 Created с pickup_point объектом

### 2.3 PUT /api/admin/pickup-points

- [ ] Реализован PUT handler
  - [ ] Валидация: id обязателен
  - [ ] Проверка: пункт существует
  - [ ] Обновляет: name, address, is_active (опционально)
  - [ ] Автоматически обновляет updated_at
  - [ ] Логирует изменения (какие поля изменились)
  - [ ] Требует админ аутентификацию
  - [ ] Возвращает 200 OK

**Тест:**

```bash
curl -X PUT http://localhost:3000/api/admin/pickup-points \
     -H "Content-Type: application/json" \
     -H "X-Telegram-Id: 123456789" \
     -d '{"id":"uuid-here","name":"Updated Name","is_active":false}'
```

**Ожидаемый результат:** 200 OK с success: true

### 2.4 DELETE /api/admin/pickup-points

- [ ] Реализован DELETE handler
  - [ ] Валидация: id обязателен (из query)
  - [ ] Проверка: пункт существует
  - [ ] Soft delete: устанавливает is_active = false
  - [ ] Логирует удаление
  - [ ] Требует админ аутентификацию
  - [ ] Возвращает 200 OK

**Тест:**

```bash
curl -X DELETE "http://localhost:3000/api/admin/pickup-points?id=uuid-here" \
     -H "X-Telegram-Id: 123456789"
```

**Ожидаемый результат:** 200 OK с success: true

---

## 📊 Phase 3: Customer APIs

### 3.1 GET /api/addresses

- [ ] Создан файл `pages/api/addresses.ts`
- [ ] Реализован GET handler
  - [ ] Query param: telegram_id (обязателен)
  - [ ] Возвращает все адреса пользователя
  - [ ] Сортировка: is_default DESC (по умолчанию первым)
  - [ ] Требует аутентификацию
  - [ ] Возвращает 200 OK

**Тест:**

```bash
curl "http://localhost:3000/api/addresses?telegram_id=123456789"
```

**Ожидаемый результат:** 200 OK с массивом addresses

### 3.2 POST /api/addresses

- [ ] Реализован POST handler
  - [ ] Body: telegram_id, address, is_default (опционально)
  - [ ] Валидация: телеграм ID обязателен
  - [ ] Валидация: адрес обязателен и не пуст
  - [ ] Проверка UNIQUE: один адрес 1 раз на пользователя
  - [ ] Если is_default=true → снимает флаг с других адресов
  - [ ] Требует аутентификацию
  - [ ] Возвращает 200 OK с созданным адресом

**Тест:**

```bash
curl -X POST http://localhost:3000/api/addresses \
     -H "Content-Type: application/json" \
     -d '{"telegram_id":123456789,"address":"г. Москва, ул. Арбат, д. 15"}'
```

**Ожидаемый результат:** 200 OK с address объектом

### 3.3 PUT /api/addresses

- [ ] Реализован PUT handler
  - [ ] Body: id, address (опционально), is_default (опционально)
  - [ ] Валидация: id обязателен
  - [ ] Обновляет address и/или is_default
  - [ ] Если is_default=true → снимает флаг с других адресов
  - [ ] Требует аутентификацию
  - [ ] Возвращает 200 OK

**Тест:**

```bash
curl -X PUT http://localhost:3000/api/addresses \
     -H "Content-Type: application/json" \
     -d '{"id":"uuid-here","is_default":true}'
```

**Ожидаемый результат:** 200 OK с success: true

### 3.4 DELETE /api/addresses

- [ ] Реализован DELETE handler
  - [ ] Query param: id (обязателен)
  - [ ] Удаляет адрес
  - [ ] Требует аутентификацию
  - [ ] Возвращает 200 OK

**Тест:**

```bash
curl -X DELETE "http://localhost:3000/api/addresses?id=uuid-here"
```

**Ожидаемый результат:** 200 OK с success: true

---

## 📊 Phase 4: Public APIs

### 4.1 GET /api/pickup-points (Public)

- [ ] Создан файл `pages/api/pickup-points.ts` (если не существует)
- [ ] Реализован GET handler
  - [ ] Возвращает ТОЛЬКО активные пункты (is_active=true)
  - [ ] НЕ требует аутентификацию
  - [ ] Сортировка по name ASC
  - [ ] Возвращает 200 OK
  - [ ] Кэшируемый результат (редко меняется)

**Тест:**

```bash
curl "http://localhost:3000/api/pickup-points"
```

**Ожидаемый результат:** 200 OK с массивом активных pickup_points

---

## 📊 Phase 5: Order Integration

### 5.1 POST /api/orders (Updated)

- [ ] Обновлен файл `pages/api/orders.ts`
- [ ] Добавлена поддержка delivery_method
  - [ ] Body: delivery_method ("pickup" или "delivery")
  - [ ] Body: pickup_point_id (обязателен если delivery_method="pickup")
  - [ ] Body: address (обязателен если delivery_method="delivery")
  - [ ] Body: delivery_date (опционально)
  - [ ] Валидация: если pickup → проверить pickup_point_id существует
  - [ ] Валидация: если delivery → адрес обязателен
  - [ ] При создании заказа → сохранить delivery метод
  - [ ] Возвращает 201 Created с order объектом

**Тест (Pickup):**

```bash
curl -X POST http://localhost:3000/api/orders \
     -H "Content-Type: application/json" \
     -H "X-Telegram-Id: 123456789" \
     -d '{
       "items":[{"product_id":"p1","quantity":1}],
       "delivery_method":"pickup",
       "pickup_point_id":"uuid-123",
       "delivery_date":"2024-01-20"
     }'
```

**Тест (Delivery):**

```bash
curl -X POST http://localhost:3000/api/orders \
     -H "Content-Type: application/json" \
     -H "X-Telegram-Id: 123456789" \
     -d '{
       "items":[{"product_id":"p1","quantity":1}],
       "delivery_method":"delivery",
       "address":"г. Москва, ул. Арбат, д. 15",
       "delivery_date":"2024-01-20"
     }'
```

**Ожидаемый результат:** 201 Created с заказом

---

## 📊 Phase 6: Cart Component

### 6.1 DeliverySelector Component

- [ ] Создан файл `components/DeliverySelector.tsx`
- [ ] Содержит:
  - [ ] Radio buttons для выбора метода (pickup/delivery)
  - [ ] PickupPointsList - отображается если delivery_method="pickup"
  - [ ] AddressSelector - отображается если delivery_method="delivery"
  - [ ] DatePicker - выбор даты доставки
  - [ ] Props: method, onMethodChange, selectedPickup, onPickupSelect, selectedAddress, onAddressSelect, deliveryDate, onDateChange
  - [ ] Стили Tailwind + Neon colors
  - [ ] Responsive дизайн

**Интеграция в корзину:**

- [ ] Импортирован в `pages/cart.tsx`
- [ ] State для delivery_method
- [ ] State для pickup_point_id
- [ ] State для address
- [ ] State для delivery_date
- [ ] Передана информация при создании заказа

### 6.2 PickupPointsList Component

- [ ] Создан файл `components/PickupPointsList.tsx`
- [ ] Содержит:
  - [ ] Загрузка пунктов с `/api/pickup-points`
  - [ ] Список как radio buttons
  - [ ] Отображение названия и адреса каждого пункта
  - [ ] Выбранный пункт выделен
  - [ ] Обработка загрузки (loading state)
  - [ ] Обработка ошибок
  - [ ] Props: onSelect, selectedId

**Проверка:**

- [ ] При открытии корзины → пункты загружаются
- [ ] При клике → выбирается пункт
- [ ] Выбранный пункт отмечен галочкой

---

## 📊 Phase 7: Profile Component

### 7.1 AddressManager Component

- [ ] Создан файл `components/AddressManager.tsx`
- [ ] Содержит:
  - [ ] Загрузка адресов при монтировании компонента
  - [ ] Список сохраненных адресов
  - [ ] Каждый адрес показан с кнопками [Редактировать] [Удалить]
  - [ ] Обозначение адреса по умолчанию (✓ или значок)
  - [ ] Кнопка [+ Добавить новый адрес]
  - [ ] Форма добавления адреса (текстовое поле + чекбокс "по умолчанию")
  - [ ] Валидация: адрес не пуст
  - [ ] Обработка ошибок
  - [ ] Loading состояния
  - [ ] Props: telegramId

**Функционал:**

- [ ] Получение адресов: GET /api/addresses?telegram_id=...
- [ ] Добавление: POST /api/addresses
- [ ] Обновление (default): PUT /api/addresses
- [ ] Удаление: DELETE /api/addresses?id=...
- [ ] Обновление UI после каждой операции

**Интеграция:**

- [ ] Добавлена в `pages/profile.tsx`
- [ ] Показывается в разделе "Мои адреса"

---

## 📊 Phase 8: Admin Panel

### 8.1 AdminPickupPointsPanel Component

- [ ] Создан файл `components/AdminPickupPointsPanel.tsx`
- [ ] Содержит:
  - [ ] Таблица/список всех пунктов выдачи
  - [ ] Колонки: Название | Адрес | Статус | Действия
  - [ ] Кнопка [+ Добавить новый пункт]
  - [ ] Кнопка [Редактировать] для каждого пункта
  - [ ] Кнопка [Удалить/Отключить] для каждого пункта
  - [ ] Форма добавления пункта (name, address)
  - [ ] Форма редактирования пункта (name, address, is_active)
  - [ ] Валидация: поля не пусты
  - [ ] Пагинация (если много пунктов)
  - [ ] Loading состояния
  - [ ] Обработка ошибок
  - [ ] Подтверждение перед удалением

**Функционал:**

- [ ] Получение пунктов: GET /api/admin/pickup-points?page=1&limit=20
- [ ] Добавление: POST /api/admin/pickup-points
- [ ] Обновление: PUT /api/admin/pickup-points
- [ ] Удаление: DELETE /api/admin/pickup-points?id=...
- [ ] Обновление UI после каждой операции

**Интеграция:**

- [ ] Добавлена в админ-панель (`pages/admin/`)
- [ ] Требует админ аутентификацию (через requireAuth)
- [ ] Видна только админам

---

## 📊 Phase 9: Testing

### 9.1 Database Tests

- [ ] Миграция создает таблицы

  ```sql
  \dt pickup_points
  \dt addresses
  ```

  Результат: ✓ оба exist

- [ ] Индексы созданы

  ```sql
  SELECT * FROM pg_indexes WHERE tablename IN ('pickup_points','addresses','orders');
  ```

  Результат: ✓ все 8 индексов есть

- [ ] UNIQUE constraint работает
  ```sql
  INSERT INTO addresses (user_telegram_id, address) VALUES (1, 'addr1');
  INSERT INTO addresses (user_telegram_id, address) VALUES (1, 'addr1');
  -- должна быть ошибка UNIQUE violation
  ```
  Результат: ✓ вторая вставка ошибка

### 9.2 Admin API Tests

**GET /api/admin/pickup-points**

```bash
curl -H "X-Telegram-Id: admin-123" \
     "http://localhost:3000/api/admin/pickup-points"
# ✓ 200 OK, returns array of pickup_points
```

**POST /api/admin/pickup-points**

```bash
curl -X POST http://localhost:3000/api/admin/pickup-points \
     -H "Content-Type: application/json" \
     -H "X-Telegram-Id: admin-123" \
     -d '{"name":"New Point","address":"New Address"}'
# ✓ 201 Created
# ✓ Новый пункт в БД
# ✓ created_at и updated_at установлены
```

**PUT /api/admin/pickup-points**

```bash
# Получить ID предыдущего пункта
curl -X PUT http://localhost:3000/api/admin/pickup-points \
     -H "Content-Type: application/json" \
     -H "X-Telegram-Id: admin-123" \
     -d '{"id":"uuid-123","name":"Updated"}'
# ✓ 200 OK
# ✓ Пункт обновлен в БД
# ✓ updated_at изменился
```

**DELETE /api/admin/pickup-points**

```bash
curl -X DELETE "http://localhost:3000/api/admin/pickup-points?id=uuid-123" \
     -H "X-Telegram-Id: admin-123"
# ✓ 200 OK
# ✓ Пункт is_active = false в БД
```

### 9.3 Customer API Tests

**GET /api/addresses**

```bash
curl "http://localhost:3000/api/addresses?telegram_id=123456789"
# ✓ 200 OK, returns array (может быть пусто)
```

**POST /api/addresses**

```bash
curl -X POST http://localhost:3000/api/addresses \
     -H "Content-Type: application/json" \
     -d '{"telegram_id":123456789,"address":"Test Address"}'
# ✓ 200 OK
# ✓ Адрес добавлен
```

**PUT /api/addresses**

```bash
# Получить ID адреса из предыдущего
curl -X PUT http://localhost:3000/api/addresses \
     -H "Content-Type: application/json" \
     -d '{"id":"uuid-addr","is_default":true}'
# ✓ 200 OK
# ✓ is_default = true
```

**DELETE /api/addresses**

```bash
curl -X DELETE "http://localhost:3000/api/addresses?id=uuid-addr"
# ✓ 200 OK
# ✓ Адрес удален из БД
```

### 9.4 Public API Tests

**GET /api/pickup-points**

```bash
curl "http://localhost:3000/api/pickup-points"
# ✓ 200 OK
# ✓ Возвращает только is_active=true пункты
# ✓ НЕ требует аутентификацию
```

### 9.5 Order Integration Tests

**POST /api/orders with Pickup**

```bash
# 1. Получить ID активного пункта
curl "http://localhost:3000/api/pickup-points"

# 2. Создать заказ с pickup
curl -X POST http://localhost:3000/api/orders \
     -H "Content-Type: application/json" \
     -H "X-Telegram-Id: 123456789" \
     -d '{
       "items":[{"product_id":"p1","quantity":1}],
       "delivery_method":"pickup",
       "pickup_point_id":"point-uuid",
       "delivery_date":"2024-01-20"
     }'
# ✓ 201 Created
# ✓ order.delivery_method = "pickup"
# ✓ order.pickup_point_id = point-uuid
# ✓ order.delivery_date = 2024-01-20
```

**POST /api/orders with Delivery**

```bash
curl -X POST http://localhost:3000/api/orders \
     -H "Content-Type: application/json" \
     -H "X-Telegram-Id: 123456789" \
     -d '{
       "items":[{"product_id":"p1","quantity":1}],
       "delivery_method":"delivery",
       "address":"г. Москва, ул. Арбат, д. 15",
       "delivery_date":"2024-01-20"
     }'
# ✓ 201 Created
# ✓ order.delivery_method = "delivery"
# ✓ order.address = "г. Москва, ул. Арбат, д. 15"
```

### 9.6 Frontend Component Tests

**Cart DeliverySelector**

- [ ] Компонент рендерится
- [ ] Есть 2 радио кнопки (pickup/delivery)
- [ ] При выборе pickup → видна PickupPointsList
- [ ] При выборе delivery → видна AddressSelector
- [ ] DatePicker работает
- [ ] Selected значения передаются через props

**Profile AddressManager**

- [ ] Загружает адреса при монтировании
- [ ] Показывает список адресов
- [ ] Кнопка "Добавить" открывает форму
- [ ] Форма валидируется
- [ ] Адрес добавляется после сохранения
- [ ] Кнопка "Удалить" работает
- [ ] Адрес по умолчанию отмечен

**Admin Panel**

- [ ] Загружает пункты при монтировании
- [ ] Показывает таблицу пунктов
- [ ] Кнопка "Добавить" работает
- [ ] Кнопка "Редактировать" работает
- [ ] Кнопка "Удалить" работает (с подтверждением)

---

## 📊 Phase 10: Deployment

### 10.1 Pre-deployment Checklist

- [ ] Все файлы коммитены в git
- [ ] Нет console.log / debug кода
- [ ] ENV переменные установлены
- [ ] Ошибки обрабатываются
- [ ] Логирование работает
- [ ] No hardcoded URLs (использовать NEXT_PUBLIC_API_URL)

### 10.2 Database Migration (Production)

- [ ] Backup БД создан

  ```bash
  pg_dump -h prod-host -U user -d database > backup_$(date +%Y%m%d).sql
  ```

- [ ] Миграция выполнена на production
  - [ ] Таблицы созданы
  - [ ] Индексы созданы
  - [ ] Триггеры созданы

- [ ] Проверена целостность данных
  ```sql
  SELECT COUNT(*) FROM pickup_points;
  SELECT COUNT(*) FROM addresses;
  SELECT COUNT(*) FROM orders WHERE delivery_method IS NOT NULL;
  ```

### 10.3 API Deployment

- [ ] Build успешен: `npm run build`
- [ ] Нет ошибок: `npm start`
- [ ] Endpoints доступны на production
  - [ ] GET /api/admin/pickup-points (требует auth)
  - [ ] GET /api/addresses (требует auth)
  - [ ] GET /api/pickup-points (public)
  - [ ] POST /api/orders (обновлен)

### 10.4 Frontend Deployment

- [ ] Компоненты отображаются корректно
- [ ] Стили применены (Neon colors)
- [ ] Responsive на мобильных
- [ ] Не сломаны существующие страницы

### 10.5 Monitoring

- [ ] Error logging настроен
- [ ] Логируются все ошибки API
- [ ] Мониторятся медленные запросы
- [ ] Проверяется использование БД

### 10.6 Verification Tests (Production)

```bash
# Test 1: Public API доступен
curl https://prod.vape-shop.com/api/pickup-points
# ✓ 200 OK

# Test 2: Admin API требует auth
curl https://prod.vape-shop.com/api/admin/pickup-points
# ✓ 401 Unauthorized

# Test 3: Admin API работает с auth
curl -H "X-Telegram-Id: admin-id" \
     https://prod.vape-shop.com/api/admin/pickup-points
# ✓ 200 OK

# Test 4: Заказ с доставкой создается
curl -X POST https://prod.vape-shop.com/api/orders \
     -H "Content-Type: application/json" \
     -H "X-Telegram-Id: user-id" \
     -d '{"items":[{"product_id":"p1","quantity":1}],"delivery_method":"pickup","pickup_point_id":"uuid"}'
# ✓ 201 Created
```

---

## 📞 Контакты и поддержка

**Возникла проблема?** → See [README.md](./README.md#устранение-неполадок)  
**Нужны примеры?** → See [EXAMPLES.md](./EXAMPLES.md)  
**API Reference?** → See [API_REFERENCE.md](./API_REFERENCE.md)

**Версия:** 1.0  
**Статус:** ✅ Complete  
**Total Tasks:** 100+
