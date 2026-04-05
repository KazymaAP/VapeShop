/**
 * Zod схемы для валидации входных данных всех API эндпоинтов
 * Гарантирует безопасность и консистентность данных
 * 
 * Использование:
 * const parsed = validateData(CreateOrderSchema, req.body);
 */

import { z } from 'zod';
import { LIMITS, DELIVERY_TYPES, ORDER_STATUS, PAYMENT_STATUS } from './constants';

// ============ Общие схемы ============

export const IdSchema = z.number().int().positive();
export const StringIdSchema = z.string().uuid();
export const DateSchema = z.string().datetime();
export const UrlSchema = z.string().url();
export const EmailSchema = z.string().email().toLowerCase();
export const PhoneSchema = z.string().min(10).max(20);

// ============ Пользователь ============

export const CreateUserSchema = z.object({
  telegram_id: z.number().int().positive('Telegram ID должен быть положительным числом'),
  first_name: z.string().min(1, 'Имя обязательно').max(100),
  last_name: z.string().max(100).optional(),
  username: z.string().min(3).max(32).optional(),
  phone: PhoneSchema.optional(),
  email: EmailSchema.optional(),
  avatar_url: UrlSchema.optional(),
});

export const UpdateUserSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().max(100).optional(),
  phone: PhoneSchema.optional(),
  email: EmailSchema.optional(),
  avatar_url: UrlSchema.optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

// ============ Товары ============

export const CreateProductSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(LIMITS.MAX_PRODUCT_NAME_LENGTH),
  description: z.string().max(LIMITS.MAX_PRODUCT_DESCRIPTION_LENGTH).optional(),
  price: z.number().int().min(0, 'Цена должна быть положительной'),
  cost: z.number().int().min(0).optional(),
  category_id: IdSchema.optional(),
  image_url: UrlSchema.optional(),
  is_available: z.boolean().default(true),
  quantity_in_stock: z.number().int().min(0).default(0),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const BulkUpdateProductSchema = z.object({
  products: z.array(
    z.object({
      id: IdSchema,
      ...CreateProductSchema.shape,
    }),
  ),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type BulkUpdateProductInput = z.infer<typeof BulkUpdateProductSchema>;

// ============ Заказы ============

export const CreateOrderItemSchema = z.object({
  product_id: IdSchema,
  quantity: z.number().int().min(1).max(LIMITS.MAX_PRODUCT_QUANTITY),
  price_per_unit: z.number().int().min(0).optional(),
});

export const CreateOrderSchema = z.object({
  items: z.array(CreateOrderItemSchema).min(1, 'Должен быть хотя бы один товар').max(LIMITS.MAX_PRODUCTS_PER_ORDER),
  delivery_method: z.enum([DELIVERY_TYPES.PICKUP, DELIVERY_TYPES.COURIER], {
    errorMap: () => ({ message: 'Способ доставки должен быть pickup или courier' }),
  }),
  address: z.string().optional(),
  promo_code: z.string().max(50).optional(),
});

export const UpdateOrderSchema = z.object({
  status: z.enum([
    ORDER_STATUS.PENDING,
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.CANCELLED,
  ]).optional(),
  comment: z.string().max(500).optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>;

// ============ Роли ============

export const UpdateRoleSchema = z.object({
  userId: z.number().int().positive(),
  newRole: z.enum(['customer', 'admin', 'manager', 'courier', 'support', 'seller', 'super_admin']),
});

export const updatePromoCodeSchema = z.object({
  code: z.string().min(1).toUpperCase(),
  discount_type: z.enum(['percent', 'fixed']).optional(),
  discount_value: z.number().positive().optional(),
  max_uses: z.number().int().nonnegative().optional(),
  valid_from: z.string().datetime().optional(),
  valid_until: z.string().datetime().optional(),
});

// ============ Утилиты валидации ============

/**
 * Валидирует объект согласно Zod схеме
 * Выбрасывает ошибку с деталями валидации если данные некорректны
 */
export function validateData<T>(schema: z.ZodSchema, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    }));

    throw new Error(JSON.stringify(errors));
  }

  return result.data as T;
}

/**
 * Безопасная валидация — возвращает результат вместо выброса ошибки
 */
export function validateDataSafe<T>(
  schema: z.ZodSchema,
  data: unknown,
): { success: boolean; data?: T; errors?: Array<{ path: string; message: string }> } {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    }));

    return { success: false, errors };
  }

  return { success: true, data: result.data as T };
}
