# 📋 Порядок миграций БД VapeShop

## Текущий статус: ✅ Оптимизирован (после переименования)

### Последовательность миграций

```
001_initial_schema.sql                    # Создание основных таблиц
002_telegram_stars_payment.sql           # Система оплаты через Telegram Stars
003_notification_settings.sql            # Уведомления
004_delivery_management.sql              # Доставка
008_content_management.sql               # Управление контентом
009_add_indexes.sql                      # Индексы

# ВАЖНО: Следующие 3 файла разделены на части (a, b, c)
010_role_improvements_part1.sql          # Системы ролей (часть 1)
010b_role_improvements_part2.sql         # Системы ролей (часть 2)
010c_role_improvements_part3.sql         # Системы ролей (часть 3)

012_sprint2_manager_customer.sql         # Sprint 2
013_sprint3_courier_support.sql          # Sprint 3
014_sprint4_gamification_analytics.sql   # Sprint 4
015_critical_security_fixes.sql          # Security fixes
016_add_performance_indexes.sql          # Performance indexes

# ВАЖНО: Следующие 2 файла разделены на части (a, b)
017_soft_delete_support.sql              # Soft delete (часть 1)
017b_add_phase3_ux_improvements.sql      # Phase 3 UX (часть 2)

# ВАЖНО: Следующие 2 файла разделены на части (a, b)
018_referral_system.sql                  # Реферальная система (часть 1)
018b_phase4_features.sql                 # Phase 4 features (часть 2)

019_saved_for_later.sql                  # Сохранённое на потом
020_product_reviews.sql                  # Отзывы о товарах
021_product_comparison.sql               # Сравнение товаров
022_admin_logs.sql                       # Admin логирование
023_super_admin_init.sql                 # Super admin инициализация
024_payment_logs.sql                     # Логи платежей

seed_test_data.sql                       # Тестовые данные (опционально)
```

### Проблемы, которые были

1. ❌ **Дублирование миграций 010** - Было 3 части с одинаковым номером
   - Решение: Переименованы в `010_part1.sql`, `010b_part2.sql`, `010c_part3.sql`

2. ❌ **Дублирование миграций 017** - Было 2 файла с одинаковым номером
   - Решение: Переименованы в `017_soft_delete.sql`, `017b_phase3_ux.sql`

3. ❌ **Дублирование миграций 018** - Было 2 файла с одинаковым номером (разная схема!)
   - Решение: Переименованы в `018_referral_system.sql`, `018b_phase4_features.sql`

### ✅ Текущее состояние

Все миграции:

- ✅ Имеют уникальные номера
- ✅ Упорядочены в порядке возрастания
- ✅ Расположены в правильной папке `db/migrations/`
- ✅ Используют `IF NOT EXISTS` где нужно

### ⚠️ ВАЖНО: После применения миграций

Проверить в БД наличие этих таблиц:

```sql
-- Проверка основных таблиц
SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;

-- Проверка таблиц пользователей и ролей
SELECT * FROM information_schema.tables WHERE table_name IN
('users', 'user_roles', 'user_balance', 'referral_codes', 'referrals');

-- Проверка заказов и доставки
SELECT * FROM information_schema.tables WHERE table_name IN
('orders', 'courier_deliveries', 'delivery_addresses', 'pickup_points');

-- Проверка товаров и сравнения
SELECT * FROM information_schema.tables WHERE table_name IN
('products', 'product_comparisons', 'favorites', 'reviews');

-- Проверка поддержки
SELECT * FROM information_schema.tables WHERE table_name IN
('support_tickets', 'support_messages', 'kanban_cards');

-- Проверка логирования
SELECT * FROM information_schema.tables WHERE table_name IN
('audit_log', 'admin_logs', 'payment_logs');
```

### 📝 Примечание о реферальной системе

**Конфликт в миграциях 018a и 018b**:

- 018_referral_system.sql создает: `referral_codes`, `referral_uses`
- 018b_phase4_features.sql создает: `referral_codes`, `referrals`, `user_balance`

**Решение**:

- Обе используют `IF NOT EXISTS`, поэтому первая успешно создаст таблицы
- Вторая не будет переделывать уже существующие таблицы
- Может быть необходимо вручную объединить схемы (см. `all_issues.md`)
