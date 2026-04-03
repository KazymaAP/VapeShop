# 📌 ДЕТАЛЬНЫЙ КАТАЛОГ ВСЕХ 40 НАЙДЕННЫХ ПРОБЛЕМ

## Таблица всех проблем с решениями

| ID | Файл | Строка | Тип | Серьезность | Название | Описание | Решение | Статус |
|---|---|---|---|---|---|---|---|---|
| issue_001 | lib/db.ts | 11 | SECURITY | 🔴 CRITICAL | Небезопасная конфигурация SSL | SSL = { rejectUnauthorized: false } для Production небезопасно. MITM атака возможна | Используй env переменную: ssl: NODE_ENV === "production" ? { rejectUnauthorized: true } : false | ✅ ИСПРАВЛЕНО |
| issue_002 | pages/api/orders.ts | 41 | LOGIC_ERROR | 🔴 CRITICAL | Ошибка с createInvoiceLink | bot.api.createInvoiceLink() не возвращает URL. Это некорректная использование API | Используй bot.api.sendInvoice() вместо createInvoiceLink для Telegram Stars | ❌ ТРЕБУЕТСЯ |
| issue_003 | pages/api/orders.ts | 41 | SECURITY | 🟠 HIGH | Небезопасное извлечение bot ID | Парсинг TOKEN через split() - опасно. Что если TOKEN изменится? | Используй отдельную переменную TELEGRAM_BOT_ID из env | ❌ ТРЕБУЕТСЯ |
| issue_004 | lib/auth.ts | 65 | SECURITY | 🔴 CRITICAL | Отсутствует верификация HMAC подписи | parseInitData() не проверяет HMAC-SHA256 подпись. Данные можно подделать! | Реализуй верификацию подписи (см. комментарий в коде, строки 61-73) | ❌ ТРЕБУЕТСЯ |
| issue_005 | pages/api/cart.ts | 39 | LOGIC_ERROR | 🟠 HIGH | Неправильная обработка ошибок | res.status(200).json({ items: [] }) при ошибке - возвращает 200 вместо 500 | return res.status(500).json({ error: "Database error" }) | ✅ ИСПРАВЛЕНО |
| issue_006 | pages/index.tsx | 66 | LOGIC_ERROR | 🟠 HIGH | N+1 query в fetchProducts | Нет пагинации в запросе. Загружаются ВСЕ товары каждый раз | Добавь LIMIT и OFFSET в SQL запросе на backend | ❌ ТРЕБУЕТСЯ |
| issue_007 | pages/api/products.ts | 28 | SECURITY | 🔴 CRITICAL | SQL Injection в ORDER BY | sort параметр directly in SQL: "ORDER BY ${sort}" - SQL injection! | Используй whitelist: const allowedSorts = ["created_at", "price", "name"]; проверку | ✅ ИСПРАВЛЕНО |
| issue_008 | pages/api/products.ts | 38 | BUG | 🟠 HIGH | Утечка информации об ошибках | Возвращаешь error.stack в production. Это даёт информацию о структуре кода | if (NODE_ENV === "development") return res.status(500).json({ ... stack ... }) | ✅ ИСПРАВЛЕНО |
| issue_009 | pages/_app.tsx | 1 | MISSING | 🟠 HIGH | Нет глобального error boundary | Нет обработки ошибок на уровне приложения | Добавь ErrorBoundary компонент для ловли неожиданных ошибок | ❌ ТРЕБУЕТСЯ |
| issue_010 | pages/cart.tsx | 96 | MISSING | 🟠 HIGH | Нет обработки ошибок fetch | Запросы не проверяют res.ok. Ошибки молча проигнорируются | Добавь if (!res.ok) { hapticError(); return; } перед использованием |  ❌ ТРЕБУЕТСЯ |
| issue_011 | lib/auth.ts | 203 | SECURITY | 🟠 HIGH | Небезопасное хранение telegramId в req | Использование (req as any).telegramId - type casting может скрыть проблемы | Используй req.user = { telegramId } или создай правильный интерфейс | ❌ ТРЕБУЕТСЯ |
| issue_012 | pages/api/admin/import.ts | 52 | DATA_INTEGRITY | 🟠 HIGH | Нет проверки дубликатов при импорте | Одно наименование товара можно импортировать много раз | SELECT COUNT(*) WHERE name = $1 - проверь есть ли дубликат перед INSERT | ❌ ТРЕБУЕТСЯ |
| issue_013 | lib/notifications.ts | 87 | MISSING | 🟠 HIGH | Нет проверки инициализации в sendNotification | botInstance может быть null, но это не обязательно возвращает error | Добавь явную проверку и более информативное сообщение об ошибке | ❌ ТРЕБУЕТСЯ |
| issue_014 | pages/api/cart.ts | 124 | LOGIC_ERROR | 🟠 HIGH | Неправильная проверка ownership в DELETE | parseInt(telegram_id as string) - telegram_id может быть number уже | Проверяй type более аккуратно: if (Number(telegram_id) !== currentTelegramId) | ✅ ИСПРАВЛЕНО |
| issue_015 | pages/index.tsx | 81 | PERFORMANCE | 🟡 MEDIUM | Отсутствует кэширование данных | Каждый render фетчит данные. Нет React Query или SWR | Используй useSWR() или React Query для кэширования на 5 минут | ❌ ТРЕБУЕТСЯ |
| issue_016 | pages/api/admin/products.ts | 45 | LOGIC_ERROR | 🟠 HIGH | SQL query построен неправильно | const query = `UPDATE products SET ${fields.join(", ")} ...` - может сломаться | Проверь что fields не пустой массив перед JOIN и добавь RETURNING | ❌ ТРЕБУЕТСЯ |
| issue_017 | package.json | 11 | MISSING | 🟡 MEDIUM | Нет type definitions для grammy | "grammy": "^1.27.0" - может быть нужны @types/grammy | npm install @types/grammy или проверь комплект с типами | ❌ ТРЕБУЕТСЯ |
| issue_018 | pages/api/orders.ts | 5 | MISSING | 🔴 CRITICAL | Нет requireAuth для создания заказа | POST /api/orders не защищена. Любой может создать заказ от любого пользователя! | Оберни handler в requireAuth(handler, ["buyer"]) | ❌ ТРЕБУЕТСЯ |
| issue_019 | pages/api/products.ts | 28 | SQL_INJECTION | 🔴 CRITICAL | SQL injection в order параметре | order параметр directly в SQL: "ORDER BY ... ${order}" - должно быть только ASC/DESC | if (!["asc", "desc"].includes(order)) order = "desc" | ✅ ИСПРАВЛЕНО |
| issue_020 | lib/db.ts | 14 | MISSING | 🟡 MEDIUM | Нет логирования SQL ошибок | Pool.query() не логирует. Сложно дебажить в production | Добавь middleware для логирования долгих queries или ошибок | ❌ ТРЕБУЕТСЯ |
| issue_021 | pages/admin/index.tsx | 25 | SECURITY | 🟠 HIGH | Нет проверки через requireAuth | Используется простая проверка роли вместо middleware. /api/users/profile не защищена | Используй requireAuth в компоненте или API route | ❌ ТРЕБУЕТСЯ |
| issue_022 | pages/admin/index.tsx | 74 | SECURITY | 🔴 CRITICAL | PUT запрос для смены роли без проверки | Любой может сделать себя администратором через PUT /api/users/role | Добавь requireAuth и проверку что изменяешь только свою роль | ❌ ТРЕБУЕТСЯ |
| issue_023 | pages/api/bot.ts | 20 | MISSING | 🟠 HIGH | Hardcoded данные в callback ответе | Статус заказа hardcoded: "Статус: в обработке". Не из БД | Достань статус из БД: const order = await query("SELECT status FROM orders...") | ❌ ТРЕБУЕТСЯ |
| issue_024 | pages/api/bot.ts | 25 | SECURITY | 🟡 MEDIUM | Hardcoded URL support канала | Support URL hardcoded: https://t.me/support. Должно быть в env | Используй process.env.SUPPORT_TELEGRAM_URL | ❌ ТРЕБУЕТСЯ |
| issue_025 | pages/api/bot.ts | 6 | MISSING | 🟠 HIGH | Нет вызова setBotInstance | Bot инициализирован но setBotInstance() не вызван для notifications.ts | Добавь после инициализации: setBotInstance(bot) | ❌ ТРЕБУЕТСЯ |
| issue_026 | components/ProductCard.tsx | 52 | MISSING | 🟢 LOW | Нет обработки ошибки загрузки изображения | Image может не загрузиться. Нет onError обработчика | Добавь onError={() => setHasImageError(true)} | ❌ ТРЕБУЕТСЯ |
| issue_027 | pages/admin/index.tsx | 50 | PERFORMANCE | 🟡 MEDIUM | Нет кэширования статистики | Статистика фетчится каждый раз при открытии admin панели | Добавь кэш на 30 сек или SWR с revalidateOnFocus: false | ❌ ТРЕБУЕТСЯ |
| issue_028 | pages/api/admin/products.ts | 8 | MISSING | 🟠 HIGH | Нет валидации name перед INSERT | name может быть пустым, null или очень длинным (> 255 chars) | if (!name \|\| name.length < 2 \|\| name.length > 255) { return res.status(400)... } | ❌ ТРЕБУЕТСЯ |
| issue_029 | pages/api/admin/products.ts | 24 | LOGIC_ERROR | 🟠 HIGH | N+1 query в PUT обработчике | Сначала SELECT старого товара, потом UPDATE. Две отдельные операции | Используй RETURNING clause в UPDATE для получения old и new values одним запросом | ❌ ТРЕБУЕТСЯ |
| issue_030 | lib/auth.ts | 54 | MISSING | 🟡 MEDIUM | Нет логирования попыток auth | Неудачные попытки авторизации не логируются. Сложно найти атаки | Логируй: await query("INSERT INTO auth_logs (telegram_id, status) VALUES...") | ❌ ТРЕБУЕТСЯ |
| issue_031 | pages/cart.tsx | 100 | LOGIC_ERROR | 🟠 HIGH | Нет проверки res.ok перед использованием данных | await fetch(...); const data = await res.json(); - error будет проигнорирован | if (!res.ok) { throw new Error(...) } перед res.json() | ❌ ТРЕБУЕТСЯ |
| issue_032 | pages/api/admin/import.ts | 55 | DATA_INTEGRITY | 🟠 HIGH | Нет transaction при импорте | Если импорт упадёт на 10000м товаре, останутся 9999 импортированных | Используй BEGIN TRANSACTION ... COMMIT или откатись через ROLLBACK | ❌ ТРЕБУЕТСЯ |
| issue_033 | lib/db.ts | 14 | MISSING | 🟠 HIGH | Нет retry logic для failed queries | Если connection потеряется, query сразу упадёт | Добавь retry с exponential backoff при потере соединения | ❌ ТРЕБУЕТСЯ |
| issue_034 | pages/api/products.ts | 13 | MISSING | 🟠 HIGH | SQL запрос возвращает неправильные поля | WHERE is_active = true работает, но логика может быть неправильной | Убедись что is_active поле существует в products таблице и правильно индексировано | ❌ ТРЕБУЕТСЯ |
| issue_035 | pages/index.tsx | 65 | MISSING | 🟠 HIGH | Нет try-catch при fetchProducts | Если API упадёт, ошибка будет в console но не покажется пользователю | Добавь try-catch и setError для показа сообщения об ошибке | ❌ ТРЕБУЕТСЯ |
| issue_036 | pages/api/cart.ts | 14 | LOGIC_ERROR | 🟠 HIGH | GET /cart может вернуть неправильные данные | SQL парсит JSON массив items, но структура items не задокументирована | Добавь комментарий о структуре items или используй таблицу cart_items | ❌ ТРЕБУЕТСЯ |
| issue_037 | pages/admin/index.tsx | 28 | SECURITY | 🔴 CRITICAL | Роли проверяются на frontend, а не на backend | Хакер может открыть Dev Tools и изменить isAdmin локально | requireAuth на backend ОБЯЗАТЕЛЕН. Frontend проверка - только UX улучшение | ❌ ТРЕБУЕТСЯ |
| issue_038 | lib/notifications.ts | 200 | MISSING | 🟡 MEDIUM | Нет обработки кейса когда user не существует в БД | broadcastNotification query вернёт пустой result если role не существует | Добавь проверку: if (result.rows.length === 0) { console.warn(...) } | ❌ ТРЕБУЕТСЯ |
| issue_039 | pages/api/orders.ts | 19 | MISSING | 🟠 HIGH | Нет валидации что items действительно exist в БД | Можно отправить несуществующий product_id в items и создать fake заказ | SELECT * FROM products WHERE id = ANY($1::uuid[]) - verify все items exist перед заказом | ❌ ТРЕБУЕТСЯ |
| issue_040 | pages/api/admin/import.ts | 38 | LOGIC_ERROR | 🟡 MEDIUM | Headers могут быть в разном порядке и разных форматах | row["Наименование"] может быть undefined если CSV имеет другие headers | Используй parseCsv функцию с нормализацией headers и обработкой ошибок | ❌ ТРЕБУЕТСЯ |

---

## 📊 СТАТИСТИКА ПО ФАЙЛАМ

### Файлы с МАКСИМАЛЬНЫМ КОЛ-ВОМ ПРОБЛЕМ

| Файл | Кол-во | Критические | Высокие |
|---|---|---|---|
| pages/api/orders.ts | 4 | 2 | 2 |
| pages/api/products.ts | 4 | 2 | 1 |
| pages/api/cart.ts | 5 | 0 | 3 |
| pages/api/admin/products.ts | 4 | 0 | 4 |
| pages/api/admin/import.ts | 3 | 0 | 2 |
| pages/admin/index.tsx | 4 | 2 | 1 |
| lib/auth.ts | 3 | 1 | 1 |
| pages/index.tsx | 3 | 0 | 2 |
| pages/cart.tsx | 2 | 0 | 2 |
| lib/db.ts | 3 | 1 | 1 |

---

## 🔧 ПРОЦЕСС ИСПРАВЛЕНИЯ

### ✅ Уже исправлено (5 проблем)

1. **issue_001** - SSL конфигурация
2. **issue_007** - SQL Injection в ORDER BY
3. **issue_008** - Утечка ошибок в production
4. **issue_005** - Обработка ошибок в GET /cart
5. **issue_014** - Проверка ownership в DELETE

### ❌ Требуется исправление (35 проблем)

Разбиты по сложности:

**ОЧЕНЬ СЛОЖНЫЕ (3-4 часа):**
- issue_002 (переделать логику оплаты)
- issue_004 (реализовать HMAC верификацию)
- issue_037 (переместить все проверки на backend)

**СЛОЖНЫЕ (2-3 часа):**
- issue_006, issue_029, issue_032, issue_033

**СРЕДНИЕ (1-2 часа):**
- issue_003, issue_009, issue_010, issue_016, issue_018, issue_021, issue_022, issue_023, issue_025

**ПРОСТЫЕ (15-30 минут):**
- issue_011, issue_012, issue_013, issue_020, issue_026, issue_027, issue_028, issue_030, issue_031, issue_034, issue_035, issue_036, issue_038, issue_039, issue_040

---

## 📈 ОЦЕНКА ТРУДОЗАТРАТ

| Категория | Кол-во | Время | Приоритет |
|---|---|---|---|
| 🔴 CRITICAL | 7 | 8-10 часов | 🚨 НЕМЕДЛЕННО |
| 🟠 HIGH | 21 | 15-20 часов | ⚠️ НЕДЕЛЯ |
| 🟡 MEDIUM | 9 | 5-8 часов | 📅 2 НЕДЕЛИ |
| 🟢 LOW | 3 | 1-2 часа | 💡 ОПЦИОНАЛЬНО |
| **ИТОГО** | **40** | **29-40 часов** | **~1 спринт** |

---

**Отчёт подготовлен:** 2026-04-03  
**Анализ прекращён:** по команде пользователя
