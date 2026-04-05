# 📋 Чеклист Внедрения Системы Уведомлений (P3)

## ✅ Фаза 1: Backend компоненты (ЗАВЕРШЕНО)

- [x] Создан `lib/notifications.ts` (11.8 KB)
  - [x] Функции для отправки уведомлений
  - [x] Функции для рассылки по ролям
  - [x] Функции для специальных типов событий
  - [x] Логирование в БД

- [x] Создана SQL миграция `db/migrations/003_notification_settings.sql`
  - [x] Таблица `notification_settings`
  - [x] Таблица `notification_history`
  - [x] Таблица `abandoned_carts`
  - [x] Индексы для производительности

- [x] Создан API `/api/orders/[id]/status.ts` (PATCH)
  - [x] Изменение статуса заказа
  - [x] Отправка уведомлений покупателю
  - [x] Логирование действия админа
  - [x] Защита через requireAuth

- [x] Создан Cron API `/api/cron/abandoned-cart.ts`
  - [x] Поиск брошенных корзин
  - [x] Проверка активных заказов
  - [x] Отправка напоминаний
  - [x] Защита через CRON_SECRET

- [x] Создан API админа `/api/admin/settings/notifications.ts`
  - [x] GET - получить все настройки
  - [x] POST - обновить несколько
  - [x] PUT - обновить одну
  - [x] Получение статистики
  - [x] Защита через requireAuth(['admin'])

## ✅ Фаза 2: Frontend компоненты (ЗАВЕРШЕНО)

- [x] Создана страница `/admin/settings/notifications.tsx`
  - [x] Таблица с чекбоксами включения/отключения
  - [x] Выбор целевой роли
  - [x] Отображение статистики
  - [x] Кнопка сохранения
  - [x] Обработка ошибок
  - [x] Красивая нeon-тема

## ⏳ Фаза 3: Интеграция с существующим кодом (TODO)

### В pages/api/orders.ts (при оплате заказа):

- [ ] Импортировать `notifyAdminsNewOrder` и `notifyBuyerOrderCreated`
- [ ] После успешной оплаты (status = 'new'):
  ```typescript
  await notifyAdminsNewOrder(orderId, totalPrice, username, itemsCount);
  await notifyBuyerOrderCreated(telegramId, orderId, totalPrice);
  ```

### В pages/api/bot.ts (инициализация):

- [ ] Импортировать `setBotInstance` из `lib/notifications`
- [ ] После создания bot экземпляра:
  ```typescript
  setBotInstance(bot);
  ```

### Окружение (.env.local):

- [ ] Добавить (если используете self-hosted cron):
  ```
  CRON_SECRET=your_secret_key_here
  ```

### vercel.json (если на Vercel):

- [ ] Добавить cron конфигурацию:
  ```json
  {
    "crons": [
      {
        "path": "/api/cron/abandoned-cart",
        "schedule": "0 * * * *"
      }
    ]
  }
  ```

## 🗄️ Фаза 4: База данных (TODO)

- [ ] Выполнить SQL миграцию:
  ```bash
  psql $DATABASE_URL -f db/migrations/003_notification_settings.sql
  ```
- [ ] Проверить создание таблиц:

  ```sql
  \dt notification_settings
  \dt notification_history
  \dt abandoned_carts
  ```

- [ ] Проверить начальные данные:
  ```sql
  SELECT * FROM notification_settings;
  ```

## 🧪 Фаза 5: Тестирование (TODO)

### Тест 1: Отправка одного уведомления

- [ ] Тестовая функция в Node.js:
  ```typescript
  import { sendNotification } from './lib/notifications';
  await sendNotification(YOUR_ID, '✅ Тест', undefined, 'test');
  ```
- [ ] Ожидание: получить сообщение в Telegram

### Тест 2: Рассылка админам

- [ ] Тестовая функция:
  ```typescript
  import { broadcastNotification } from './lib/notifications';
  await broadcastNotification('admin', '🆕 Тест для админов', undefined, 'test');
  ```
- [ ] Ожидание: все админы получат сообщение

### Тест 3: API уведомлений о статусе

- [ ] Curl запрос:
  ```bash
  curl -X PATCH http://localhost:3000/api/orders/550e8400/status \
    -H "X-Telegram-Id: ADMIN_ID" \
    -H "Content-Type: application/json" \
    -d '{"status":"confirmed"}'
  ```
- [ ] Ожидание: покупатель получит уведомление

### Тест 4: Админ-панель

- [ ] Открыть http://localhost:3000/admin/settings/notifications
- [ ] Убедиться что загружаются настройки
- [ ] Убедиться что загружается статистика
- [ ] Попробовать отключить уведомление
- [ ] Сохранить изменение
- [ ] Проверить что сохранилось

### Тест 5: Cron брошенных корзин

- [ ] Curl запрос:
  ```bash
  curl http://localhost:3000/api/cron/abandoned-cart?token=YOUR_SECRET
  ```
- [ ] Проверить логи
- [ ] Проверить что напоминания отправлены

### Тест 6: Логирование

- [ ] Проверить таблицу notification_history:
  ```sql
  SELECT * FROM notification_history ORDER BY sent_at DESC LIMIT 10;
  ```
- [ ] Убедиться что сообщения логируются

## 📊 Фаза 6: Мониторинг (TODO)

- [ ] Настроить мониторинг успешности:

  ```sql
  SELECT COUNT(*) as sent,
         COUNT(CASE WHEN status='failed' THEN 1 END) as failed,
         ROUND(100.0 * COUNT(CASE WHEN status='sent' THEN 1 END) / COUNT(*)) as success_pct
  FROM notification_history
  WHERE sent_at >= NOW() - INTERVAL '24 hours';
  ```

- [ ] Создать дашборд в админке для:
  - Статистики отправки
  - Списка ошибок
  - Трендов по дням

## 🚀 Фаза 7: Production (TODO)

- [ ] Убедиться что все tests passed
- [ ] Задать правильное значение CRON_SECRET в production .env
- [ ] Настроить Vercel crons если используете Vercel
- [ ] Убедиться что TELEGRAM_BOT_TOKEN корректен
- [ ] Протестировать на production БД
- [ ] Включить логирование для мониторинга
- [ ] Настроить алерты на ошибки

## 📋 Финальный чеклист

- [ ] Все коды созданы и протестированы
- [ ] Миграция БД выполнена
- [ ] Интеграция с заказами готова
- [ ] Bot инициализирован
- [ ] Админ-панель работает
- [ ] Cron настроен (Vercel или self-hosted)
- [ ] Тесты пройдены (все 6 фаз)
- [ ] Мониторинг настроен
- [ ] Документация обновлена
- [ ] Production готов

---

## 📊 Статус реализации

```
Backend компоненты:    ████████████████████ 100% ✅
Frontend компоненты:   ████████████████████ 100% ✅
Интеграция:            ░░░░░░░░░░░░░░░░░░░░   0% TODO
БД миграция:           ░░░░░░░░░░░░░░░░░░░░   0% TODO
Тестирование:          ░░░░░░░░░░░░░░░░░░░░   0% TODO
────────────────────────────────────────────
ИТОГО:                 ░░░░░░░░░░░░░░░░░░░░  40%
```

---

## 🔗 Файлы

### Создано

- `lib/notifications.ts` - основной модуль
- `db/migrations/003_notification_settings.sql` - БД
- `pages/api/orders/[id]/status.ts` - API статуса
- `pages/api/cron/abandoned-cart.ts` - Cron задача
- `pages/api/admin/settings/notifications.ts` - Admin API
- `pages/admin/settings/notifications.tsx` - React компонент

### Требует интеграции

- `pages/api/orders.ts` - добавить вызовы уведомлений
- `pages/api/bot.ts` - инициализировать bot instance
- `.env.local` - добавить CRON_SECRET
- `vercel.json` - добавить cron конфигурацию (если Vercel)

---

## 💡 Советы

1. **Тестируйте постепенно** - не все сразу, а по одному компоненту
2. **Используйте логирование** - просмотрите notification_history для отладки
3. **Проверяйте админ-панель** - там видна текущая статистика
4. **Cron требует времени** - первый запрос может быть после часа после включения
5. **CRON_SECRET важен** - не забудьте установить в production

---

**Когда всё будет готово, система будет отправлять уведомления автоматически!** 🎉
