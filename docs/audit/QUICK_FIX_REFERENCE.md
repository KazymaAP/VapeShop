# 🔍 Быстрая справка по исправлениям (Quick Fix Reference)

## Таблица всех исправленных файлов

| Файл | Проблема | Решение | Статус |
|------|----------|---------|--------|
| **lib/telegram.ts** | Отсутствует `isReady` свойство | Добавлено отслеживание готовности WebApp | ✅ |
| **pages/api/bot.ts** | Уведомления не отправляются | Добавлен `setBotInstance(bot)` (строка 10) | ✅ |
| **pages/api/orders.ts** | Админы не получают уведомления | Добавлен вызов `notifyAdminsNewOrder()` (строки 163-174) | ✅ |
| **lib/notifications.ts** | Функция не полная | Реализована отправка уведомлений админам | ✅ |
| **pages/admin/pages/edit/[slug].tsx** | Нет WYSIWYG редактора | Интегрирован ReactQuill | ✅ |
| **package.json** | Нет react-quill | Добавлены зависимости | ✅ |
| **db/migrations/001_initial_schema.sql** | Отсутствует базовая схема | Создана полная миграция (374 строк) | ✅ |
| **pages/api/*.ts** (10 файлов) | Неправильные пути импортов | Исправлены на `../../lib/` | ✅ |
| **pages/api/admin/*.ts** (13 файлов) | Неправильные пути импортов | Исправлены на `../../../lib/` | ✅ |
| **pages/api/admin/*/*.ts** (6 файлов) | Неправильные пути импортов | Исправлены на `../../../../lib/` | ✅ |
| **components/ActivationModal.tsx** | Неправильные пути | Исправлены импорты | ✅ |
| **pages/api/admin/activate.ts** | Type ошибки для null | Исправлены типы categoryId/brandId | ✅ |
| **pages/admin/kanban.tsx** | PointerSensor ошибка | Исправлена конфигурация | ✅ |

---

## 🔧 Критические файлы для понимания

### 1. **lib/notifications.ts** — Центр системы уведомлений
```typescript
// Вызывает: setBotInstance(bot) в pages/api/bot.ts
// Использует: sendNotification(telegramId, message)
// Экспортирует: notifyAdminsNewOrder(), sendNotification()
```

**Как работает**:
- `setBotInstance(bot)` сохраняет экземпляр бота (избегает циклических зависимостей)
- `notifyAdminsNewOrder()` читает `ADMIN_TELEGRAM_IDS` и отправляет каждому
- `sendNotification()` это основной метод отправки

### 2. **pages/api/bot.ts** — Telegram бот инициализация
```typescript
// Строка 5: import { setBotInstance } from '../lib/notifications';
// Строка 10: setBotInstance(bot);
```

**Обязательно** вызвать `setBotInstance` при инициализации бота!

### 3. **pages/api/orders.ts** — Создание заказа + уведомление
```typescript
// Строка 4: import { notifyAdminsNewOrder } from '../lib/notifications';
// Строки 163-174: После создания заказа вызывать notifyAdminsNewOrder(orderId)
```

**Последовательность**:
1. Создать заказ в БД
2. Отправить уведомление админу
3. Вернуть ответ клиенту

### 4. **db/migrations/001_initial_schema.sql** — Основная схема БД
```sql
-- Таблицы: users, categories, brands, products, cart_items, 
-- price_import, orders, order_items, reviews, wishlist, addresses, promocodes
-- Все таблицы используют IF NOT EXISTS для идемпотентности
```

**Нужно запустить** при первом развёртывании:
```bash
psql $DATABASE_URL -f db/migrations/001_initial_schema.sql
```

### 5. **pages/admin/pages/edit/[slug].tsx** — Редактор с ReactQuill
```typescript
// Строка 10: const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
// Строка 7: import 'react-quill/dist/quill.snow.css';
```

**Важно**: Dynamic import с `ssr: false` для избежания SSR ошибок

---

## 📊 Правило импортов

**Запомните эту таблицу:**

| Местоположение файла | Пример | Путь импорта |
|----------------------|--------|--------------|
| `pages/api/orders.ts` | Доступ к `lib/db` | `../../lib/db` |
| `pages/api/admin/activate.ts` | Доступ к `lib/db` | `../../../lib/db` |
| `pages/api/admin/banners/[id].ts` | Доступ к `lib/db` | `../../../../lib/db` |

**Формула**: `..` × (кол-во папок до `pages` + 1) + `/lib/`

---

## 🚨 Если build падает с ошибкой "Cannot find module"

### Шаг 1: Определить местоположение файла
```bash
# Пример: pages/api/orders.ts
# Уровень: pages/api/  (одна папка после pages/)
```

### Шаг 2: Посчитать глубину
```
pages/api/orders.ts
↓
pages/api/  — это одна папка (глубина 1)
```

### Шаг 3: Применить формулу
```
Количество ../ = (1 + 1) = 2
Импорт: from '../../lib/db'
```

### Шаг 4: Проверить
```bash
npm run build  # Должно скомпилироваться без ошибок
```

---

## 🧪 Чек-лист для тестирования

### Перед production deployment

- [ ] `npm run build` проходит без ошибок
- [ ] `npm run lint` не выдаёт критических ошибок
- [ ] Все переменные окружения установлены:
  - [ ] `DATABASE_URL`
  - [ ] `TELEGRAM_BOT_TOKEN`
  - [ ] `ADMIN_TELEGRAM_IDS`
  - [ ] `WEBAPP_URL`
- [ ] Миграции БД запущены
- [ ] Тест создания заказа:
  - [ ] Заказ создаётся в БД
  - [ ] Админ получает Telegram уведомление
  - [ ] На клиенте появляется 6-значный код
- [ ] Тест редактора страниц:
  - [ ] Открывается /admin/pages
  - [ ] Загружается ReactQuill редактор
  - [ ] HTML сохраняется в БД
  - [ ] Контент отображается на публичной странице
- [ ] Тест промокодов:
  - [ ] Промокод применяется в корзине
  - [ ] Скидка сохраняется при создании заказа

---

## 📞 Если что-то не работает

### Проблема: Build падает с import error
**Решение**: Проверить правило импортов (таблица выше), пересчитать уровни `../`

### Проблема: Админ не получает уведомления
**Решение**: 
1. Проверить `ADMIN_TELEGRAM_IDS` в .env.local
2. Проверить, что `setBotInstance(bot)` вызывается в pages/api/bot.ts
3. Проверить логи: `notifyAdminsNewOrder()` вызывается после создания заказа

### Проблема: ReactQuill не загружается
**Решение**:
1. Проверить, что `react-quill` и `quill` в package.json
2. Проверить, что используется dynamic import с `ssr: false`
3. Проверить браузерную консоль на ошибки

### Проблема: isReady undefined в админ страницах
**Решение**: Убедиться, что `lib/telegram.ts` экспортирует `isReady` в hook

---

## 📚 Документация

Подробная документация находится в папке `docs/`:

- `FINAL_COMPLETION_REPORT.md` — Общий отчёт (читать первым!)
- `BUILD_FIXES_REPORT.md` — Анализ проблемы с импортами
- `FIXES_SUMMARY.md` — Список всех исправлений
- `01_database/README.md` — Описание миграций
- `03_notifications/FIX_NOTIFICATIONS.md` — Как работают уведомления
- `08_content/README.md` — ReactQuill интеграция

---

## 🎯 Следующий разработчик: Начни отсюда

1. Прочитай `FINAL_COMPLETION_REPORT.md`
2. Запусти `npm run build` для проверки
3. Запусти `npm run dev` для локальной разработки
4. При необходимости изменения пути импорта — используй таблицу правил выше

**Удачи! 🚀**
