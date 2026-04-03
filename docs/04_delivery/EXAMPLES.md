# 📚 Примеры использования системы доставки (P4)

**Версия:** 1.0  
**Формат:** Пошаговые примеры с кодом  
**Язык:** TypeScript/JavaScript + SQL + cURL

---

## 🎯 Содержание примеров

1. [Управление пунктами выдачи](#управление-пунктами-выдачи)
2. [Управление адресами](#управление-адресами)
3. [Корзина и выбор доставки](#корзина-и-выбор-доставки)
4. [Админ-панель](#админ-панель)
5. [React компоненты](#react-компоненты)
6. [API интеграция](#api-интеграция)
7. [SQL запросы для отладки](#sql-запросы-для-отладки)

---

## 🎯 Управление пунктами выдачи

### Пример 1: Добавление нового пункта (API)

**Сценарий:** Администратор хочет добавить новый пункт выдачи в Санкт-Петербурге.

**Запрос:**
```bash
curl -X POST http://localhost:3000/api/admin/pickup-points \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Id: 987654321" \
  -d '{
    "name": "Пункт выдачи - Санкт-Петербург",
    "address": "г. Санкт-Петербург, Невский проспект, д. 100"
  }'
```

**Ответ (201 Created):**
```json
{
  "pickup_point": {
    "id": "a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6",
    "name": "Пункт выдачи - Санкт-Петербург",
    "address": "г. Санкт-Петербург, Невский проспект, д. 100",
    "is_active": true,
    "created_at": "2024-01-15T14:30:00Z",
    "updated_at": "2024-01-15T14:30:00Z"
  }
}
```

**Проверка в БД:**
```sql
SELECT * FROM pickup_points 
WHERE name = 'Пункт выдачи - Санкт-Петербург';
```

### Пример 2: Обновление пункта выдачи (API)

**Сценарий:** Нужно изменить адрес существующего пункта.

**Запрос:**
```bash
curl -X PUT http://localhost:3000/api/admin/pickup-points \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Id: 987654321" \
  -d '{
    "id": "a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6",
    "address": "г. Санкт-Петербург, Невский проспект, д. 105",
    "is_active": true
  }'
```

**Ответ (200 OK):**
```json
{
  "success": true
}
```

**Проверка:**
```sql
SELECT * FROM pickup_points 
WHERE id = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6';
-- Проверяем что address обновлен и updated_at изменился
```

### Пример 3: Получение списка пунктов (для админа)

**Сценарий:** Администратор смотрит все пункты выдачи.

**Запрос:**
```bash
curl -H "X-Telegram-Id: 987654321" \
     "http://localhost:3000/api/admin/pickup-points?page=1&limit=10"
```

**Ответ (200 OK):**
```json
{
  "pickup_points": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Пункт выдачи - Центр",
      "address": "г. Москва, ул. Тверская, д. 1",
      "is_active": true,
      "created_at": "2024-01-10T10:00:00Z",
      "updated_at": "2024-01-10T10:00:00Z"
    },
    {
      "id": "a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6",
      "name": "Пункт выдачи - Санкт-Петербург",
      "address": "г. Санкт-Петербург, Невский проспект, д. 105",
      "is_active": true,
      "created_at": "2024-01-15T14:30:00Z",
      "updated_at": "2024-01-15T14:30:00Z"
    }
  ],
  "pagination": {
    "total": 4,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

### Пример 4: Отключение пункта выдачи

**Сценарий:** Администратор хочет отключить пункт (сделать его неактивным).

**Запрос:**
```bash
curl -X DELETE "http://localhost:3000/api/admin/pickup-points?id=a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6" \
  -H "X-Telegram-Id: 987654321"
```

**Ответ (200 OK):**
```json
{
  "success": true
}
```

**Проверка:**
```sql
SELECT * FROM pickup_points 
WHERE id = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6';
-- is_active должен быть false
```

### Пример 5: Получение активных пунктов (публичное)

**Сценарий:** Пользователь при оформлении заказа видит доступные пункты.

**Запрос (БЕЗ аутентификации):**
```bash
curl "http://localhost:3000/api/pickup-points"
```

**Ответ (200 OK):**
```json
{
  "pickup_points": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Пункт выдачи - Центр",
      "address": "г. Москва, ул. Тверская, д. 1",
      "is_active": true,
      "created_at": "2024-01-10T10:00:00Z",
      "updated_at": "2024-01-10T10:00:00Z"
    }
  ]
}
```

---

## 🎯 Управление адресами

### Пример 6: Добавление нового адреса

**Сценарий:** Клиент добавляет адрес для доставки.

**Запрос:**
```bash
curl -X POST http://localhost:3000/api/addresses \
  -H "Content-Type: application/json" \
  -d '{
    "telegram_id": 123456789,
    "address": "г. Москва, ул. Арбат, д. 15, кв. 42, квартира 5",
    "is_default": false
  }'
```

**Ответ (200 OK):**
```json
{
  "address": {
    "id": "addr-uuid-001",
    "user_telegram_id": 123456789,
    "address": "г. Москва, ул. Арбат, д. 15, кв. 42, квартира 5",
    "is_default": false,
    "created_at": "2024-01-15T15:00:00Z",
    "updated_at": "2024-01-15T15:00:00Z"
  }
}
```

### Пример 7: Получение всех адресов клиента

**Сценарий:** Клиент открывает свой профиль и видит сохраненные адреса.

**Запрос:**
```bash
curl "http://localhost:3000/api/addresses?telegram_id=123456789"
```

**Ответ (200 OK):**
```json
{
  "addresses": [
    {
      "id": "addr-uuid-001",
      "user_telegram_id": 123456789,
      "address": "г. Москва, ул. Арбат, д. 15, кв. 42, квартира 5",
      "is_default": true,
      "created_at": "2024-01-10T10:00:00Z",
      "updated_at": "2024-01-12T08:30:00Z"
    },
    {
      "id": "addr-uuid-002",
      "user_telegram_id": 123456789,
      "address": "г. Москва, ул. Ленина, д. 10, кв. 20",
      "is_default": false,
      "created_at": "2024-01-15T15:00:00Z",
      "updated_at": "2024-01-15T15:00:00Z"
    }
  ]
}
```

### Пример 8: Установление адреса по умолчанию

**Сценарий:** Клиент выбирает адрес, который будет предложен первым.

**Запрос:**
```bash
curl -X PUT http://localhost:3000/api/addresses \
  -H "Content-Type: application/json" \
  -d '{
    "id": "addr-uuid-002",
    "is_default": true
  }'
```

**Ответ (200 OK):**
```json
{
  "success": true
}
```

**Проверка в БД:**
```sql
SELECT * FROM addresses WHERE user_telegram_id = 123456789;
-- Должны быть оба адреса
-- addr-uuid-002 с is_default=true
-- addr-uuid-001 с is_default=false (было переключено)
```

### Пример 9: Редактирование адреса

**Сценарий:** Клиент хочет изменить сохраненный адрес (исправить опечатку).

**Запрос:**
```bash
curl -X PUT http://localhost:3000/api/addresses \
  -H "Content-Type: application/json" \
  -d '{
    "id": "addr-uuid-001",
    "address": "г. Москва, ул. Арбат, д. 15, кв. 52, кв. 6"
  }'
```

**Ответ (200 OK):**
```json
{
  "success": true
}
```

### Пример 10: Удаление адреса

**Сценарий:** Клиент удаляет устаревший адрес.

**Запрос:**
```bash
curl -X DELETE "http://localhost:3000/api/addresses?id=addr-uuid-002"
```

**Ответ (200 OK):**
```json
{
  "success": true
}
```

**Проверка:**
```sql
SELECT * FROM addresses WHERE id = 'addr-uuid-002';
-- Должен вернуть пусто (адрес удален)
```

---

## 🎯 Корзина и выбор доставки

### Пример 11: React Hook для управления доставкой в корзине

**Сценарий:** Компонент корзины использует хук для управления доставкой.

```typescript
// pages/cart.tsx
import { useState, useEffect } from 'react';
import DeliverySelector from '@/components/DeliverySelector';

export default function CartPage() {
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [selectedPickupId, setSelectedPickupId] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [pickupPoints, setPickupPoints] = useState<any[]>([]);

  // Загрузить доступные пункты выдачи
  useEffect(() => {
    const loadPickupPoints = async () => {
      try {
        const response = await fetch('/api/pickup-points');
        const data = await response.json();
        setPickupPoints(data.pickup_points);
      } catch (error) {
        console.error('Error loading pickup points:', error);
      }
    };

    loadPickupPoints();
  }, []);

  const handleCompleteOrder = async () => {
    // Подготовка данных заказа
    const orderData: any = {
      items: cartItems.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
      })),
      delivery_method: deliveryMethod,
      delivery_date: deliveryDate,
    };

    // Добавить параметры доставки в зависимости от метода
    if (deliveryMethod === 'pickup') {
      if (!selectedPickupId) {
        alert('Выберите пункт выдачи');
        return;
      }
      orderData.pickup_point_id = selectedPickupId;
    } else {
      if (!selectedAddress) {
        alert('Выберите адрес доставки');
        return;
      }
      orderData.address = selectedAddress;
    }

    // Создать заказ
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Id': userTelegramId.toString(),
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const { order } = await response.json();
        alert(`Заказ создан! ID: ${order.id}`);
        // Перенаправить на страницу успеха
        router.push('/order-success');
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Ошибка при создании заказа');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Корзина</h1>

      {/* Товары */}
      <div className="mb-6">
        {cartItems.map(item => (
          <div key={item.id} className="flex justify-between mb-2">
            <span>{item.name}</span>
            <span>{item.price}₽ x {item.quantity}</span>
          </div>
        ))}
      </div>

      {/* Селектор доставки */}
      <DeliverySelector
        method={deliveryMethod}
        onMethodChange={setDeliveryMethod}
        selectedPickup={selectedPickupId}
        onPickupSelect={setSelectedPickupId}
        selectedAddress={selectedAddress}
        onAddressSelect={setSelectedAddress}
        deliveryDate={deliveryDate}
        onDateChange={setDeliveryDate}
      />

      {/* Кнопка оформления */}
      <button
        onClick={handleCompleteOrder}
        className="mt-6 w-full bg-neon-green text-black font-bold py-3 rounded-lg"
      >
        Оформить заказ
      </button>
    </div>
  );
}
```

---

## 🎯 Админ-панель

### Пример 12: React компонент админ-панели

**Сценарий:** Администратор управляет пунктами выдачи.

```typescript
// components/AdminPickupPointsPanel.tsx
import { useState, useEffect } from 'react';

interface PickupPoint {
  id: string;
  name: string;
  address: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminPickupPointsPanel() {
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Загрузить пункты
  useEffect(() => {
    loadPoints();
  }, []);

  const loadPoints = async () => {
    try {
      const response = await fetch('/api/admin/pickup-points?page=1&limit=100', {
        headers: { 'X-Telegram-Id': adminTelegramId.toString() },
      });
      const data = await response.json();
      setPoints(data.pickup_points);
    } catch (error) {
      console.error('Error loading points:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.address) {
      alert('Заполните все поля');
      return;
    }

    try {
      const response = await fetch('/api/admin/pickup-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Id': adminTelegramId.toString(),
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Пункт добавлен!');
        setFormData({ name: '', address: '' });
        setShowForm(false);
        loadPoints();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding point:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены?')) return;

    try {
      const response = await fetch(`/api/admin/pickup-points?id=${id}`, {
        method: 'DELETE',
        headers: { 'X-Telegram-Id': adminTelegramId.toString() },
      });

      if (response.ok) {
        alert('Пункт отключен');
        loadPoints();
      }
    } catch (error) {
      console.error('Error deleting point:', error);
    }
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Управление пунктами выдачи</h1>

      {/* Таблица пунктов */}
      <table className="w-full border mb-6">
        <thead className="bg-gray-800">
          <tr>
            <th className="p-2">Название</th>
            <th className="p-2">Адрес</th>
            <th className="p-2">Статус</th>
            <th className="p-2">Действия</th>
          </tr>
        </thead>
        <tbody>
          {points.map(point => (
            <tr key={point.id} className="border-b hover:bg-gray-900">
              <td className="p-2">{point.name}</td>
              <td className="p-2">{point.address}</td>
              <td className="p-2">
                {point.is_active ? (
                  <span className="text-green-500">✓ Активен</span>
                ) : (
                  <span className="text-red-500">✗ Отключен</span>
                )}
              </td>
              <td className="p-2">
                <button
                  onClick={() => handleDelete(point.id)}
                  className="bg-red-600 px-3 py-1 rounded text-white"
                >
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Форма добавления */}
      {showForm ? (
        <div className="bg-gray-900 p-4 rounded-lg border border-neon-green">
          <h2 className="font-bold mb-4">Добавить новый пункт</h2>
          <input
            type="text"
            placeholder="Название"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full p-2 mb-2 bg-gray-800 rounded border border-gray-700 text-white"
          />
          <input
            type="text"
            placeholder="Адрес"
            value={formData.address}
            onChange={e => setFormData({ ...formData, address: e.target.value })}
            className="w-full p-2 mb-4 bg-gray-800 rounded border border-gray-700 text-white"
          />
          <button
            onClick={handleAdd}
            className="bg-neon-green text-black font-bold px-4 py-2 rounded mr-2"
          >
            Сохранить
          </button>
          <button
            onClick={() => setShowForm(false)}
            className="bg-gray-700 px-4 py-2 rounded text-white"
          >
            Отменить
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="bg-neon-green text-black font-bold px-4 py-2 rounded"
        >
          + Добавить пункт
        </button>
      )}
    </div>
  );
}
```

---

## 🎯 React компоненты

### Пример 13: DeliverySelector компонент

```typescript
// components/DeliverySelector.tsx
import { useState, useEffect } from 'react';

interface PickupPoint {
  id: string;
  name: string;
  address: string;
}

interface Props {
  method: 'pickup' | 'delivery';
  onMethodChange: (method: 'pickup' | 'delivery') => void;
  selectedPickup: string | null;
  onPickupSelect: (id: string) => void;
  selectedAddress: string | null;
  onAddressSelect: (address: string) => void;
  deliveryDate: string;
  onDateChange: (date: string) => void;
}

export default function DeliverySelector({
  method,
  onMethodChange,
  selectedPickup,
  onPickupSelect,
  selectedAddress,
  onAddressSelect,
  deliveryDate,
  onDateChange,
}: Props) {
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);

  useEffect(() => {
    loadPoints();
    loadAddresses();
  }, []);

  const loadPoints = async () => {
    const response = await fetch('/api/pickup-points');
    const data = await response.json();
    setPoints(data.pickup_points);
  };

  const loadAddresses = async () => {
    const response = await fetch(`/api/addresses?telegram_id=${userTelegramId}`);
    const data = await response.json();
    setAddresses(data.addresses);
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="space-y-4 p-4 bg-gray-900 rounded-lg border border-neon-green">
      <h2 className="text-white font-bold text-lg">Способ доставки</h2>

      {/* Способ доставки */}
      <div className="space-y-2">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="radio"
            value="pickup"
            checked={method === 'pickup'}
            onChange={() => onMethodChange('pickup')}
            className="w-4 h-4"
          />
          <span className="text-white">🚐 Самовывоз</span>
        </label>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="radio"
            value="delivery"
            checked={method === 'delivery'}
            onChange={() => onMethodChange('delivery')}
            className="w-4 h-4"
          />
          <span className="text-white">📦 Доставка на адрес</span>
        </label>
      </div>

      {/* Выбор пункта */}
      {method === 'pickup' && (
        <div className="space-y-2">
          <h3 className="text-neon-green font-bold">Выберите пункт выдачи:</h3>
          {points.map(point => (
            <label key={point.id} className="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                value={point.id}
                checked={selectedPickup === point.id}
                onChange={() => onPickupSelect(point.id)}
                className="w-4 h-4 mt-1"
              />
              <div className="text-white">
                <div className="font-semibold">{point.name}</div>
                <div className="text-sm text-gray-400">{point.address}</div>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Выбор адреса */}
      {method === 'delivery' && (
        <div className="space-y-2">
          <h3 className="text-neon-green font-bold">Выберите адрес доставки:</h3>
          {addresses.map(addr => (
            <label key={addr.id} className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                value={addr.address}
                checked={selectedAddress === addr.address}
                onChange={() => onAddressSelect(addr.address)}
                className="w-4 h-4"
              />
              <span className="text-white">{addr.address}</span>
              {addr.is_default && <span className="text-neon-pink text-xs">(по умолчанию)</span>}
            </label>
          ))}
        </div>
      )}

      {/* Выбор даты */}
      <div>
        <label className="text-white block mb-2">Дата доставки:</label>
        <input
          type="date"
          value={deliveryDate}
          onChange={e => onDateChange(e.target.value)}
          min={minDate}
          className="w-full p-2 bg-gray-800 rounded border border-gray-700 text-white"
        />
      </div>
    </div>
  );
}
```

---

## 🎯 API интеграция

### Пример 14: TypeScript услуга для работы с доставкой

```typescript
// lib/delivery.ts

/**
 * Получить список активных пунктов выдачи
 */
export async function getPickupPoints() {
  try {
    const response = await fetch('/api/pickup-points');
    if (!response.ok) throw new Error('Failed to load pickup points');
    const data = await response.json();
    return data.pickup_points;
  } catch (error) {
    console.error('Error loading pickup points:', error);
    throw error;
  }
}

/**
 * Получить адреса пользователя
 */
export async function getUserAddresses(telegramId: number) {
  try {
    const response = await fetch(`/api/addresses?telegram_id=${telegramId}`);
    if (!response.ok) throw new Error('Failed to load addresses');
    const data = await response.json();
    return data.addresses;
  } catch (error) {
    console.error('Error loading addresses:', error);
    throw error;
  }
}

/**
 * Добавить новый адрес
 */
export async function addAddress(
  telegramId: number,
  address: string,
  isDefault: boolean = false
) {
  try {
    const response = await fetch('/api/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegram_id: telegramId,
        address,
        is_default: isDefault,
      }),
    });

    if (!response.ok) throw new Error('Failed to add address');
    const data = await response.json();
    return data.address;
  } catch (error) {
    console.error('Error adding address:', error);
    throw error;
  }
}

/**
 * Удалить адрес
 */
export async function deleteAddress(addressId: string) {
  try {
    const response = await fetch(`/api/addresses?id=${addressId}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('Failed to delete address');
    return true;
  } catch (error) {
    console.error('Error deleting address:', error);
    throw error;
  }
}

/**
 * Установить адрес по умолчанию
 */
export async function setDefaultAddress(addressId: string) {
  try {
    const response = await fetch('/api/addresses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: addressId,
        is_default: true,
      }),
    });

    if (!response.ok) throw new Error('Failed to set default address');
    return true;
  } catch (error) {
    console.error('Error setting default address:', error);
    throw error;
  }
}

/**
 * Создать заказ с доставкой
 */
export async function createOrderWithDelivery(
  telegramId: number,
  items: Array<{ product_id: string; quantity: number }>,
  deliveryMethod: 'pickup' | 'delivery',
  pickupPointId?: string,
  address?: string,
  deliveryDate?: string
) {
  try {
    if (deliveryMethod === 'pickup' && !pickupPointId) {
      throw new Error('Pickup point ID required for pickup delivery');
    }

    if (deliveryMethod === 'delivery' && !address) {
      throw new Error('Address required for home delivery');
    }

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Id': telegramId.toString(),
      },
      body: JSON.stringify({
        telegram_id: telegramId,
        items,
        delivery_method: deliveryMethod,
        pickup_point_id: pickupPointId,
        address,
        delivery_date: deliveryDate,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create order');
    }

    const data = await response.json();
    return data.order;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}
```

---

## 🎯 SQL запросы для отладки

### Пример 15: Полезные SQL запросы

```sql
-- 1. Получить все пункты выдачи
SELECT * FROM pickup_points ORDER BY created_at DESC;

-- 2. Получить активные пункты
SELECT * FROM pickup_points WHERE is_active = true ORDER BY name;

-- 3. Получить адреса конкретного пользователя
SELECT * FROM addresses WHERE user_telegram_id = 123456789 ORDER BY is_default DESC;

-- 4. Получить адрес по умолчанию для пользователя
SELECT * FROM addresses 
WHERE user_telegram_id = 123456789 AND is_default = true;

-- 5. Получить заказы с указанным способом доставки
SELECT * FROM orders 
WHERE delivery_method = 'pickup' 
ORDER BY created_at DESC LIMIT 10;

-- 6. Получить заказы с самовывозом конкретного пункта
SELECT o.*, pp.name as pickup_point_name
FROM orders o
JOIN pickup_points pp ON o.pickup_point_id = pp.id
WHERE o.delivery_method = 'pickup'
ORDER BY o.created_at DESC;

-- 7. Получить заказы одного пользователя
SELECT * FROM orders 
WHERE user_telegram_id = 123456789 
ORDER BY created_at DESC;

-- 8. Статистика: сколько заказов с каким способом доставки
SELECT delivery_method, COUNT(*) as count
FROM orders
GROUP BY delivery_method;

-- 9. Найти дублированные адреса (мониторинг)
SELECT user_telegram_id, address, COUNT(*)
FROM addresses
GROUP BY user_telegram_id, address
HAVING COUNT(*) > 1;

-- 10. Проверить целостность ключей (нет мусора)
SELECT * FROM orders 
WHERE delivery_method = 'pickup' AND pickup_point_id NOT IN (SELECT id FROM pickup_points);

-- 11. Обновить статус заказа в зависимости от типа доставки
UPDATE orders 
SET status = CASE 
  WHEN delivery_method = 'pickup' THEN 'ready_for_pickup'
  WHEN delivery_method = 'delivery' THEN 'delivery_in_progress'
  ELSE status
END
WHERE status = 'processing';

-- 12. Получить самые популярные пункты выдачи
SELECT pp.name, COUNT(o.id) as orders_count
FROM pickup_points pp
LEFT JOIN orders o ON pp.id = o.pickup_point_id
WHERE o.delivery_method = 'pickup'
GROUP BY pp.id, pp.name
ORDER BY orders_count DESC;

-- 13. Получить пунктов, где нет заказов за 30 дней
SELECT * FROM pickup_points pp
WHERE pp.id NOT IN (
  SELECT DISTINCT pickup_point_id 
  FROM orders 
  WHERE delivery_method = 'pickup'
  AND created_at >= NOW() - INTERVAL '30 days'
);

-- 14. Получить адреса, которые используются в активных заказах
SELECT DISTINCT address FROM orders 
WHERE delivery_method = 'delivery'
AND status NOT IN ('cancelled', 'completed')
ORDER BY address;

-- 15. Очистка: удалить старые заказы с delivery (более 90 дней)
DELETE FROM orders 
WHERE delivery_method = 'delivery' 
AND created_at < NOW() - INTERVAL '90 days'
AND status IN ('cancelled', 'completed');
```

---

## 📞 Контакты и поддержка

**Нужен еще пример?** → Check [README.md](./README.md)  
**API Reference?** → See [API_REFERENCE.md](./API_REFERENCE.md)  
**Чек-лист?** → See [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)

**Версия:** 1.0  
**Статус:** ✅ Production Ready  
**Примеров:** 15+

