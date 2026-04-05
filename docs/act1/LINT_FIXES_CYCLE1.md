# 🔧 План исправления ESLint ошибок - Цикл 1

## Сводка ошибок (200+ ошибок, 80+ warnings)

### Категории ошибок:

1. **Неиспользуемые переменные** (~60 ошибок)
   - `'_err' is defined but never used` - переменные в catch блоках
   - `'NextApiRequest/NextApiResponse' is defined but never used` - импорты в API routes
   - Неиспользуемые переменные в компонентах

2. **`any` типы** (~80 ошибок)
   - Множество `Unexpected any` в lib/, pages/api/, components/

3. **React Hooks warnings** (~40 warnings)
   - Missing dependencies в useEffect
   - Conditional hook calls
   - Missing dependencies в useMemo

4. **`<img>` вместо `<Image>`** (~8 ошибок)
   - Использование нативного HTML img вместо next/image

5. **console.log** (~20 warnings)
   - Unexpected console statement в lib/, pages/api/cron/

6. **Предпочтение const** (~5 ошибок)
   - Использование `let` вместо `const`

7. **Прочие**
   - Неправильный порядок hooks
   - Неправильные ARIA атрибуты

## Стратегия исправления (приоритет)

### Приоритет 1: ERRORS (обязательные для build)
- [ ] Удалить неиспользуемые импорты (NextApiRequest, NextApiResponse и т.д.)
- [ ] Переименовать неиспользуемые переменные на `_` (например `_err`)
- [ ] Заменить `any` на правильные типы
- [ ] Заменить `<img>` на `<Image>`
- [ ] Исправить const/let

### Приоритет 2: WARNINGS (хорошая практика)
- [ ] Добавить missing dependencies в useEffect
- [ ] Удалить console.log в production коде
- [ ] Исправить conditional hooks

## Файлы для исправления (по приоритету)

### BATCH 1: API endpoints (самые критичные)
- pages/api/admin/*.ts (10+ files)
- pages/api/user/*.ts (3+ files)
- pages/api/orders/*.ts (5+ files)
- pages/api/courier/*.ts (2+ files)

### BATCH 2: Компоненты
- pages/admin/*.tsx (10+ files)
- components/*.tsx (20+ files)
- pages/*.tsx (10+ files)

### BATCH 3: Lib файлы
- lib/*.ts (10+ files)
- lib/bot/*.ts (3+ files)

## Прогресс

- Всего ошибок: 220
- Исправлено: 0
- В процессе: 0
- Осталось: 220

---

Обновлено: 2026-04-05T05:57:49Z
