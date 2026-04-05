/**
 * Модуль валидации входных данных для VapeShop
 * Используется во всех API эндпоинтах для безопасности и консистентности
 */

export interface ValidationError {
  field: string;
  message: string;
}

// Валидация товара
export interface ProductData {
  name?: string;
  description?: string;
  specification?: string;
  price?: number;
  stock?: number;
  quantity?: number;
  category_id?: number;
  brand_id?: number;
  image_url?: string;
}

export function validateProduct(data: ProductData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (data.name !== undefined) {
    if (typeof data.name !== 'string') {
      errors.push({ field: 'name', message: 'Имя товара должно быть строкой' });
    } else if (data.name.trim().length < 3) {
      errors.push({ field: 'name', message: 'Имя товара должно быть не менее 3 символов' });
    } else if (data.name.length > 255) {
      errors.push({ field: 'name', message: 'Имя товара не должно превышать 255 символов' });
    }
  }

  if (data.description !== undefined) {
    if (typeof data.description !== 'string') {
      errors.push({ field: 'description', message: 'Описание должно быть строкой' });
    } else if (data.description.length > 5000) {
      errors.push({ field: 'description', message: 'Описание не должно превышать 5000 символов' });
    }
  }

  if (data.specification !== undefined) {
    if (typeof data.specification !== 'string') {
      errors.push({ field: 'specification', message: 'Характеристики должны быть строкой' });
    } else if (data.specification.length > 5000) {
      errors.push({
        field: 'specification',
        message: 'Характеристики не должны превышать 5000 символов',
      });
    }
  }

  if (data.price !== undefined) {
    if (typeof data.price !== 'number') {
      errors.push({ field: 'price', message: 'Цена должна быть числом' });
    } else if (data.price < 0) {
      errors.push({ field: 'price', message: 'Цена не может быть отрицательной' });
    } else if (data.price > 1000000) {
      errors.push({ field: 'price', message: 'Цена не может быть больше 1 000 000' });
    }
  }

  if (data.quantity !== undefined) {
    if (typeof data.quantity !== 'number' || !Number.isInteger(data.quantity)) {
      errors.push({ field: 'quantity', message: 'Количество должно быть целым числом' });
    } else if (data.quantity < 0) {
      errors.push({ field: 'quantity', message: 'Количество не может быть отрицательным' });
    }
  }

  if (data.stock !== undefined) {
    if (typeof data.stock !== 'number' || !Number.isInteger(data.stock)) {
      errors.push({ field: 'stock', message: 'Остаток должен быть целым числом' });
    } else if (data.stock < 0) {
      errors.push({ field: 'stock', message: 'Остаток не может быть отрицательным' });
    }
  }

  if (data.category_id !== undefined) {
    if (typeof data.category_id !== 'number' || !Number.isInteger(data.category_id)) {
      errors.push({ field: 'category_id', message: 'ID категории должно быть целым числом' });
    }
  }

  if (data.brand_id !== undefined) {
    if (typeof data.brand_id !== 'number' || !Number.isInteger(data.brand_id)) {
      errors.push({ field: 'brand_id', message: 'ID бренда должно быть целым числом' });
    }
  }

  if (data.image_url !== undefined) {
    if (typeof data.image_url !== 'string') {
      errors.push({ field: 'image_url', message: 'URL изображения должен быть строкой' });
    } else if (!isValidUrl(data.image_url)) {
      errors.push({ field: 'image_url', message: 'Некорректный URL изображения' });
    }
  }

  return errors;
}

// Валидация заказа
export interface OrderData {
  items?: Array<{ product_id: number; quantity: number }>;
  delivery_address?: string;
  delivery_type?: string;
}

export function validateOrder(data: OrderData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (data.items !== undefined) {
    if (!Array.isArray(data.items)) {
      errors.push({ field: 'items', message: 'Items должен быть массивом' });
    } else if (data.items.length === 0) {
      errors.push({ field: 'items', message: 'Заказ должен содержать хотя бы один товар' });
    } else {
      data.items.forEach((item, index) => {
        if (typeof item.product_id !== 'number' || !Number.isInteger(item.product_id)) {
          errors.push({
            field: `items[${index}].product_id`,
            message: 'ID товара должно быть целым числом',
          });
        }
        if (
          typeof item.quantity !== 'number' ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1
        ) {
          errors.push({
            field: `items[${index}].quantity`,
            message: 'Количество должно быть положительным целым числом',
          });
        }
        if (item.quantity > 100) {
          errors.push({
            field: `items[${index}].quantity`,
            message: 'Максимальное количество товара в заказе — 100',
          });
        }
      });
    }
  }

  if (data.delivery_address !== undefined) {
    if (typeof data.delivery_address !== 'string') {
      errors.push({ field: 'delivery_address', message: 'Адрес должен быть строкой' });
    } else if (data.delivery_address.trim().length < 5) {
      errors.push({ field: 'delivery_address', message: 'Адрес должен быть не менее 5 символов' });
    } else if (data.delivery_address.length > 500) {
      errors.push({ field: 'delivery_address', message: 'Адрес не должен превышать 500 символов' });
    }
  }

  if (data.delivery_type !== undefined) {
    const validTypes = ['delivery', 'self_pickup', 'locker'];
    if (!validTypes.includes(data.delivery_type)) {
      errors.push({
        field: 'delivery_type',
        message: `Тип доставки должен быть одним из: ${validTypes.join(', ')}`,
      });
    }
  }

  return errors;
}

// Валидация отзыва
export interface ReviewData {
  comment?: string;
  rating?: number;
}

export function validateReview(data: ReviewData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (data.comment !== undefined) {
    if (typeof data.comment !== 'string') {
      errors.push({ field: 'comment', message: 'Комментарий должен быть строкой' });
    } else if (data.comment.trim().length < 3) {
      errors.push({ field: 'comment', message: 'Комментарий должен быть не менее 3 символов' });
    } else if (data.comment.length > 2000) {
      errors.push({ field: 'comment', message: 'Комментарий не должен превышать 2000 символов' });
    }
  }

  if (data.rating !== undefined) {
    if (typeof data.rating !== 'number' || !Number.isInteger(data.rating)) {
      errors.push({ field: 'rating', message: 'Рейтинг должен быть целым числом' });
    } else if (data.rating < 1 || data.rating > 5) {
      errors.push({ field: 'rating', message: 'Рейтинг должен быть от 1 до 5' });
    }
  }

  return errors;
}

// Валидация адреса
export interface AddressData {
  street?: string;
  city?: string;
  postal_code?: string;
  phone?: string;
  is_default?: boolean;
}

export function validateAddress(data: AddressData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (data.street !== undefined) {
    if (typeof data.street !== 'string' || data.street.trim().length < 3) {
      errors.push({ field: 'street', message: 'Улица должна быть не менее 3 символов' });
    } else if (data.street.length > 255) {
      errors.push({ field: 'street', message: 'Улица не должна превышать 255 символов' });
    }
  }

  if (data.city !== undefined) {
    if (typeof data.city !== 'string' || data.city.trim().length < 2) {
      errors.push({ field: 'city', message: 'Город должен быть не менее 2 символов' });
    }
  }

  if (data.postal_code !== undefined) {
    if (typeof data.postal_code !== 'string' || data.postal_code.trim().length < 3) {
      errors.push({
        field: 'postal_code',
        message: 'Почтовый индекс должен быть не менее 3 символов',
      });
    }
  }

  if (data.phone !== undefined) {
    if (typeof data.phone !== 'string') {
      errors.push({ field: 'phone', message: 'Номер телефона должен быть строкой' });
    } else if (!/^\+?\d{10,15}$/.test(data.phone.replace(/[\s\-\(\)]/g, ''))) {
      errors.push({ field: 'phone', message: 'Некорректный номер телефона' });
    }
  }

  if (data.is_default !== undefined) {
    if (typeof data.is_default !== 'boolean') {
      errors.push({ field: 'is_default', message: 'is_default должно быть boolean' });
    }
  }

  return errors;
}

// Утилиты
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validatePagination(page?: unknown, limit?: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (page !== undefined) {
    const pageNum = parseInt(String(page));
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push({ field: 'page', message: 'Номер страницы должен быть числом ≥ 1' });
    }
  }

  if (limit !== undefined) {
    const limitNum = parseInt(String(limit));
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push({ field: 'limit', message: 'Лимит должен быть от 1 до 100' });
    }
  }

  return errors;
}

export function validateSortBy(sortBy?: string, validFields?: string[]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (sortBy && validFields && !validFields.includes(sortBy)) {
    errors.push({ field: 'sort_by', message: `Допустимые значения: ${validFields.join(', ')}` });
  }

  return errors;
}
