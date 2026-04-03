# 🗺️ Навигация - Система доставки (P4)

**Версия:** 1.0  
**Помощь:** Как найти нужную информацию

---

## 🎯 Быстрые ссылки по ролям

### 👨‍💼 Администратор (Admin)

**Вам нужно:**
- Добавлять/редактировать/удалять пункты выдачи
- Управлять доставкой в заказах
- Видеть статистику доставки

**Начните с:**
1. [README.md - Управление пунктами](#) (раздел "Управление пунктами")
2. [API_REFERENCE.md - Admin Pickup Points API](#)
3. [EXAMPLES.md - Админ-панель](#)
4. [IMPLEMENTATION_CHECKLIST.md - Phase 8](#)

**Быстрые ссылки:**
- API для добавления пункта: [POST /api/admin/pickup-points](./API_REFERENCE.md#post-apiadminpickup-points)
- API для получения пунктов: [GET /api/admin/pickup-points](./API_REFERENCE.md#get-apiadminpickup-points)
- Компонент админ-панели: [AdminPickupPointsPanel](./EXAMPLES.md#пример-12-react-компонент-админ-панели)

---

### 👤 Пользователь (Customer)

**Вам нужно:**
- Выбирать способ доставки при оформлении заказа
- Сохранять адреса доставки
- Управлять адресами в профиле

**Начните с:**
1. [README.md - Использование для пользователей](#)
2. [EXAMPLES.md - Управление адресами](#)
3. [EXAMPLES.md - Корзина и выбор доставки](#)

**Быстрые ссылки:**
- Выбор способа доставки: [DeliverySelector компонент](./EXAMPLES.md#пример-11-react-hook-для-управления-доставкой-в-корзине)
- Управление адресами: [AddressManager компонент](./EXAMPLES.md#пример-13-typescript-услуга-для-работы-с-доставкой)
- API для адресов: [Customer Addresses API](./API_REFERENCE.md#-customer-addresses-api)

---

### 💻 Разработчик (Developer)

**Вам нужно:**
- Интегрировать API в приложение
- Создавать компоненты
- Тестировать функциональность
- Развертывать в production

**Начните с:**
1. [README.md - Обзор архитектуры](./README.md#-архитектура)
2. [README.md - Установка и настройка](./README.md#-установка-и-настройка)
3. [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) - пошаговая реализация
4. [EXAMPLES.md](./EXAMPLES.md) - примеры кода

**Быстрые ссылки:**
- API Reference: [API_REFERENCE.md](./API_REFERENCE.md)
- React компоненты: [EXAMPLES.md - React компоненты](#)
- TypeScript услуга: [lib/delivery.ts](./EXAMPLES.md#пример-14-typescript-услуга-для-работы-с-доставкой)
- SQL запросы: [EXAMPLES.md - SQL](./EXAMPLES.md#пример-15-полезные-sql-запросы)

---

## 📚 Структура документации

```
docs/04_delivery/
├── README.md                          [14 KB] ← НАЧНИТЕ ОТСЮДА
│   ├─ Обзор системы
│   ├─ Архитектура с диаграммой
│   ├─ Компоненты (DB, API, Frontend)
│   ├─ Установка (5 шагов)
│   ├─ Использование (примеры)
│   ├─ API Reference (таблица)
│   ├─ Примеры жизни (3 сценария)
│   └─ Устранение неполадок
│
├── IMPLEMENTATION_CHECKLIST.md        [10 KB] ← ДЛЯ РЕАЛИЗАЦИИ
│   ├─ Phase 1-10 (каждая фаза)
│   ├─ Каждая фаза имеет:
│   │  ├─ Задачи с чекбоксами
│   │  ├─ Тест-команды
│   │  └─ Ожидаемые результаты
│   └─ Deployment чек-лист
│
├── EXAMPLES.md                        [10 KB] ← ПРИМЕРЫ КОДА
│   ├─ Примеры API (cURL)
│   ├─ React компоненты (TypeScript)
│   ├─ TypeScript услуга (lib/delivery.ts)
│   ├─ SQL запросы для отладки
│   └─ 15+ реальных примеров
│
├── API_REFERENCE.md                   [8 KB] ← ДЕТАЛЬНЫЙ REFERENCE
│   ├─ Admin Pickup Points API (4 endpoints)
│   ├─ Customer Addresses API (4 endpoints)
│   ├─ Public Pickup Points API (1 endpoint)
│   ├─ Orders API (обновлен)
│   ├─ Error handling
│   ├─ Authentication
│   └─ Rate limits
│
└── NAVIGATION.md                      [6 KB] ← ВЫ ЗДЕСЬ
    ├─ Быстрые ссылки по ролям
    ├─ Содержание (эта структура)
    ├─ FAQ
    └─ Поиск по ключевым словам
```

---

## 🔍 Поиск по ключевым словам

### Как создать/изменить пункт выдачи?
1. Админ: [API_REFERENCE.md - POST /api/admin/pickup-points](./API_REFERENCE.md#post-apiadminpickup-points)
2. Код: [EXAMPLES.md - Пример 12](./EXAMPLES.md#пример-12-react-компонент-админ-панели)
3. Чек-лист: [IMPLEMENTATION_CHECKLIST.md - Phase 2](./IMPLEMENTATION_CHECKLIST.md#-phase-2-admin-apis)

### Как добавить/изменить адрес доставки?
1. API: [API_REFERENCE.md - POST/PUT /api/addresses](./API_REFERENCE.md#-customer-addresses-api)
2. Примеры: [EXAMPLES.md - Примеры 6-10](./EXAMPLES.md#пример-6-добавление-нового-адреса)
3. Компонент: [EXAMPLES.md - AddressManager](./EXAMPLES.md#пример-13-typescript-услуга-для-работы-с-доставкой)

### Как создать заказ с доставкой?
1. API: [API_REFERENCE.md - POST /api/orders](./API_REFERENCE.md#-orders-api-updated)
2. Пример: [EXAMPLES.md - Пример 11](./EXAMPLES.md#пример-11-react-hook-для-управления-доставкой-в-корзине)
3. Интеграция: [EXAMPLES.md - TypeScript услуга](./EXAMPLES.md#пример-14-typescript-услуга-для-работы-с-доставкой)

### Как получить список пунктов?
1. Публичный API: [API_REFERENCE.md - GET /api/pickup-points](./API_REFERENCE.md#-public-pickup-points-api)
2. Админ API: [API_REFERENCE.md - GET /api/admin/pickup-points](./API_REFERENCE.md#get-apiadminpickup-points)
3. Пример React: [EXAMPLES.md - DeliverySelector](./EXAMPLES.md#пример-13-typescript-услуга-для-работы-с-доставкой)

### Как настроить базу данных?
1. Миграция: [README.md - Phase 1](./README.md#-phase-1-database-setup)
2. Таблицы: [README.md - Компоненты системы](./README.md#-компоненты-системы)
3. Проверка: [IMPLEMENTATION_CHECKLIST.md - Phase 1](./IMPLEMENTATION_CHECKLIST.md#-phase-1-database-setup)

### Как создать React компоненты?
1. DeliverySelector: [EXAMPLES.md - Пример 13](./EXAMPLES.md#пример-13-deliveryselector-компонент)
2. AddressManager: [EXAMPLES.md - Пример 12](./EXAMPLES.md#пример-12-react-компонент-админ-панели)
3. AdminPanel: [EXAMPLES.md - Пример 12](./EXAMPLES.md#пример-12-react-компонент-админ-панели)

### Как тестировать API?
1. cURL примеры: [EXAMPLES.md - Примеры 1-10](./EXAMPLES.md#-управление-пунктами-выдачи)
2. Тесты: [IMPLEMENTATION_CHECKLIST.md - Phase 9](./IMPLEMENTATION_CHECKLIST.md#-phase-9-testing)
3. SQL для проверки: [EXAMPLES.md - Пример 15](./EXAMPLES.md#пример-15-полезные-sql-запросы)

### Как развернуть в production?
1. Чек-лист: [IMPLEMENTATION_CHECKLIST.md - Phase 10](./IMPLEMENTATION_CHECKLIST.md#-phase-10-deployment)
2. Инструкции: [README.md - Развертывание](./README.md#-развертывание)
3. Миграция БД: [README.md - Шаг 1](./README.md#шаг-1-sql-миграция)

### Что делать при ошибке?
1. Устранение: [README.md - Устранение неполадок](./README.md#-устранение-неполадок)
2. Коды ошибок: [API_REFERENCE.md - Error Handling](./API_REFERENCE.md#-error-handling)
3. SQL отладка: [EXAMPLES.md - Пример 15](./EXAMPLES.md#пример-15-полезные-sql-запросы)

---

## ❓ FAQ

### Q: С чего начать?
**A:** 
1. Прочитайте [README.md](./README.md) (10-15 минут)
2. Посмотрите [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) для вашей роли
3. Найдите нужный пример в [EXAMPLES.md](./EXAMPLES.md)

### Q: Где документация по API?
**A:** [API_REFERENCE.md](./API_REFERENCE.md) - детальный reference со всеми endpoints

### Q: Как запустить миграцию БД?
**A:** 
1. Файл: `db/migrations/004_delivery_management.sql`
2. Инструкция: [README.md - Шаг 1](./README.md#шаг-1-sql-миграция)

### Q: Какие компоненты React нужны?
**A:** 
1. DeliverySelector - выбор способа
2. PickupPointsList - список пунктов
3. AddressManager - управление адресами
4. AdminPickupPointsPanel - админ-панель

Примеры: [EXAMPLES.md - React компоненты](#)

### Q: Как протестировать API?
**A:** 
1. cURL команды в [EXAMPLES.md](./EXAMPLES.md)
2. Тест-команды в [IMPLEMENTATION_CHECKLIST.md - Phase 9](./IMPLEMENTATION_CHECKLIST.md#-phase-9-testing)

### Q: Что делать при ошибке 401?
**A:** Добавьте заголовок:
```bash
-H "X-Telegram-Id: 123456789"
```
Подробнее: [README.md - Проблема 4](./README.md#проблема-4-401-unauthorized)

### Q: Как кэшировать пункты выдачи?
**A:** 
- GET /api/pickup-points возвращает стабильные данные
- Кэшируйте на клиенте (обновляйте раз в час)
- Пример: [EXAMPLES.md - TypeScript услуга](./EXAMPLES.md#пример-14-typescript-услуга-для-работы-с-доставкой)

### Q: Какие SQL индексы есть?
**A:** 8 индексов оптимизирующих поиск:
- `idx_pickup_points_is_active` - активные пункты
- `idx_addresses_user_telegram_id` - адреса пользователя
- И еще 6...

Подробнее: [README.md - Phase 1](./README.md#-phase-1-database-setup)

### Q: Можно ли отключить пункт не удаляя его?
**A:** Да! Используется soft delete:
```bash
curl -X DELETE ".../api/admin/pickup-points?id=uuid" ...
# Устанавливает is_active = false
```

### Q: Как установить адрес по умолчанию?
**A:** 
```bash
curl -X PUT .../api/addresses \
  -d '{"id":"uuid","is_default":true}'
```
Автоматически снимет флаг с других адресов.

---

## 🎓 Обучающая последовательность

### Для новичков (1-2 часа):
1. **README.md** - Общее понимание (20 мин)
2. **EXAMPLES.md - Примеры 1-5** - Пункты выдачи (15 мин)
3. **EXAMPLES.md - Примеры 6-8** - Адреса (15 мин)
4. **EXAMPLES.md - Пример 11** - Заказ с доставкой (15 мин)
5. **Практика** - Запустить примеры через cURL (30 мин)

### Для разработчиков (3-4 часа):
1. **README.md - Архитектура** (20 мин)
2. **IMPLEMENTATION_CHECKLIST.md** - Полный план (30 мин)
3. **API_REFERENCE.md** - Все endpoints (30 мин)
4. **EXAMPLES.md - React компоненты** (45 мин)
5. **EXAMPLES.md - TypeScript услуга** (30 мин)
6. **Практика** - Создать все компоненты (60+ мин)

### Для админов (30 мин):
1. **README.md - Использование для администраторов** (10 мин)
2. **EXAMPLES.md - Примеры 1-5** - Как добавлять пункты (10 мин)
3. **EXAMPLES.md - Пример 12** - Админ-панель (10 мин)

---

## 📞 Когда обращаться где

| Вопрос | Где найти |
|--------|-----------|
| Как работает система? | README.md - Обзор |
| Какие API endpoints? | API_REFERENCE.md |
| Примеры кода? | EXAMPLES.md |
| Как реализовать? | IMPLEMENTATION_CHECKLIST.md |
| Как тестировать? | IMPLEMENTATION_CHECKLIST.md - Phase 9 |
| Ошибка при API запросе | API_REFERENCE.md - Error Handling |
| Какой SQL запрос? | EXAMPLES.md - Пример 15 |
| Как развернуть? | IMPLEMENTATION_CHECKLIST.md - Phase 10 |

---

## 🔗 Связанная документация

**Другие фазы VapeShop:**
- **P1 - Auth:** `docs/01_auth/`
- **P2 - Payments:** `docs/02_payments/`
- **P3 - Notifications:** `docs/03_notifications/`
- **P4 - Delivery:** `docs/04_delivery/` ← **ВЫ ЗДЕСЬ**

**Файлы проекта:**
- Database: `lib/db.ts`
- Auth: `lib/auth.ts`
- API endpoints: `pages/api/`
- Components: `components/`
- Styles: `styles/` (Tailwind + Neon theme)

---

## 📋 Рекомендуемый порядок чтения

```
┌─────────────────────────────────────────┐
│  START: README.md (overview)            │
│         ↓                               │
│  CHOOSE YOUR ROLE:                      │
│  ├─ Admin?     → Admin section          │
│  ├─ Developer? → API_REFERENCE + CODE   │
│  └─ User?      → User section           │
│         ↓                               │
│  EXAMPLES.md (examples for your role)   │
│         ↓                               │
│  IMPLEMENTATION_CHECKLIST.md (testing)  │
│         ↓                               │
│  BACK TO: README.md (troubleshooting)   │
│         ↓                               │
│  DEPLOYMENT: IMPLEMENTATION - Phase 10  │
└─────────────────────────────────────────┘
```

---

## ✅ Контрольный список для начала

- [ ] Прочитал README.md
- [ ] Выбрал свою роль
- [ ] Нашел нужный раздел в документации
- [ ] Посмотрел примеры в EXAMPLES.md
- [ ] Запустил/протестировал код
- [ ] Имею вопрос? → используйте поиск по ключевым словам выше

---

## 📞 Контакты

**Нашли ошибку в документации?** Пожалуйста, сообщите!  
**Нужен пример?** Check EXAMPLES.md или попросите у AI assistant  
**API не работает?** See README.md Устранение неполадок

---

**Версия:** 1.0  
**Статус:** ✅ Complete  
**Последнее обновление:** 2024

