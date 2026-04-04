/**
 * Зod схемы для валидации API запросов
 * 
 * Использование:
 * const parsed = createOrderSchema.parse(req.body);
 * 
 * Если данные невалидны, выбросится ZodError
 */

// ВАЖНО: Zod должен быть установлен: npm install zod
// Вот импорты для когда Zod будет установлен:
// import { z } from 'zod';

// Для сейчас используем простую валидацию (т.к. Zod может быть не установлен)
// Но вот как должны выглядеть схемы:

/*
export const createOrderSchema = z.object({
  telegram_id: z.number().int().positive('Telegram ID должен быть положительным числом'),
  items: z.array(
    z.object({
      product_id: z.string().uuid('Неверный формат ID товара'),
      quantity: z.number().int().positive('Количество должно быть положительным'),
      price: z.number().positive('Цена должна быть положительной'),
    })
  ).min(1, 'Должен быть хотя бы один товар'),
  delivery_method: z.enum(['pickup', 'courier'], {
    errorMap: () => ({ message: 'Способ доставки должен быть pickup или courier' })
  }),
  delivery_date: z.string().datetime().optional(),
  address: z.string().optional(),
  promo_code: z.string().optional(),
  discount: z.number().nonnegative().optional(),
});

export const updateRoleSchema = z.object({
  userId: z.number().int().positive(),
  newRole: z.enum(['customer', 'admin', 'manager', 'courier', 'support', 'seller', 'buyer', 'super_admin']),
});

export const createProductSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(255),
  description: z.string().optional(),
  price: z.number().positive('Цена должна быть положительной'),
  stock: z.number().int().nonnegative('Остаток должен быть неотрицательным'),
  category_id: z.string().uuid().optional(),
  brand_id: z.string().uuid().optional(),
  is_active: z.boolean().default(true),
});

export const updatePromoCodeSchema = z.object({
  code: z.string().min(1).toUpperCase(),
  discount_type: z.enum(['percent', 'fixed']).optional(),
  discount_value: z.number().positive().optional(),
  max_uses: z.number().int().nonnegative().optional(),
  valid_from: z.string().datetime().optional(),
  valid_until: z.string().datetime().optional(),
});
*/

// Пока используем простую валидацию для критичных эндпоинтов
export function validateOrderBody(body: any): { 
  valid: boolean; 
  errors?: Record<string, string>;
  data?: any;
} {
  const errors: Record<string, string> = {};

  if (!body.telegram_id || typeof body.telegram_id !== 'number') {
    errors.telegram_id = 'telegram_id должен быть числом';
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    errors.items = 'items должен быть непустым массивом';
  }

  if (!body.delivery_method || !['pickup', 'courier'].includes(body.delivery_method)) {
    errors.delivery_method = 'delivery_method должен быть pickup или courier';
  }

  if (body.discount && typeof body.discount !== 'number') {
    errors.discount = 'discount должен быть числом';
  }

  return Object.keys(errors).length === 0
    ? { valid: true, data: body }
    : { valid: false, errors };
}

export function validateRoleUpdate(body: any): {
  valid: boolean;
  errors?: Record<string, string>;
  data?: any;
} {
  const errors: Record<string, string> = {};
  const validRoles = ['customer', 'admin', 'manager', 'courier', 'support', 'seller', 'buyer', 'super_admin'];

  if (!body.userId || typeof body.userId !== 'number') {
    errors.userId = 'userId должен быть числом';
  }

  if (!body.newRole || !validRoles.includes(body.newRole)) {
    errors.newRole = `newRole должен быть одним из: ${validRoles.join(', ')}`;
  }

  return Object.keys(errors).length === 0
    ? { valid: true, data: body }
    : { valid: false, errors };
}

export function validatePromoCode(body: any): {
  valid: boolean;
  errors?: Record<string, string>;
  data?: any;
} {
  const errors: Record<string, string> = {};

  if (!body.code || typeof body.code !== 'string') {
    errors.code = 'code обязателен';
  }

  if (body.discount_type && !['percent', 'fixed'].includes(body.discount_type)) {
    errors.discount_type = 'discount_type должен быть percent или fixed';
  }

  if (body.discount_value && typeof body.discount_value !== 'number') {
    errors.discount_value = 'discount_value должен быть числом';
  }

  if (body.max_uses && (typeof body.max_uses !== 'number' || body.max_uses < 0)) {
    errors.max_uses = 'max_uses должен быть положительным числом';
  }

  return Object.keys(errors).length === 0
    ? { valid: true, data: body }
    : { valid: false, errors };
}
