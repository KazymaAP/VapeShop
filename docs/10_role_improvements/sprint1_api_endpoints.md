# 📋 API ЭНДПОИНТЫ — SPRINT 1

**Спринт 1: Super-Admin + Admin**  
**Статус:** Документация для реализации  
**Файлы:** `pages/api/admin/*` (новые) + `pages/api/super/` (новые)

---

## 🔐 ЭНДПОИНТ: Управление логами (Super-Admin)

### GET /api/admin/audit-logs

**Требуемая роль:** `super_admin`  
**Описание:** Получить логи действий всех пользователей с фильтрацией и пагинацией

**Query параметры:**

```
user_id?: number        // Фильтр по пользователю
action?: string         // Фильтр по действию (create, update, delete)
target_type?: string    // Фильтр по типу объекта (product, user, order)
date_from?: string      // ISO 8601 (2024-01-01)
date_to?: string        // ISO 8601 (2024-01-31)
page?: number           // Пагинация (по умолчанию 1)
limit?: number          // Элементов на странице (по умолчанию 50)
sort?: string           // 'created_at' или '-created_at'
```

**Успешный ответ (200):**

```json
{
  "data": [
    {
      "id": 12345,
      "user_id": 789456,
      "action": "update",
      "target_type": "product",
      "target_id": 456,
      "target_name": "IQOS heets",
      "details": {
        "old_value": { "price": 500 },
        "new_value": { "price": 450 }
      },
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "status": "success",
      "created_at": "2024-04-03T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1234,
    "pages": 25
  }
}
```

**Ошибки:**

- `401`: Unauthorized (не авторизован)
- `403`: Forbidden (недостаточно прав, требуется super_admin)
- `500`: Internal Server Error

**Реализация (файл `pages/api/admin/audit-logs.ts`):**

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, getTelegramId } from '../../lib/auth';
import { query } from '../../lib/db';

export default requireAuth(
  async (req, res) => {
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
        page = 1,
        limit = 50,
        sort = '-created_at',
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

      const offset = ((parseInt(page as string) || 1) - 1) * (parseInt(limit as string) || 50);

      // Получить общее количество
      const countResult = await query(
        `SELECT COUNT(*) as total FROM audit_log WHERE ${whereClause}`,
        params
      );
      const total = countResult.rows[0].total;

      // Получить логи
      const orderBy =
        sort === '-created_at' ? 'ORDER BY created_at DESC' : 'ORDER BY created_at ASC';
      const logsResult = await query(
        `SELECT * FROM audit_log WHERE ${whereClause} ${orderBy} LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        [...params, parseInt(limit as string) || 50, offset]
      );

      res.status(200).json({
        data: logsResult.rows,
        pagination: {
          page: parseInt(page as string) || 1,
          limit: parseInt(limit as string) || 50,
          total,
          pages: Math.ceil(total / (parseInt(limit as string) || 50)),
        },
      });
    } catch (err) {
      console.error('audit-logs error:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
  ['super_admin']
);
```

---

## 🔐 ЭНДПОИНТЫ: Управление ролями (RBAC) — Super-Admin

### GET /api/admin/rbac

**Требуемая роль:** `super_admin`  
**Описание:** Получить все роли и их разрешения

**Успешный ответ (200):**

```json
{
  "roles": [
    {
      "id": 1,
      "name": "super_admin",
      "description": "Super Administrator - Full access",
      "is_system_role": true,
      "permissions": [
        "users:read",
        "users:write",
        "users:delete",
        "products:read",
        "products:write",
        "products:delete",
        "audit:read",
        "audit:export",
        "roles:read",
        "roles:write",
        "roles:delete"
      ]
    },
    {
      "id": 2,
      "name": "admin",
      "description": "Administrator",
      "permissions": ["products:read", "products:write", "orders:read", "orders:export"]
    }
  ]
}
```

### POST /api/admin/rbac

**Требуемая роль:** `super_admin`  
**Описание:** Создать новую роль

**Body:**

```json
{
  "name": "content_manager",
  "description": "Управление контентом (баннеры, FAQ)",
  "permissions": ["banners:read", "banners:write", "faq:read", "faq:write"]
}
```

### PUT /api/admin/rbac/[role_id]

**Требуемая роль:** `super_admin`  
**Описание:** Обновить роль и её разрешения

**Body:**

```json
{
  "description": "Обновленное описание",
  "permissions": ["products:read", "products:write", "orders:read"]
}
```

### DELETE /api/admin/rbac/[role_id]

**Требуемая роль:** `super_admin`  
**Описание:** Удалить роль (только если she не system_role)

---

## 📊 ЭНДПОИНТ: Продвинутый дашборд (Admin)

### GET /api/admin/dashboard-advanced

**Требуемая роль:** `admin`, `super_admin`  
**Описание:** Получить статистику и графики для дашборда

**Query параметры:**

```
period?: string       // 'day', 'week', 'month', 'year'
date_from?: string    // ISO 8601
date_to?: string      // ISO 8601
```

**Успешный ответ (200):**

```json
{
  "summary": {
    "total_revenue": 150000,
    "total_orders": 420,
    "average_check": 357.14,
    "new_customers": 85,
    "returning_customers": 335
  },
  "revenue_chart": [
    { "date": "2024-04-01", "revenue": 15000, "orders": 42 },
    { "date": "2024-04-02", "revenue": 16500, "orders": 45 }
  ],
  "top_products": [
    { "id": 123, "name": "IQOS heets", "sales": 245, "revenue": 122500 },
    { "id": 456, "name": "Lost Mary", "sales": 180, "revenue": 90000 }
  ],
  "top_categories": [
    { "id": 1, "name": "Pod Systems", "sales": 400, "revenue": 140000 },
    { "id": 2, "name": "E-liquids", "sales": 200, "revenue": 60000 }
  ],
  "top_brands": [
    { "id": 10, "name": "IQOS", "sales": 250 },
    { "id": 20, "name": "VAPE BRAND", "sales": 170 }
  ],
  "geographic_data": [
    { "city": "Moscow", "orders": 300, "revenue": 100000 },
    { "city": "SPB", "orders": 120, "revenue": 50000 }
  ]
}
```

---

## 🏷️ ЭНДПОИНТЫ: Массовое редактирование товаров (Admin)

### POST /api/admin/products/bulk-update

**Требуемая роль:** `admin`, `super_admin`  
**Описание:** Массово обновить товары

**Body:**

```json
{
  "product_ids": [123, 456, 789],
  "updates": {
    "price_action": "multiply", // 'multiply', 'percent_increase', 'percent_decrease', 'set'
    "price_value": 1.1, // 1.1 = +10%, 0.95 = -5%, 500 = установить
    "discount_percent": 15, // 0-100
    "category_id": 1,
    "brand_id": 10,
    "status": "active", // 'active', 'hit', 'new', 'disabled'
    "is_hit": true,
    "is_new": false
  }
}
```

**Ответ (200):**

```json
{
  "success": true,
  "updated_count": 3,
  "errors": []
}
```

---

## 📥 ЭНДПОИНТ: Экспорт заказов (Admin)

### GET /api/admin/orders/export

**Требуемая роль:** `admin`, `super_admin`  
**Описание:** Экспортировать заказы в Excel, CSV или PDF

**Query параметры:**

```
format: string       // 'xlsx', 'csv', 'pdf'
fields: string[]     // Выбранные поля (order_id, customer, total, status, date)
date_from?: string
date_to?: string
status?: string      // Фильтр по статусу
min_amount?: number
max_amount?: number
```

**Ответ:**

- Бинарные данные файла (Content-Type: application/vnd.ms-excel)
- Имя файла: `orders_2024-04-03.xlsx`

**Реализация использует:**

- `exceljs` — для Excel-файлов
- `papaparse` — для CSV

---

## 🎁 ДОПОЛНИТЕЛЬНЫЕ ЭНДПОИНТЫ SPRINT 1

### POST /api/admin/gift-certificates

**Требуемая роль:** `admin`, `super_admin`  
**Описание:** Создать подарочный сертификат

**Body:**

```json
{
  "amount": 5000,
  "quantity": 10,
  "expires_days": 90,
  "recipient_telegram_id": null
}
```

### GET /api/admin/promotions

**Требуемая роль:** `admin`, `super_admin`  
**Описание:** Список всех акций

### POST /api/admin/promotions

**Требуемая роль:** `admin`, `super_admin`  
**Описание:** Создать новую акцию

**Body:**

```json
{
  "name": "Spring Sale",
  "type": "discount_percent",
  "value": 20,
  "start_date": "2024-04-10T00:00:00Z",
  "end_date": "2024-04-20T23:59:59Z",
  "applicable_categories": [1, 2],
  "minimum_purchase": 1000
}
```

---

## 📝 ФАЙЛОВАЯ СТРУКТУРА SPRINT 1

```
pages/api/admin/
├── audit-logs.ts                 # GET: Логи действий ✓
├── rbac.ts                       # GET/POST/PUT/DELETE: Управление ролями ✓
├── dashboard-advanced.ts          # GET: Расширенная аналитика ✓
├── products/
│   └── bulk-update.ts            # POST: Массовое обновление ✓
├── orders/
│   └── export.ts                 # GET: Экспорт в Excel/CSV ✓
├── gift-certificates.ts          # GET/POST: Подарочные сертификаты
├── gift-certificates/
│   └── [id].ts                   # GET/PUT/DELETE
├── promotions.ts                 # GET/POST: Акции
└── promotions/
    └── [id].ts                   # GET/PUT/DELETE
```

---

## 🔑 ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ

Добавить в `.env.local`:

```
# Admin features
ENABLE_AUDIT_LOG=true
ENABLE_RBAC=true
ENABLE_PROMOTIONS=true
ENABLE_GIFT_CERTIFICATES=true
```

---

## 📦 NPM ПАКЕТЫ

Для Sprint 1 нужны:

```bash
npm install exceljs recharts
```

---

## ✅ ЧЕКЛИСТ РЕАЛИЗАЦИИ SPRINT 1

- [ ] Миграции 010_role_improvements_part1.sql применены
- [ ] lib/auth.ts обновлена с новыми ролями
- [ ] GET /api/admin/audit-logs работает
- [ ] GET/POST/PUT/DELETE /api/admin/rbac работают
- [ ] GET /api/admin/dashboard-advanced с графиками
- [ ] POST /api/admin/products/bulk-update
- [ ] GET /api/admin/orders/export (Excel, CSV)
- [ ] POST /api/admin/gift-certificates
- [ ] GET/POST /api/admin/promotions
- [ ] UI дашборда super-admin готова
- [ ] UI дашборда admin расширена
- [ ] Все API протестированы

---

**Документ подготовлен:** Copilot CLI  
**Дата:** 2026-04-03  
**Следующий документ:** `sprint1_ui_components.md`
