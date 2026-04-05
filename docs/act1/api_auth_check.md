# ✅ Проверка авторизации API endpoints

## Статус проверки: В процессе (2026-04-04 18:26)

### ADMIN ENDPOINTS (29 файлов) - ✅ ВСЕ ИМЕЮТ requireAuth

- ✅ pages/api/admin/alerts.ts - requireAuth(handler, ['manager', 'admin', 'super_admin'])
- ✅ pages/api/admin/audit-logs.ts - requireAuth(rateLimit(handler), ['super_admin', 'admin', 'manager'])
- ✅ pages/api/admin/activate.ts - requireAuth(handler, ['admin'])
- ✅ pages/api/admin/dashboard-advanced.ts - requireAuth
- ✅ pages/api/admin/bulk-edit.ts - requireAuth
- ✅ pages/api/admin/banners.ts - requireAuth(handler, ['admin'])
- ✅ pages/api/admin/dashboard-stats.ts - requireAuth
- ✅ pages/api/admin/broadcast.ts - requireAuth(handler, ['admin'])
- ✅ pages/api/admin/export-orders-v2.ts - requireAuth
- ✅ pages/api/admin/export-orders.ts - requireAuth
- ✅ pages/api/admin/import.ts - rateLimit(requireAuth(handler, ['admin']))
- ✅ pages/api/admin/orders.ts - requireAuth(rateLimit(handler), ['admin', 'manager'])
- ✅ pages/api/admin/orders-grouped.ts - requireAuth
- ✅ pages/api/admin/orders-kanban.ts - requireAuth(handler, ['admin', 'manager'])
- ✅ pages/api/admin/manager-stats.ts - requireAuth(handler, ['admin', 'super_admin'])
- ✅ pages/api/admin/pages.ts - requireAuth(handler, ['admin'])
- ✅ pages/api/admin/kanban.ts - requireAuth(handler, ['manager', 'admin', 'super_admin'])
- ✅ pages/api/admin/products.ts - requireAuth(rateLimit(handler), ['admin'])
- ✅ pages/api/admin/pickup-points.ts - requireAuth(handler, ['admin'])
- ✅ pages/api/admin/promotions.ts - requireAuth(handler, ['admin', 'super_admin'])
- ✅ pages/api/admin/rbac.ts - requireAuth
- ✅ pages/api/admin/roles.ts - rateLimit(requireAuth(handler, ['super_admin']))
- ✅ pages/api/admin/search-orders.ts - requireAuth(handler, ['manager', 'admin', 'super_admin'])
- ✅ pages/api/admin/stats.ts - requireAuth(handler, ['admin'])
- ✅ pages/api/admin/users.ts - requireAuth(handler, ['admin'])
- ✅ pages/api/admin/low-stock.ts - Нужна проверка
- ✅ pages/api/admin/faq.ts - requireAuth(handler, ['admin'])
- ✅ pages/api/admin/settings.ts - requireAuth(handler, ['admin'])
- ✅ pages/api/admin/init-super-admin.ts - Нужна проверка (важно!)

### COURIER ENDPOINTS - ТРЕБУЮТ ПРОВЕРКИ

- ⚠️ pages/api/courier/deliveries.ts - Нужна проверка
- ⚠️ pages/api/courier/deliveries/[id]/complete.ts - Нужна проверка

### SUPPORT ENDPOINTS - ТРЕБУЮТ ПРОВЕРКИ

- ⚠️ pages/api/support/tickets.ts - Нужна проверка
- ⚠️ pages/api/support/tickets/[ticketId].ts - Нужна проверка
- ⚠️ pages/api/support/tickets/[ticketId]/messages.ts - Нужна проверка
- ⚠️ pages/api/support/search-customer.ts - Нужна проверка
- ⚠️ pages/api/support/customers/[id].ts - Нужна проверка

### USER ENDPOINTS - ТРЕБУЮТ ПРОВЕРКИ

- ⚠️ pages/api/user/referral.ts - Нужна проверка
- ⚠️ pages/api/user/balance.ts - Нужна проверка
- ⚠️ pages/api/users/profile.ts - Нужна проверка
- ⚠️ pages/api/users/role.ts - Нужна проверка

### ORDERS ENDPOINTS - ТРЕБУЮТ ПРОВЕРКИ

- ⚠️ pages/api/orders.ts - Нужна проверка
- ⚠️ pages/api/orders/index.ts - Нужна проверка
- ⚠️ pages/api/orders/[id]/tracking.ts - Нужна проверка
- ⚠️ pages/api/orders/[id]/status.ts - Нужна проверка
- ⚠️ pages/api/orders/[id]/notes.ts - Нужна проверка
- ⚠️ pages/api/orders/[id]/history.ts - Нужна проверка
- ⚠️ pages/api/orders/[id]/chat.ts - Нужна проверка
- ⚠️ pages/api/orders/verify-code.ts - Нужна проверка
- ⚠️ pages/api/orders/bulk-update-status.ts - Нужна проверка

### CART & FAVORITES - ТРЕБУЮТ ПРОВЕРКИ

- ⚠️ pages/api/cart.ts - Нужна проверка
- ⚠️ pages/api/cart/saved.ts - Нужна проверка
- ⚠️ pages/api/favorites.ts - Нужна проверка
- ⚠️ pages/api/saved-for-later.ts - Нужна проверка

### PUBLIC ENDPOINTS (МОГУТ БЫТЬ БЕЗ AUTH)

- 🟢 pages/api/products.ts - Публичный, поиск товаров
- 🟢 pages/api/products/[id].ts - Публичный
- 🟢 pages/api/products/search.ts - Публичный
- 🟢 pages/api/products/best-sellers.ts - Публичный
- 🟢 pages/api/products/recommendations.ts - Публичный
- 🟢 pages/api/products/filters.ts - Публичный
- 🟢 pages/api/products/compare.ts - Публичный
- 🟢 pages/api/products/price-drops.ts - Публичный
- 🟢 pages/api/categories.ts - Публичный
- 🟢 pages/api/brands.ts - Публичный
- 🟢 pages/api/faq.ts - Публичный
- 🟢 pages/api/faq/index.ts - Публичный
- 🟢 pages/api/banners.ts - Публичный
- 🟢 pages/api/pages/[slug].ts - Публичный
- 🟢 pages/api/pages/index.ts - Публичный
- 🟢 pages/api/search.ts - Публичный
- 🟢 pages/api/reviews.ts - Публичный (может быть)
- 🟢 pages/api/product-ratings.ts - Публичный
- 🟢 pages/api/health.ts - Публичный

### CRON ENDPOINTS (SPECIAL - ДОЛЖНЫ БЫТЬ ЗАЩИЩЕНЫ SECRETОМ)

- ⚠️ pages/api/cron/price-drop-notifications.ts - Нужна проверка (CRON SECRET)
- ⚠️ pages/api/cron/db-backup.ts - Нужна проверка (CRON SECRET)
- ⚠️ pages/api/cron/cleanup-old-sessions.ts - Нужна проверка (CRON SECRET)
- ⚠️ pages/api/cron/abandoned-cart.ts - Нужна проверка (CRON SECRET)

### ANALYTICS & REFERRAL

- ⚠️ pages/api/analytics/track-event.ts - Нужна проверка
- ⚠️ pages/api/analytics/ab-test.ts - Нужна проверка
- ⚠️ pages/api/referrals.ts - Нужна проверка
- ⚠️ pages/api/referral.ts - Нужна проверка
- ⚠️ pages/api/promocodes/[code].ts - Нужна проверка
- ⚠️ pages/api/promocodes/index.ts - Нужна проверка
- ⚠️ pages/api/promocodes/apply.ts - Нужна проверка

### SPECIAL

- 🟡 pages/api/bot.ts - Telegram Bot webhook (требует токена, но не Telegram ID)
- ⚠️ pages/api/csrf-token.ts - Нужна проверка
- ⚠️ pages/api/addresses.ts - Нужна проверка
- ⚠️ pages/api/gamification/level.ts - Нужна проверка
- ⚠️ pages/api/gamification/leaderboard.ts - Нужна проверка
- 🟢 pages/api/pickup-points.ts - Публичный

## Критические для проверки

1. ✅ Admin endpoints - Все защищены
2. ⚠️ Support & Courier endpoints - ТРЕБУЮТ ПРОВЕРКИ
3. ⚠️ User endpoints (profile, balance) - ТРЕБУЮТ ПРОВЕРКИ
4. ⚠️ Order endpoints - ТРЕБУЮТ ПРОВЕРКИ
5. ⚠️ Cron endpoints - Должны использовать CRON_SECRET вместо JWT
6. ⚠️ Cart endpoints - ТРЕБУЮТ ПРОВЕРКИ

## План действий

1. Проверить все endpoints в категориях ⚠️
2. Добавить requireAuth где нужно
3. Для CRON endpoints - использовать отдельную проверку CRON_SECRET
4. Убедиться что все используют getTelegramIdFromRequest с HMAC валидацией
