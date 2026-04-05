# 📋 Стандарты качества кода VapeShop

Этот документ описывает все стандарты и лучшие практики, которым должен соответствовать код в проекте VapeShop.

## ✅ Требования к коду

### 1. TypeScript и типизация

**Абсолютное правило**: Никаких `any` типов!

```typescript
// ❌ НЕПРАВИЛЬНО
const data: any = await fetch('/api/data').then((r) => r.json());
const handleClick = (event: any) => {};

// ✅ ПРАВИЛЬНО
interface ApiResponse {
  success: boolean;
  data: Record<string, unknown>;
}
const data: ApiResponse = await fetch('/api/data').then((r) => r.json());
const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {};
```

**Каждый компонент должен иметь типизированные пропсы**:

```typescript
// ✅ ПРАВИЛЬНО
interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: number) => void;
  isFavorite?: boolean;
}

export function ProductCard({ product, onAddToCart, isFavorite = false }: ProductCardProps) {
  // ...
}
```

**Используй утилиты типов**:

```typescript
// ✅ ПРАВИЛЬНО - Partial, Pick, Omit, Record, etc.
type UpdateProductInput = Partial<Product>;
type ProductPreview = Pick<Product, 'id' | 'name' | 'price'>;
type StatusMap = Record<OrderStatus, string>;
```

### 2. Форматирование кода

**Используй Prettier** — все файлы должны быть отформатированы:

```bash
npx prettier --write .
```

**Стиль кода**:

- Отступы: **2 пробела**
- Максимальная длина строки: **100 символов**
- Точка с запятой: **всегда**
- Кавычки: **одинарные** (`'`) для строк
- Трейлинг запятая: **es5** (в объектах и массивах, но не в функциях)

Пример:

```typescript
// ✅ ПРАВИЛЬНО
const userConfig = {
  name: 'John Doe',
  email: 'john@example.com',
};

const items = [
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
];
```

### 3. Именование

| Элемент           | Стиль                  | Пример                       |
| ----------------- | ---------------------- | ---------------------------- |
| Переменные        | `camelCase`            | `const userName = 'John'`    |
| Функции           | `camelCase`            | `function fetchProducts()`   |
| React компоненты  | `PascalCase`           | `export function UserCard()` |
| Файлы компонентов | `PascalCase.tsx`       | `ProductCard.tsx`            |
| Остальные файлы   | `kebab-case.ts`        | `user-utils.ts`              |
| Константы         | `UPPER_SNAKE_CASE`     | `const MAX_ITEMS = 100`      |
| Интерфейсы        | `PascalCase` + `Props` | `interface UserCardProps {}` |

**Правила имен**:

- Длина: **2-30 символов**
- Избегай однобуквенных имён (кроме счётчиков: `i`, `j`, `x`, `y`)
- Используй полные слова (не сокращай: `product`, не `prod`)
- Исключения: общепринятые сокращения (`id`, `url`, `res`, `req`, `db`, `api`)

### 4. Структура файлов

Все файлы должны иметь единую структуру:

```typescript
// 1. Импорты (в порядке: node → external libs → aliases → relative)
import { useState } from 'react';
import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { query } from '@/lib/db';
import { getUserById } from '../utils/user';

// 2. Типы и интерфейсы
interface UserData {
  id: number;
  name: string;
}

// 3. Константы
const DEFAULT_TIMEOUT = 30000;
const API_ENDPOINT = '/api/users';

// 4. Основной код (компоненты, функции)
export function UserCard(props: UserCardProps) {
  // ...
}

// 5. Экспорты (если нужны)
export default UserCard;
```

### 5. Обработка ошибок

**Всегда используй try-catch в асинхронных функциях**:

```typescript
// ✅ ПРАВИЛЬНО
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw error; // Re-throw или обработай ошибку
  }
}
```

**Используй типизированную обработку ошибок**:

```typescript
// ✅ ПРАВИЛЬНО
catch (err: unknown) {
  const error = err instanceof Error ? err : new Error(String(err));
  console.error('Error message:', error.message);
}

// ❌ НЕПРАВИЛЬНО
catch (error) {
  console.log(error); // type is 'any'!
}
```

**Для API используй `handleApiError` из `lib/errorHandler.ts`**:

```typescript
// ✅ ПРАВИЛЬНО
import { handleApiError } from '@/lib/errorHandler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // твой код
  } catch (err) {
    handleApiError(err, res, 'Failed to fetch products');
  }
}
```

### 6. Валидация данных

**Используй Zod для всех API входных данных**:

```typescript
// ✅ ПРАВИЛЬНО
import { validateData, CreateProductSchema } from '@/lib/validation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const input = validateData(CreateProductSchema, req.body);
    // input теперь типобезопасен!
  } catch (err) {
    handleValidationError((err as Error).message, res);
  }
}
```

### 7. Комментарии

**JSDoc для всех сложных функций** (> 10 строк):

```typescript
// ✅ ПРАВИЛЬНО
/**
 * Получает список товаров с пагинацией и фильтрацией
 * @param page - Номер страницы (начиная с 1)
 * @param limit - Количество элементов на странице (max 100)
 * @param filters - Объект с фильтрами (опционально)
 * @returns Массив товаров
 * @throws Error если page или limit невалидны
 */
async function getProducts(
  page: number,
  limit: number,
  filters?: ProductFilters
): Promise<Product[]> {
  // ...
}
```

**Комментарии внутри кода только для нетривиальной логики**:

```typescript
// ❌ НЕПРАВИЛЬНО - очевидно же!
const name = user.name; // Получаем имя пользователя

// ✅ ПРАВИЛЬНО - объясняет ПОЧЕМУ
const price = Math.floor(rawPrice * 100); // Конвертим в копейки для БД
```

**Удаляй закомментированный код** (используй Git если нужна история):

```typescript
// ❌ НЕПРАВИЛЬНО
// const oldWay = () => { ... }
// console.log('debug info');

// ✅ ПРАВИЛЬНО - если нужен код, оставь только:
// TODO: Переделать oldWay на новый API
```

### 8. React компоненты

**Типизируй все пропсы**:

```typescript
// ✅ ПРАВИЛЬНО
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

export function Button({ variant = 'primary', loading, ...rest }: ButtonProps) {
  return <button className={`btn-${variant}`} disabled={loading} {...rest} />;
}
```

**Используй правильные типы событий**:

```typescript
// ✅ ПРАВИЛЬНО
const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  setValue(event.target.value);
};

const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
  event.preventDefault();
};

const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
};
```

**Избегай ненужных re-renders**:

```typescript
// ✅ ПРАВИЛЬНО - используй useCallback для обработчиков
const handleDelete = useCallback((id: number) => {
  deleteProduct(id);
}, []);

// ✅ ПРАВИЛЬНО - зависимости в useEffect
useEffect(() => {
  loadData();
}, [loadData]); // loadData должен быть в списке!
```

### 9. API маршруты

**Структура обработчика**:

```typescript
// ✅ ПРАВИЛЬНО
import type { NextApiRequest, NextApiResponse } from 'next';
import { handleApiError, apiSuccess } from '@/lib/errorHandler';

interface ResponseData {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  if (req.method === 'GET') {
    try {
      // Твой код
      apiSuccess(res, { id: 1, name: 'Product' });
    } catch (err) {
      handleApiError(err, res, 'Failed to fetch');
    }
  } else if (req.method === 'POST') {
    // Обработка POST
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
```

**Всегда валидируй входные данные**:

```typescript
// ✅ ПРАВИЛЬНО
const { product_id, quantity } = req.body;

if (!product_id || typeof product_id !== 'number') {
  return res.status(400).json({ error: 'Invalid product_id' });
}

if (!quantity || quantity < 1) {
  return res.status(400).json({ error: 'Invalid quantity' });
}
```

### 10. Логирование

**Нет console.log в production коде** (кроме console.error):

```typescript
// ❌ НЕПРАВИЛЬНО
if (process.env.NODE_ENV === 'development') {
  console.log('Fetching data...'); // Всё равно попадёт в build!
}

// ✅ ПРАВИЛЬНО
if (process.env.NODE_ENV === 'development') {
  console.error('Error occurred:', error); // Только ошибки
}
```

**Используй переменные окружения**:

```typescript
// ✅ ПРАВИЛЬНО - используй NEXT_PUBLIC_ только если нужно на фронте
if (process.env.NODE_ENV === 'development') {
  // Debug логирование
}

// В production - используй Sentry, LogRocket или другой сервис
```

---

## 🔍 Проверка качества

### ESLint

```bash
npm run lint
```

Исправляет автоматически (если можно):

```bash
npm run lint -- --fix
```

### Prettier

```bash
npx prettier --check .     # Только проверка
npx prettier --write .     # Исправляет форматирование
```

### TypeScript

```bash
npx tsc --noEmit           # Проверка типов
```

---

## 📚 Ресурсы

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Best Practices](https://react.dev/learn)
- [Next.js Documentation](https://nextjs.org/docs)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Config](https://prettier.io/docs/en/options.html)

---

## 🚀 Перед тем как закоммитить

1. ✅ Исправи все ESLint ошибки: `npm run lint -- --fix`
2. ✅ Отформатируй код: `npx prettier --write .`
3. ✅ Проверь типы: `npx tsc --noEmit`
4. ✅ Тестируй локально: `npm run dev`
5. ✅ Напиши понятное сообщение коммита

---

**Помни: Хороший код — это не только рабочий код, это код, который легко читать, понимать и поддерживать! 📖**
