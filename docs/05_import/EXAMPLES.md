# 📚 Phase P5: Примеры использования

**Версия:** 1.0  
**Дата:** 2025-04-02  
**Автор:** VapeShop Team

## 📋 Оглавление

1. [CSV примеры](#-csv-примеры)
2. [Загрузка CSV](#-загрузка-csv)
3. [Просмотр импортированных](#-просмотр-импортированных)
4. [Активация товаров](#-активация-товаров)
5. [Удаление товара](#-удаление-товара)
6. [React интеграция](#-react-интеграция)
7. [SQL запросы](#-sql-запросы)
8. [Troubleshooting](#-troubleshooting)

---

## 📄 CSV примеры

### Правильный CSV формат

**Файл: `products.csv`**

```csv
name,specification,stock,price_tier_1,price_tier_2,price_tier_3,distributor_price
Vape Pod Pro,Никотин 20мг 50 мл Вишня,100,250.00,230.00,200.00,150.00
Atomizer RDA Genesis,Диаметр 24мм Нержавейка 316L,75,180.00,165.00,150.00,100.00
Coil Kanthal A1,0.4 Ohm 10 штук в упаковке,200,120.00,110.00,100.00,70.00
Хлопок органический,100% хлопок премиум качества,150,85.00,75.00,65.00,45.00
Мод BOX TC 200W,2 аккумулятора Черный Ti-Ni сплав,50,2500.00,2300.00,2100.00,1800.00
Жидкость для вейпа Mix,Фруктовый микс 30 мл 12мг,500,199.00,180.00,160.00,120.00
Батарея 18650,Li-ion 3500mAh защита от перезаряда,300,350.00,320.00,290.00,200.00
Упаковка RDA,Для использования с атомайзерами,80,45.00,40.00,35.00,25.00
Фитинги нержавейка,Набор 10 шт размер 510,120,65.00,60.00,55.00,40.00
Стеклышко Pyrex,Для атомайзера RDA диаметр 2.5мм,200,35.00,30.00,25.00,15.00
```

**Параметры:**
- ✓ Кодировка: UTF-8
- ✓ Разделитель: запятая (,)
- ✓ Цены: точка как разделитель (250.00)
- ✓ Количество: целое число (100, 75, 200)
- ✓ Первая строка: заголовки

### Неправильный формат ❌

```csv
# ❌ Неверное: Windows-1251 кодировка вместо UTF-8
# ❌ Неверное: точка с запятой (;) как разделитель
name;specification;stock;price_tier_1
Vape Pod Pro;Никотин 20мг;100;250,00

# ❌ Неверное: смешанные разделители
name,specification,stock,price_tier_1
Vape Pod Pro,"Никотин 20мг; 50 мл",100,250.00

# ❌ Неверное: отсутствует обязательная колонка
name,specification,stock,price_tier_1
Vape Pod Pro,Никотин 20мг,100,250.00

# ❌ Неверное: цены как целые числа
name,specification,stock,price_tier_1,price_tier_2
Vape Pod Pro,Никотин 20мг,100,250,230

# ❌ Неверное: отрицательное количество
name,specification,stock,price_tier_1
Vape Pod Pro,Никотин 20мг,-100,250.00
```

### Генерация тестовых данных

**Python скрипт: `generate_csv.py`**

```python
#!/usr/bin/env python3
"""Генерация тестового CSV файла с товарами"""

import csv
import random

products = [
    ("Vape Pod Pro", "Никотин 20мг 50 мл"),
    ("Atomizer RDA", "Диаметр 24мм нержавейка"),
    ("Coil Kanthal", "0.4 Ohm 10 штук"),
    ("Хлопок", "100% хлопок премиум"),
    ("Мод BOX", "200W 2 батареи"),
]

with open('products_test.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow([
        'name', 'specification', 'stock',
        'price_tier_1', 'price_tier_2', 'price_tier_3', 'distributor_price'
    ])
    
    for name, spec in products:
        stock = random.randint(50, 500)
        price1 = round(random.uniform(100, 3000), 2)
        price2 = round(price1 * 0.92, 2)
        price3 = round(price1 * 0.84, 2)
        price_dist = round(price1 * 0.60, 2)
        
        writer.writerow([
            name, spec, stock,
            price1, price2, price3, price_dist
        ])

print("✓ Создан файл: products_test.csv")
```

**Запуск:**
```bash
python3 generate_csv.py
```

---

## 📤 Загрузка CSV

### Curl команда

```bash
# Базовая загрузка
curl -X POST http://localhost:3000/api/admin/import \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@products.csv"

# С прокси (если нужно)
curl -X POST http://localhost:3000/api/admin/import \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@products.csv" \
  --proxy http://proxy.example.com:8080

# Сохранить ответ в файл
curl -X POST http://localhost:3000/api/admin/import \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@products.csv" \
  > import_response.json

# С таймаутом (большие файлы)
curl -X POST http://localhost:3000/api/admin/import \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@products.csv" \
  --max-time 300  # 5 минут
```

### Пример ответа (200 OK)

```json
{
  "success": true,
  "message": "Загружено 10 товаров",
  "stats": {
    "total": 10,
    "new": 8,
    "duplicates": 2
  },
  "duplicates": [
    {
      "name": "Vape Pod Pro",
      "count": 2,
      "existing_id": 5
    },
    {
      "name": "Atomizer RDA",
      "count": 1,
      "existing_id": 12
    }
  ]
}
```

### Пример ошибки (400 Bad Request)

```json
{
  "success": false,
  "error": "INVALID_CSV_FORMAT",
  "message": "Отсутствует обязательная колонка: price_tier_1"
}
```

### JavaScript/Fetch

```javascript
// Базовая загрузка
async function uploadCSV(file) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/admin/import', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Ошибка при загрузке');
    }

    console.log('✓ Загружено:', data.stats.total);
    return data;
  } catch (error) {
    console.error('✗ Ошибка:', error.message);
    throw error;
  }
}

// Использование
const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  
  if (!file.name.endsWith('.csv')) {
    alert('Пожалуйста, выберите CSV файл');
    return;
  }

  try {
    const result = await uploadCSV(file);
    console.log('Результат:', result);
  } catch (error) {
    alert(`Ошибка: ${error.message}`);
  }
});
```

### Axios пример

```javascript
import axios from 'axios';

async function uploadCSVAxios(file) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post('/api/admin/import', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
}
```

---

## 👁️ Просмотр импортированных

### Получить все неактивированные товары

**Curl:**

```bash
# Все неактивированные
curl -X GET "http://localhost:3000/api/admin/price-import?status=inactive" \
  -H "Authorization: Bearer YOUR_TOKEN"

# С поиском
curl -X GET "http://localhost:3000/api/admin/price-import?status=inactive&search=Vape" \
  -H "Authorization: Bearer YOUR_TOKEN"

# С пагинацией
curl -X GET "http://localhost:3000/api/admin/price-import?status=inactive&page=2&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Все параметры
curl -X GET "http://localhost:3000/api/admin/price-import?status=inactive&search=Vape&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Пример ответа

```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "name": "Vape Pod Pro",
      "specification": "Никотин 20мг 50 мл",
      "stock": 100,
      "price_tier_1": 250.00,
      "price_tier_2": 230.00,
      "price_tier_3": 200.00,
      "distributor_price": 150.00,
      "is_activated": false,
      "product_id": null,
      "created_at": "2025-04-02T10:00:00Z",
      "activated_at": null
    },
    {
      "id": 43,
      "name": "Atomizer RDA Genesis",
      "specification": "Диаметр 24мм нержавейка",
      "stock": 75,
      "price_tier_1": 180.00,
      "price_tier_2": 165.00,
      "price_tier_3": 150.00,
      "distributor_price": 100.00,
      "is_activated": false,
      "product_id": null,
      "created_at": "2025-04-02T10:00:00Z",
      "activated_at": null
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "pages": 8,
    "limit": 20
  }
}
```

### JavaScript/Fetch

```javascript
async function fetchPriceImport(status = 'inactive', page = 1) {
  try {
    const params = new URLSearchParams({
      status,
      page,
      limit: 20
    });

    const response = await fetch(
      `/api/admin/price-import?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message);
    }

    return data;
  } catch (error) {
    console.error('Ошибка:', error);
    throw error;
  }
}

// Использование
const result = await fetchPriceImport('inactive', 1);
console.log(`Всего товаров: ${result.pagination.total}`);
console.log(`Текущая страница: ${result.pagination.page}`);
result.data.forEach(product => {
  console.log(`- ${product.name} (${product.stock} шт) - ${product.price_tier_1}₽`);
});
```

---

## ⚡ Активация товаров

### Curl команда

**Активировать товар:**

```bash
curl -X POST http://localhost:3000/api/admin/activate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id_imported": 42,
    "price_tier": "price_tier_1",
    "category_id": 5,
    "brand_name": "GeekVape",
    "image_url": "https://cdn.vapeshop.ru/products/42.jpg",
    "is_promotion": true,
    "is_bestseller": false,
    "is_new": true
  }'
```

**Минимальные параметры:**

```bash
curl -X POST http://localhost:3000/api/admin/activate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id_imported": 42,
    "price_tier": "price_tier_1",
    "category_id": 5
  }'
```

### Пример ответа (201 Created)

```json
{
  "success": true,
  "message": "Товар активирован",
  "product_id": 128,
  "data": {
    "id": 128,
    "name": "Vape Pod Pro",
    "slug": "vape-pod-pro",
    "description": "Никотин 20мг 50 мл",
    "category_id": 5,
    "brand": "GeekVape",
    "price": 250.00,
    "stock": 100,
    "image_url": "https://cdn.vapeshop.ru/products/42.jpg",
    "is_promotion": true,
    "is_bestseller": false,
    "is_new": true,
    "is_active": true,
    "created_at": "2025-04-02T10:05:00Z",
    "import_source": "csv_import",
    "import_batch_id": 42
  }
}
```

### Пример ошибки

```json
{
  "success": false,
  "error": "PRODUCT_NOT_FOUND",
  "message": "Товар не найден в очереди импорта"
}
```

### JavaScript/Fetch

```javascript
async function activateProduct(importedId, pricetier, categoryId, options = {}) {
  const payload = {
    id_imported: importedId,
    price_tier: pricetier,
    category_id: categoryId,
    brand_name: options.brand,
    image_url: options.imageUrl,
    is_promotion: options.isPromotion || false,
    is_bestseller: options.isBestseller || false,
    is_new: options.isNew || false
  };

  try {
    const response = await fetch('/api/admin/activate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Ошибка активации');
    }

    return data;
  } catch (error) {
    console.error('✗ Ошибка активации:', error.message);
    throw error;
  }
}

// Использование
try {
  const result = await activateProduct(42, 'price_tier_1', 5, {
    brand: 'GeekVape',
    isPromotion: true,
    isNew: true
  });
  
  console.log('✓ Товар активирован:', result.data.name);
} catch (error) {
  alert(`Ошибка: ${error.message}`);
}
```

### Пакетная активация (несколько товаров)

**JavaScript:**

```javascript
async function activateMultipleProducts(products, categoryId) {
  const results = {
    success: [],
    failed: []
  };

  for (const product of products) {
    try {
      const result = await activateProduct(
        product.id,
        product.pricetier,
        categoryId,
        {
          brand: product.brand,
          isPromotion: product.isPromotion
        }
      );
      
      results.success.push(result.data);
      console.log(`✓ ${product.name} активирован`);
    } catch (error) {
      results.failed.push({
        productId: product.id,
        error: error.message
      });
      console.error(`✗ ${product.name}: ${error.message}`);
    }
  }

  return results;
}

// Использование
const products = [
  { id: 42, name: 'Vape Pod Pro', pricetier: 'price_tier_1', brand: 'GeekVape' },
  { id: 43, name: 'Atomizer RDA', pricetier: 'price_tier_2', brand: 'Voopoo' },
  { id: 44, name: 'Coil Kanthal', pricetier: 'price_tier_1' }
];

const results = await activateMultipleProducts(products, 5);
console.log(`✓ Успешно: ${results.success.length}`);
console.log(`✗ Ошибок: ${results.failed.length}`);
```

---

## 🗑️ Удаление товара

### Curl команда

```bash
# Удалить товар из очереди импорта
curl -X DELETE http://localhost:3000/api/admin/price-import/42 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Несколько товаров (в цикле)
for id in 42 43 44; do
  curl -X DELETE http://localhost:3000/api/admin/price-import/$id \
    -H "Authorization: Bearer YOUR_TOKEN"
done
```

### Пример ответа (200 OK)

```json
{
  "success": true,
  "message": "Товар удалён из очереди"
}
```

### JavaScript/Fetch

```javascript
async function deleteImportedProduct(id) {
  try {
    const response = await fetch(`/api/admin/price-import/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Ошибка удаления');
    }

    return data;
  } catch (error) {
    console.error('✗ Ошибка:', error.message);
    throw error;
  }
}

// Использование
if (confirm('Вы уверены, что хотите удалить товар?')) {
  try {
    await deleteImportedProduct(42);
    console.log('✓ Товар удалён');
    // Обновить таблицу
    loadPriceImport();
  } catch (error) {
    alert(`Ошибка: ${error.message}`);
  }
}
```

---

## ⚛️ React интеграция

### Компонент загрузки CSV

```typescript
// components/CSVUploader.tsx
import React, { useState } from 'react';

interface CSVUploadResponse {
  success: boolean;
  message: string;
  stats: {
    total: number;
    new: number;
    duplicates: number;
  };
}

export const CSVUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CSVUploadResponse | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    
    if (selectedFile && !selectedFile.name.endsWith('.csv')) {
      setError('Пожалуйста, выберите CSV файл');
      setFile(null);
      return;
    }

    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
      setError('Файл слишком большой (макс. 10 МБ)');
      setFile(null);
      return;
    }

    setError(null);
    setFile(selectedFile || null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Выберите файл');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Ошибка при загрузке');
      }

      setSuccess(data);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Загрузить товары</h2>

      <div className="mb-4">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={loading}
          className="block"
        />
        {file && <p className="text-sm text-gray-600 mt-2">✓ {file.name}</p>}
      </div>

      {error && (
        <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 mb-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <p className="font-bold">{success.message}</p>
          <p className="text-sm mt-2">
            Новых: {success.stats.new} | Дубликатов: {success.stats.duplicates}
          </p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? 'Загрузка...' : 'Загрузить'}
      </button>
    </div>
  );
};
```

### Компонент активации (Modal)

```typescript
// components/ProductActivationModal.tsx
import React, { useState, useEffect } from 'react';

interface ActivationFormData {
  price_tier: 'price_tier_1' | 'price_tier_2' | 'price_tier_3' | 'distributor_price';
  category_id: number | null;
  brand_name: string;
  is_promotion: boolean;
  is_bestseller: boolean;
  is_new: boolean;
}

interface ProductActivationModalProps {
  product: {
    id: number;
    name: string;
    stock: number;
    price_tier_1: number;
    price_tier_2: number;
    price_tier_3: number;
    distributor_price: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductActivationModal: React.FC<ProductActivationModalProps> = ({
  product,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<ActivationFormData>({
    price_tier: 'price_tier_1',
    category_id: null,
    brand_name: '',
    is_promotion: false,
    is_bestseller: false,
    is_new: false
  });

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Загрузить категории
    fetch('/api/categories', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => setCategories(data.data))
      .catch(err => console.error('Ошибка загрузки категорий:', err));
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.category_id) {
      newErrors.category_id = 'Выберите категорию';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/admin/activate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id_imported: product.id,
          ...formData
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Ошибка активации');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'Неизвестная ошибка'
      });
    } finally {
      setLoading(false);
    }
  };

  const getSelectedPrice = () => {
    const prices = {
      price_tier_1: product.price_tier_1,
      price_tier_2: product.price_tier_2,
      price_tier_3: product.price_tier_3,
      distributor_price: product.distributor_price
    };
    return prices[formData.price_tier];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-bold mb-4">Активировать товар</h2>
        
        <div className="mb-4 p-3 bg-gray-100 rounded">
          <p className="font-semibold">{product.name}</p>
          <p className="text-sm text-gray-600">Количество: {product.stock} шт</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Выбор цены */}
          <div>
            <label className="block font-semibold mb-2">Цена (обязательно)</label>
            <div className="space-y-2">
              {[
                { key: 'price_tier_1' as const, label: 'Tier 1 (розница)', price: product.price_tier_1 },
                { key: 'price_tier_2' as const, label: 'Tier 2 (опт)', price: product.price_tier_2 },
                { key: 'price_tier_3' as const, label: 'Tier 3 (крупный опт)', price: product.price_tier_3 },
                { key: 'distributor_price' as const, label: 'Дистрибьютор', price: product.distributor_price }
              ].map(({ key, label, price }) => (
                <label key={key} className="flex items-center">
                  <input
                    type="radio"
                    name="price_tier"
                    value={key}
                    checked={formData.price_tier === key}
                    onChange={(e) => setFormData({ ...formData, price_tier: e.target.value as any })}
                    className="mr-2"
                  />
                  <span>{label} - {price}₽</span>
                </label>
              ))}
            </div>
          </div>

          {/* Выбор категории */}
          <div>
            <label className="block font-semibold mb-2">
              Категория {errors.category_id && <span className="text-red-600">*</span>}
            </label>
            <select
              value={formData.category_id || ''}
              onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
              className="w-full border rounded p-2"
            >
              <option value="">Выберите категорию</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {errors.category_id && <p className="text-red-600 text-sm mt-1">{errors.category_id}</p>}
          </div>

          {/* Бренд */}
          <div>
            <label className="block font-semibold mb-2">Бренд</label>
            <input
              type="text"
              maxLength={50}
              value={formData.brand_name}
              onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
              placeholder="Введите бренд"
              className="w-full border rounded p-2"
            />
          </div>

          {/* Флаги */}
          <div>
            <label className="block font-semibold mb-2">Флаги</label>
            <div className="space-y-2">
              {[
                { key: 'is_promotion', label: 'На акции' },
                { key: 'is_bestseller', label: 'Хит продаж' },
                { key: 'is_new', label: 'Новое поступление' }
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData[key as keyof ActivationFormData] as boolean}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                    className="mr-2"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {errors.submit && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {errors.submit}
            </div>
          )}

          {/* Кнопки */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? 'Активирую...' : 'Активировать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

---

## 🗄️ SQL запросы

### Отладка и администрирование

#### Посмотреть все неактивированные товары

```sql
SELECT 
  id, name, specification, stock,
  price_tier_1, created_at
FROM price_import
WHERE is_activated = FALSE
ORDER BY created_at DESC
LIMIT 20;
```

#### Посмотреть активированные товары

```sql
SELECT 
  pi.id, pi.name, pi.is_activated,
  p.id as product_id, p.name as product_name,
  pi.activated_at
FROM price_import pi
LEFT JOIN products p ON pi.product_id = p.id
WHERE pi.is_activated = TRUE
ORDER BY pi.activated_at DESC
LIMIT 20;
```

#### Найти дубликаты

```sql
-- Товары с одинаковыми названиями
SELECT 
  name, COUNT(*) as count,
  GROUP_CONCAT(id) as ids
FROM price_import
GROUP BY name
HAVING count > 1;

-- Пересечения с основным каталогом
SELECT 
  pi.id, pi.name,
  p.id as product_id, p.name as product_name
FROM price_import pi
JOIN products p ON pi.name = p.name
WHERE pi.is_activated = FALSE;
```

#### Статистика импорта

```sql
-- Общая статистика
SELECT 
  COUNT(*) as total_imported,
  SUM(CASE WHEN is_activated = FALSE THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN is_activated = TRUE THEN 1 ELSE 0 END) as activated,
  SUM(stock) as total_stock
FROM price_import;

-- По датам
SELECT 
  DATE(created_at) as date,
  COUNT(*) as count,
  SUM(stock) as total_stock
FROM price_import
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

#### История активации

```sql
-- Когда активировались товары
SELECT 
  pi.id, pi.name, pi.activated_at,
  p.id as product_id, p.price
FROM price_import pi
JOIN products p ON pi.product_id = p.id
WHERE pi.is_activated = TRUE
ORDER BY pi.activated_at DESC
LIMIT 20;

-- Средняя цена активированных товаров
SELECT 
  AVG(p.price) as avg_price,
  MIN(p.price) as min_price,
  MAX(p.price) as max_price,
  COUNT(*) as count
FROM price_import pi
JOIN products p ON pi.product_id = p.id
WHERE pi.is_activated = TRUE;
```

#### Удаление неиспользованных товаров

```sql
-- Удалить товары, которые не активировались за 30 дней
DELETE FROM price_import
WHERE is_activated = FALSE
AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Проверить, сколько товаров будет удалено
SELECT COUNT(*) FROM price_import
WHERE is_activated = FALSE
AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

#### Логирование операций

```sql
-- История импорта
SELECT 
  id, user_id, action, product_count,
  status, created_at
FROM import_logs
ORDER BY created_at DESC
LIMIT 50;

-- Ошибки импорта
SELECT 
  id, user_id, action, error_message,
  created_at
FROM import_logs
WHERE status = 'error'
ORDER BY created_at DESC;

-- Статистика по пользователям
SELECT 
  user_id, action,
  COUNT(*) as count,
  SUM(product_count) as total_products
FROM import_logs
GROUP BY user_id, action;
```

#### Проверка целостности данных

```sql
-- Товары, которые есть в price_import но не активированы
SELECT COUNT(*) as not_activated
FROM price_import
WHERE is_activated = FALSE;

-- Товары, которые активированы но нет в products
SELECT COUNT(*) as orphaned
FROM price_import
WHERE is_activated = TRUE
AND product_id NOT IN (SELECT id FROM products);

-- Дублирующиеся активированные товары
SELECT 
  p.name, COUNT(*) as count,
  GROUP_CONCAT(p.id) as ids
FROM products p
JOIN price_import pi ON p.id = pi.product_id
GROUP BY p.name
HAVING count > 1;
```

---

## 🔧 Troubleshooting

### Проблема: "INVALID_CSV_FORMAT"

**Решение:**

```bash
# 1. Проверить файл на корректность
file products.csv
# Должно вывести: CSV text или ASCII text

# 2. Проверить кодировку
file -i products.csv
# Должно вывести: charset=us-ascii или charset=utf-8

# 3. Проверить первую строку
head -n 1 products.csv
# Должно быть: name,specification,stock,price_tier_1,...

# 4. Перекодировать если нужно (Windows-1251 → UTF-8)
iconv -f WINDOWS-1251 -t UTF-8 products.csv > products_utf8.csv
```

### Проблема: Дубликаты не загружаются

**Решение:**

```sql
-- Проверить, есть ли товары с таким названием
SELECT * FROM products WHERE name = 'Vape Pod Pro';
SELECT * FROM price_import WHERE name = 'Vape Pod Pro';

-- Если нужно удалить старый товар
DELETE FROM products WHERE id = 5;

-- Затем загрузить CSV еще раз
```

### Проблема: "Token expired" при загрузке большого файла

**Решение:**

```bash
# Разделить большой файл на части
split -l 5000 products.csv products_

# Загрузить каждую часть с новым токеном
for file in products_*; do
  # Получить новый токен (если нужно)
  TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@vapeshop.ru","password":"***"}' \
    | jq -r '.token')

  # Загрузить файл
  curl -X POST http://localhost:3000/api/admin/import \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$file"
done
```

### Проблема: "413 Payload Too Large"

**Решение:**

Файл больше 10 МБ. Разделите на части:

```bash
# Узнать размер
ls -lh products.csv

# Разделить на меньшие файлы
split -b 5M products.csv products_chunk_

# Загрузить каждый chunk
for file in products_chunk_*; do
  curl -X POST http://localhost:3000/api/admin/import \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -F "file=@$file"
done
```

### Проблема: Товар не появился в каталоге после активации

**Диагностика:**

```sql
-- 1. Проверить, активирован ли товар
SELECT * FROM price_import WHERE id = 42;

-- 2. Проверить, есть ли товар в products
SELECT * FROM products WHERE import_batch_id = 42;

-- 3. Если есть, проверить, активирован ли
SELECT id, name, is_active FROM products WHERE import_batch_id = 42;

-- 4. Проверить логи
SELECT * FROM import_logs WHERE status = 'error' ORDER BY created_at DESC LIMIT 5;
```

### Проблема: "Unauthorized" при загрузке

**Решение:**

```bash
# 1. Проверить, есть ли токен
echo $BEARER_TOKEN

# 2. Проверить формат токена
curl -X POST http://localhost:3000/api/admin/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@products.csv"

# 3. Если токен просрочен, получить новый
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vapeshop.ru",
    "password": "your_password"
  }' | jq '.token'
```

### Проблема: Тайм-аут при активации

**Решение:**

```bash
# Увеличить таймаут curl
curl --max-time 300 -X POST http://localhost:3000/api/admin/activate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @payload.json
```

---

**Документация обновлена:** 2025-04-02  
**Версия:** 1.0  
**Автор:** VapeShop Team

**Вопросы?** Обратитесь в Slack: #vapeshop-support
