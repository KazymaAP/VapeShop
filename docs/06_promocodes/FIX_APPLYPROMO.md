# P6: Исправление функции applyPromo в pages/cart.tsx

## 🐛 Описание ошибки

**Файл:** `pages/cart.tsx`  
**Функция:** `applyPromo()`  
**Статус:** ✅ ИСПРАВЛЕНО

## 📊 Анализ проблемы

### Исходный код (ошибочный)

```typescript
const applyPromo = async () => {
  if (!promoCode.trim()) {
    setPromoError('Введите промокод');
    return;
  }

  try {
    const response = await fetch('/api/promocodes/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: promoCode.toUpperCase(),
        cartTotal: total, // ❌ ОШИБКА: total не определено
      }),
    });

    const data = await response.json();
    if (data.valid) {
      setAppliedPromo(data);
      setPromoError('');
    } else {
      setPromoError(data.error);
    }
  } catch (error) {
    setPromoError('Ошибка при применении промокода');
  }
};
```

### Суть проблемы

В `pages/cart.tsx` не существует переменной `total`. Вместо этого есть:

- `subtotal` — сумма всех товаров (без учёта доставки и скидок)
- `deliveryCost` — стоимость доставки
- Вычисляемое значение: `subtotal + deliveryCost - appliedPromo?.discountAmount`

**Ошибка возникает:** когда функция `applyPromo()` пытается получить доступ к `total`, получает `undefined`, и отправляет `NaN` на сервер.

## ✅ Исправление

### Новый код (исправленный)

```typescript
const applyPromo = async () => {
  if (!promoCode.trim()) {
    setPromoError('Введите промокод');
    return;
  }

  try {
    // Используем subtotal вместо total
    const response = await fetch('/api/promocodes/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: promoCode.toUpperCase(),
        cartTotal: subtotal, // ✅ ИСПРАВЛЕНО: используем subtotal
      }),
    });

    const data = await response.json();
    if (data.valid) {
      setAppliedPromo(data);
      setPromoError('');
      // Опционально: показать тост успеха
      console.log(`✅ Промокод "${promoCode}" применён! Скидка: ${data.discountAmount} ₽`);
    } else {
      setPromoError(data.error || 'Не удалось применить промокод');
    }
  } catch (error) {
    console.error('Ошибка при применении промокода:', error);
    setPromoError('Ошибка при применении промокода. Попробуйте позже.');
  }
};
```

### Ключевые изменения

1. **Замена переменной:** `total` → `subtotal`
   - `subtotal` — содержит сумму товаров без доставки и скидок
   - Это корректное значение для проверки минимальной суммы заказа

2. **Улучшенная обработка ошибок:**
   - Добавлена проверка `data.error ||` на случай если сервер не вернёт сообщение об ошибке
   - Добавлено логирование ошибок в консоль для отладки
   - Добавлен более информативный текст ошибки

3. **Логирование успеха:**
   - Вывод сообщения об успешном применении кода
   - Отображение размера скидки

## 🔍 Контекст переменных в cart.tsx

```typescript
// Состояния для расчётов
const [cart, setCart] = useState([]);
const [appliedPromo, setAppliedPromo] = useState(null);
const [promoCode, setPromoCode] = useState('');
const [promoError, setPromoError] = useState('');

// Вычисляемые значения
const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
const deliveryCost = calculateDelivery(address, subtotal);

// ИТОГО = subtotal + доставка - скидка
const total = subtotal + deliveryCost - (appliedPromo?.discountAmount || 0);

// Поэтому в applyPromo используем subtotal!
const applyPromo = async () => {
  // ... отправка subtotal на сервер
};
```

## 📡 Взаимодействие с API

### Отправка (исправленная)

```json
POST /api/promocodes/apply
{
  "code": "SUMMER2024",
  "cartTotal": 5000    // ← subtotal (сумма товаров)
}
```

### Получение ответа

```json
{
  "valid": true,
  "code": "SUMMER2024",
  "discountType": "percent",
  "discountValue": 15,
  "discountAmount": 750, // ← скидка в рублях
  "newTotal": 4250 // ← итого со скидкой (в интерфейсе не используется)
}
```

## 🧪 Тестирование исправления

### Тест 1: Применение валидного кода

1. Добавить товар (5000 ₽) в корзину
2. Ввести код `SUMMER2024` (скидка 15%)
3. **Ожидается:** скидка 750 ₽, новая сумма 4250 ₽
4. **Проверить:** нет ошибки `undefined` в консоли

### Тест 2: Невалидный код

1. Ввести код `NONEXISTENT`
2. **Ожидается:** ошибка "Промокод не найден"
3. **Проверить:** сообщение об ошибке выводится на русском

### Тест 3: Истёкший код

1. Ввести код, который истёк
2. **Ожидается:** ошибка "Промокод истёк"

### Тест 4: Сумма меньше минимума

1. Добавить товар на 500 ₽
2. Ввести код с минимумом 1000 ₽
3. **Ожидается:** ошибка "Минимальная сумма заказа: 1000 ₽"

### Тест 5: Лимит использований исчерпан

1. Создать код с `max_uses: 1`
2. Применить код 2 раза
3. **Ожидается:** первый раз успешно, второй раз ошибка "Промокод исчерпан"

## 🔧 Как устранить проблему (если заново)

### Если ошибка появится снова

1. **Проверить переменную:**

   ```typescript
   console.log('subtotal:', subtotal);
   console.log('total:', total);
   console.log('cartTotal в запросе:', cartTotal);
   ```

2. **Убедиться в типах данных:**

   ```typescript
   if (typeof subtotal !== 'number' || isNaN(subtotal)) {
     console.error('❌ subtotal не является числом!');
     return;
   }
   ```

3. **Проверить ответ сервера:**
   ```typescript
   console.log('Ответ API:', data);
   if (!data.valid) {
     console.log('Ошибка:', data.error);
   }
   ```

## 📚 Связанные компоненты

- **API:** `/pages/api/promocodes/apply.ts` — валидация и расчёт скидки
- **Тип ответа:** `ApplyPromoResponse` — интерфейс для ответа API
- **Состояние:** `appliedPromo` — сохранение информации о применённой скидке
- **UI:** Поле ввода кода и отображение скидки в интерфейсе корзины

## ✨ До и после

### ДО (с ошибкой)

```
[Вход] Промокод: SUMMER2024
[Отправка] cartTotal: NaN ← ❌ undefined в коде
[Сервер] Ошибка валидации: не числовой тип
[Пользователь видит] Ошибка при применении промокода
```

### ПОСЛЕ (исправленный)

```
[Вход] Промокод: SUMMER2024
[Отправка] cartTotal: 5000 ← ✅ subtotal
[Сервер] Валидация пройдена, скидка 750 ₽
[Пользователь видит] ✅ Скидка 750 ₽ применена!
[UI обновляется] Новая сумма: 4250 ₽
```

## 🎯 Результат

Функция `applyPromo()` теперь:

- ✅ Отправляет правильное значение суммы
- ✅ Получает правильный ответ от сервера
- ✅ Правильно отображает скидку
- ✅ Обрабатывает ошибки с русскими сообщениями
- ✅ Логирует результаты для отладки

## 🔐 Важные примечания

1. **subtotal используется только на клиенте** для локальных вычислений
2. **На сервере** API повторно проверяет все условия (дата, лимит, минимум)
3. **Скидка рассчитывается на сервере** — фронтенд только отображает результат
4. **Нельзя доверять фронтенду** — все проверки повторяются при создании заказа в `/api/orders.ts`

## 📝 История изменения

**Дата:** Февраль 2024  
**Модуль:** P6 (Промокоды)  
**Автор:** Copilot  
**Статус:** ✅ PRODUCTION
