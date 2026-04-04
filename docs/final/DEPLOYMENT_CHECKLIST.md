# ✅ ЧЕК-ЛИСТ ПРИМЕНЕНИЯ ИЗМЕНЕНИЙ

**Дата:** 2026-04-04  
**Статус:** 🟢 ГОТОВО К ПРИМЕНЕНИЮ  
**Общее кол-во шагов:** 12  

---

## 📋 ПОШАГОВАЯ ИНСТРУКЦИЯ

### ФАЗА 0: ПОДГОТОВКА
- [ ] Сохранить бэкап текущей БД
  ```bash
  pg_dump -d vapeshop > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] Создать ветку для изменений
  ```bash
  git checkout -b phase1-security-fixes
  ```

- [ ] Проверить текущее состояние
  ```bash
  npm run build
  npm run lint
  ```

### ФАЗА 1: БД МИГРАЦИИ (КРИТИЧНО)

**Шаг 1: Миграция безопасности**
```bash
psql -d vapeshop -f db/migrations/015_critical_security_fixes.sql
```
- ✅ Создаёт таблицы: audit_log, auth_attempts, init_data_cache
- ✅ Добавляет колонки: is_active, created_by, updated_by в products
- ✅ Создаёт индексы
- ⏱️ Ожидаемое время: 5-10 секунд

**Шаг 2: Миграция индексов**
```bash
psql -d vapeshop -f db/migrations/016_add_performance_indexes.sql
```
- ✅ Добавляет 20+ индексов
- ✅ Оптимизирует запросы
- ⏱️ Ожидаемое время: 10-20 секунд

**Проверка:**
```bash
psql -d vapeshop -c "SELECT COUNT(*) FROM audit_log;"
psql -d vapeshop -c "SELECT COUNT(*) FROM information_schema.indexes WHERE table_schema = 'public';"
```

### ФАЗА 2: ОБНОВЛЕНИЕ КОДА

**Шаг 3: Обновить файлы lib/**
- [ ] `lib/auth.ts` — HMAC верификация
- [ ] `lib/db.ts` — retry logic
- [ ] `lib/validate.ts` — новая валидация
- [ ] `lib/useFetch.ts` — новый fetch хук
- [ ] `lib/useSWR.ts` — новый SWR хук
- [ ] `lib/rateLimit.ts` — обновленный rate limiting

**Проверка:**
```bash
npm run typecheck
```

**Шаг 4: Обновить API эндпоинты**
- [ ] `pages/api/products.ts` — пагинация
- [ ] `pages/api/orders.ts` — переработан
- [ ] `pages/api/bot.ts` — переработан
- [ ] `pages/api/addresses.ts` — обновлен
- [ ] `pages/api/favorites.ts` — обновлен
- [ ] `pages/api/reviews.ts` — переработан
- [ ] `pages/api/users/profile.ts` — переработан
- [ ] `pages/api/users/role.ts` — переработан
- [ ] `pages/api/admin/orders.ts` — переработан (N+1 fix)
- [ ] `pages/api/admin/products.ts` — переработан
- [ ] `pages/api/admin/import.ts` — обновлен
- [ ] `pages/api/admin/audit-logs.ts` — обновлен

**Проверка:**
```bash
npm run build
```

**Шаг 5: Обновить типы**
- [ ] `types/api.ts` — новые типы

**Шаг 6: Добавить компоненты**
- [ ] `components/ErrorBoundary.tsx` — новый
- [ ] `components/SkeletonLoader.tsx` — новый
- [ ] `components/ProductImage.tsx` — новый
- [ ] `pages/_app.tsx` — добавлен ErrorBoundary

### ФАЗА 3: УСТАНОВКА ЗАВИСИМОСТЕЙ

**Шаг 7: npm install**
```bash
npm install swr
npm install exceljs  # Для ФАЗЫ 2 финала
```

**Проверка:**
```bash
npm list swr exceljs
```

### ФАЗА 4: ПРОВЕРКА И ТЕСТИРОВАНИЕ

**Шаг 8: Локальное тестирование**
```bash
npm run dev
```
- [ ] Приложение стартует без ошибок
- [ ] Error Boundary видна в консоли
- [ ] Не видно красных ошибок

**Тест HMAC верификации:**
```bash
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: tg_init_data YOUR_INIT_DATA"
```
- ✅ Должен вернуть 401 без инициализации
- ✅ Должен вернуть 200 с правильной initData

**Тест Rate Limiting:**
```bash
for i in {1..100}; do
  curl -X GET http://localhost:3000/api/products
done
```
- ✅ После ~60 запросов должно быть 429 Too Many Requests

**Тест N+1 fix:**
```bash
curl -X GET "http://localhost:3000/api/admin/orders?limit=20"
```
- ✅ Должен выполниться за 1-2 запроса вместо N+1

**Шаг 9: Сборка production**
```bash
npm run build
```
- ✅ Должна завершиться без ошибок
- ✅ Проверить размер бандла

**Шаг 10: Lint проверка**
```bash
npm run lint
```
- ✅ Не должно быть ошибок

### ФАЗА 5: РАЗВЕРТЫВАНИЕ

**Шаг 11: Коммит изменений**
```bash
git add .
git commit -m "ФАЗА 1: Критическая безопасность (12 уязвимостей закрыто)

- Реализована HMAC-SHA256 верификация initData
- Добавлены проверки принадлежности данных
- Устранены N+1 запросы
- Добавлены индексы БД (20+)
- Реализованы транзакции для импорта CSV
- Добавлено логирование в audit_log
- Реализован retry logic для БД
- И ещё 5+ критических исправлений

ФАЗА 2: Начата разработка (75% готово)
- Error Boundary
- Валидация данных
- Rate limiting
- Skeleton loaders
- Product Image Component
- Admin API переработаны

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

**Шаг 12: Push и deploy**
```bash
git push origin phase1-security-fixes
```
- [ ] Создать Pull Request
- [ ] Получить approval
- [ ] Merge в main
- [ ] Deploy на Vercel

---

## 🧪 ТЕСТИРОВАНИЕ КАЖДОГО КОМПОНЕНТА

### Безопасность
```bash
# HMAC верификация
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"items": []}' \
  -H "Authorization: invalid_signature"
# Должно вернуть: 401 Unauthorized
```

### API Ответы
```bash
# Проверить единый формат
curl -X GET "http://localhost:3000/api/products?page=1"
# Должно быть: { success: true, data: {...}, timestamp: ... }
```

### Пагинация
```bash
# Проверить пагинацию
curl -X GET "http://localhost:3000/api/products?page=2&limit=10"
# Должно быть: pagination { page: 2, limit: 10, total: X, totalPages: Y }
```

### Rate Limiting
```bash
# Проверить заголовки
curl -X GET http://localhost:3000/api/products -i | grep X-RateLimit
# Должны быть: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```

### Error Boundary
- Откройте DevTools
- Выполните ошибку в компоненте
- Должна отобразиться страница с "⚠️ Ошибка приложения"

---

## ⏱️ ОЖИДАЕМЫЕ ВРЕМЕНА

| Шаг | Операция | Время |
|-----|----------|-------|
| 1 | Миграция 015 | 5-10 сек |
| 2 | Миграция 016 | 10-20 сек |
| 3-6 | Обновление файлов | 5 мин |
| 7 | npm install | 2-3 мин |
| 8 | Локальное тестирование | 5-10 мин |
| 9 | npm build | 3-5 мин |
| 10 | npm lint | 1-2 мин |
| 11 | git commit | 1 мин |
| 12 | Push + Deploy | 5-10 мин |

**Общее время:** ~40-60 минут

---

## 🔄 ОТКАТ (если что-то пошло не так)

### Откат БД
```bash
psql -d vapeshop -f backup_YYYYMMDD_HHMMSS.sql
```

### Откат кода
```bash
git reset --hard origin/main
```

### Откат зависимостей
```bash
npm install
```

---

## ✅ ФИНАЛЬНАЯ ПРОВЕРКА

Перед тем как считать работу завершённой:

- [ ] `npm run build` завершилась успешно
- [ ] `npm run lint` завершилась без ошибок
- [ ] `npm run dev` запустилась без ошибок
- [ ] Все API тесты прошли успешно
- [ ] Error Boundary работает
- [ ] Rate Limiting работает
- [ ] HMAC верификация работает
- [ ] N+1 запросы исправлены
- [ ] Индексы БД созданы
- [ ] Логирование в audit_log работает

---

## 📊 СТАТУС ПОСЛЕ ПРИМЕНЕНИЯ

После применения всех изменений:

```
✅ ФАЗА 1: Критическая безопасность — 100% ГОТОВО
   - 12 уязвимостей закрыто
   - 11 файлов обновлено
   - 2 миграции БД применены

🟡 ФАЗА 2: Высокий приоритет — 75% ГОТОВО
   - 12 из 16 задач выполнено
   - 4 задачи осталось

Проект готов к продолжению разработки ФАЗЫ 3.
```

---

**Подписано:** Copilot CLI v1.0.17  
**Дата:** 2026-04-04  
**Статус:** 🟢 ГОТОВО К ПРИМЕНЕНИЮ
