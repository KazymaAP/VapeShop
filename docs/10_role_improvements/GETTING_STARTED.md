# 🚀 GETTING STARTED — Начало разработки Sprint 1

**Версия:** 1.0  
**Дата:** 2026-04-03  
**Стартовая точка:** Миграции + зависимости + первый API эндпоинт

---

## ⏱️ БЫСТРЫЙ СТАРТ (30 МИНУТ)

### Шаг 1: Клонировать и установить (5 мин)

```bash
cd ~/VapeShop

# Установить новые npm пакеты для Sprint 1
npm install socket.io-client exceljs papaparse recharts leaflet react-leaflet date-fns react-hook-form zod socket.io yandex-maps

# Проверить установку
npm list socket.io exceljs recharts
```

### Шаг 2: Применить миграции (10 мин)

**Для локальной PostgreSQL:**

```bash
# Если используешь localhost:5432
psql -U postgres -d vapeshop < db/migrations/010_role_improvements_part1.sql
psql -U postgres -d vapeshop < db/migrations/010_role_improvements_part2.sql
psql -U postgres -d vapeshop < db/migrations/010_role_improvements_part3.sql

# Вставить тестовые данные
psql -U postgres -d vapeshop < db/migrations/seed_test_data.sql

# Проверить таблицы
psql -U postgres -d vapeshop -c "SELECT COUNT(*) FROM roles; SELECT COUNT(*) FROM audit_log;"
```

**Для Neon (облачная БД):**

1. Открыть Neon Web Console
2. SQL Editor → New Query
3. Скопировать содержимое `010_role_improvements_part1.sql`
4. Выполнить (Ctrl+Enter)
5. Повторить для part2 и part3
6. Выполнить seed_test_data.sql

### Шаг 3: Проверить окружение (5 мин)

```bash
# Проверить .env.local
cat .env.local

# Должно содержать:
# DATABASE_URL=postgresql://...
# TELEGRAM_BOT_TOKEN=your_token
# NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Шаг 4: Запустить сервер (10 мин)

```bash
npm run dev

# Должно вывести:
# ▲ Next.js 14.x.x
# - Local:        http://localhost:3000
# 
# ✓ Ready in 2.3s
```

---

## 📋 ЧЕКЛИСТ ГОТОВНОСТИ

**После Шага 1-4 должно быть:**

- [ ] npm пакеты установлены (`npm list socket.io` не выдаёт ошибку)
- [ ] Все 3 миграции применены (таблицы создались)
- [ ] Тестовые данные загружены (8 пользователей, товары, заказы)
- [ ] lib/auth.ts обновлена с новыми ролями (super_admin, courier, support)
- [ ] Сервер запущен и доступен на localhost:3000
- [ ] Нет ошибок в консоли (только warnings)

---

## 🎯 ПЕРВЫЙ API ЭНДПОИНТ: GET /api/admin/audit-logs

### Цель

Создать рабочий API для получения логов действий администраторов.

### Создать файл

```bash
touch pages/api/admin/audit-logs.ts
```

### Код (скопировать в файл)

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, getTelegramId } from '../../lib/auth';
import { query } from '../../lib/db';

export default requireAuth(async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      user_id,
      action,
      target_type,
      date_from,
      date_to,
      page = '1',
      limit = '50',
      sort = '-created_at'
    } = req.query;

    // Построить WHERE условия
    let whereClause = '1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (user_id) {
      whereClause += ` AND user_id = $${paramCount}`;
      params.push(parseInt(user_id as string));
      paramCount++;
    }

    if (action) {
      whereClause += ` AND action = $${paramCount}`;
      params.push(action);
      paramCount++;
    }

    if (target_type) {
      whereClause += ` AND target_type = $${paramCount}`;
      params.push(target_type);
      paramCount++;
    }

    if (date_from) {
      whereClause += ` AND created_at >= $${paramCount}`;
      params.push(new Date(date_from as string));
      paramCount++;
    }

    if (date_to) {
      whereClause += ` AND created_at <= $${paramCount}`;
      params.push(new Date(date_to as string));
      paramCount++;
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const offset = (pageNum - 1) * limitNum;

    // Получить общее количество
    const countResult = await query(
      `SELECT COUNT(*) as total FROM audit_log WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Получить логи
    const orderBy = sort === '-created_at' 
      ? 'ORDER BY created_at DESC' 
      : 'ORDER BY created_at ASC';
    
    const logsResult = await query(
      `SELECT * FROM audit_log WHERE ${whereClause} ${orderBy} LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limitNum, offset]
    );

    res.status(200).json({
      data: logsResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('audit-logs error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}, ['super_admin', 'admin']);
```

### Протестировать

```bash
# Запрос с тестовым super-admin
curl -H "X-Telegram-Id: 111111111" \
  "http://localhost:3000/api/admin/audit-logs?page=1&limit=10"

# Должен вернуть:
# {
#   "data": [...],
#   "pagination": { "page": 1, "limit": 10, "total": X, "pages": Y }
# }
```

---

## 🧩 СТРУКТУРА ПРОЕКТА SPRINT 1

```
VapeShop/
├── db/
│   └── migrations/
│       ├── 010_role_improvements_part1.sql    ✓ Создана
│       ├── 010_role_improvements_part2.sql    ✓ Создана
│       ├── 010_role_improvements_part3.sql    ✓ Создана
│       └── seed_test_data.sql                  ✓ Создана
│
├── lib/
│   └── auth.ts                                 ✓ Обновлена (новые роли)
│
├── pages/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── audit-logs.ts                  ✓ Создан (первый API)
│   │   │   ├── rbac.ts                        📝 TODO
│   │   │   ├── dashboard-advanced.ts          📝 TODO
│   │   │   ├── products/
│   │   │   │   └── bulk-update.ts             📝 TODO
│   │   │   ├── orders/
│   │   │   │   └── export.ts                  📝 TODO
│   │   │   ├── gift-certificates.ts           📝 TODO
│   │   │   └── promotions.ts                  📝 TODO
│   │   └── super/
│   │       └── rbac.ts                        📝 TODO
│   │
│   └── admin/
│       ├── super/
│       │   ├── index.tsx                      📝 TODO
│       │   └── roles.tsx                      📝 TODO
│       ├── logs.tsx                           📝 TODO
│       ├── dashboard.tsx                      📝 TODO (обновить)
│       ├── products/
│       │   └── bulk-edit.tsx                  📝 TODO
│       └── orders/
│           └── export.tsx                     📝 TODO
│
└── docs/
    └── 10_role_improvements/
        ├── README.md                           ✓ Создан
        ├── analysis.md                         ✓ Создан
        ├── implementation_plan.md              ✓ Создан
        ├── sprint1_api_endpoints.md            ✓ Создан
        ├── sprint1_ui_components.md            ✓ Создан
        ├── testing_guide.md                    ✓ Создан
        ├── GETTING_STARTED.md                  ✓ Этот файл
        └── (TODO остальные спринты)
```

---

## 📊 ПРОГРЕСС-БАР SPRINT 1

```
МИГРАЦИИ:        [████████████████████] 100% ✓
LIB/AUTH:        [████████████████████] 100% ✓
API ЭНДПОИНТЫ:   [████░░░░░░░░░░░░░░░]  20%  (1/5)
UI СТРАНИЦЫ:     [░░░░░░░░░░░░░░░░░░░░]   0%  (0/2)
ДОКУМЕНТАЦИЯ:    [████████████████████] 100% ✓
────────────────────────────────────────────────
ИТОГО SPRINT 1:  [███████░░░░░░░░░░░░░]  44%

Следующий шаг: Реализовать GET/POST/PUT/DELETE /api/admin/rbac
```

---

## 💻 КОМАНДЫ ДЛЯ РАЗРАБОТКИ

```bash
# Запустить dev сервер
npm run dev

# Запустить линтер
npm run lint

# Сборка для production
npm run build

# Запустить production версию локально
npm start

# Подключиться к БД локально
psql -U postgres -d vapeshop

# Просмотр тестовых пользователей
psql -U postgres -d vapeshop -c "SELECT telegram_id, first_name, role FROM users WHERE telegram_id >= 111111111;"

# Просмотр логов
psql -U postgres -d vapeshop -c "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10;"
```

---

## 🔍 ОТЛАДКА

### Ошибка: "Миграция не применилась"

```bash
# Проверить статус миграций
psql -U postgres -d vapeshop -c "\dt"  # Список всех таблиц

# Проверить específиccные таблицы
psql -U postgres -d vapeshop -c "SELECT COUNT(*) FROM audit_log;"
```

### Ошибка: "API возвращает 403 Forbidden"

```bash
# Проверить роль пользователя
psql -U postgres -d vapeshop -c "SELECT telegram_id, role FROM users WHERE telegram_id = 111111111;"

# Должна быть 'super_admin'
```

### Ошибка: "TypeError: Cannot read property 'rows'"

```bash
# Проверить подключение к БД
console.log(process.env.DATABASE_URL);  // должен быть заполнен

# Проверить миграции
psql -U postgres -d vapeshop -c "SELECT * FROM roles LIMIT 1;"
```

---

## 📚 СЛЕДУЮЩИЕ ШАГИ

**После завершения первого API эндпоинта:**

1. ✅ Создать `/api/admin/audit-logs.ts` (сейчас)
2. 📝 Создать `/api/admin/rbac.ts` (GET/POST/PUT/DELETE ролей)
3. 📝 Создать `/api/admin/dashboard-advanced.ts` (графики)
4. 📝 Создать `/api/admin/products/bulk-update.ts` (массовое обновление)
5. 📝 Создать `/api/admin/orders/export.ts` (экспорт Excel)
6. 🎨 Создать UI страницы (`/admin/super/index.tsx`, `/admin/logs.tsx` и т.д.)
7. 🧪 Протестировать все 6 тестов из testing_guide.md

**Рекомендуемый темп:**
- День 1: Миграции + lib/auth.ts + audit-logs.ts API (ты сейчас здесь)
- День 2: rbac.ts + dashboard-advanced.ts APIs
- День 3: bulk-update.ts + export.ts APIs
- День 4: UI страницы super-admin
- День 5: UI страницы админа + расширение существующих
- День 6: Тестирование и отладка
- День 7: Подготовка к Sprint 2

---

## 🆘 КОГДА НУЖНА ПОМОЩЬ

**Если что-то не работает:**

1. Проверить логи сервера (`npm run dev`)
2. Проверить браузер DevTools (F12 → Console + Network)
3. Проверить БД:
   ```bash
   psql -U postgres -d vapeshop -c "SELECT * FROM pg_stat_statements ORDER BY query_start DESC LIMIT 1;"
   ```
4. Проверить файл `docs/10_role_improvements/analysis.md` (там есть примеры)

---

## ✅ ФИНАЛЬНЫЙ ЧЕКЛИСТ ГОТОВНОСТИ

- [ ] npm пакеты установлены
- [ ] Миграции 010 применены
- [ ] Тестовые данные загружены
- [ ] lib/auth.ts обновлена
- [ ] Сервер запущен без ошибок
- [ ] /api/admin/audit-logs работает (curl проверена)
- [ ] Прочитал sprint1_api_endpoints.md
- [ ] Прочитал sprint1_ui_components.md
- [ ] Готов начать Day 2 (rbac.ts)

---

**Документ подготовлен:** Copilot CLI  
**Дата:** 2026-04-03  
**Версия:** 1.0  
**Статус:** ✅ READY FOR DEVELOPMENT
