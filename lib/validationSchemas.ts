/**
 * API Request Validation Schemas with Zod
 * Используется для валидации всех входных данных
 */

import { z } from 'zod';

// ===== ORDERS =====

export const createOrderRequestSchema = z.object({
  telegram_id: z.number().int().positive('Invalid telegram_id'),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid('Invalid product_id'),
        quantity: z.number().int().positive('Quantity must be positive'),
        price: z.number().positive('Price must be positive'),
      })
    )
    .min(1, 'At least one item required'),
  delivery_method: z.enum(['pickup', 'courier']),
  delivery_date: z.string().datetime('Invalid delivery date'),
  address: z.string().optional(),
  promo_code: z.string().optional(),
  discount: z.number().min(0).optional(),
});

export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;

// ===== CART =====

export const cartItemSchema = z.object({
  product_id: z.string().uuid('Invalid product_id'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(9999, 'Quantity too large'),
});

export const addToCartRequestSchema = z.object({
  telegram_id: z.number().int().positive(),
  product_id: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export type AddToCartRequest = z.infer<typeof addToCartRequestSchema>;

// ===== PRODUCTS =====

export const createProductRequestSchema = z.object({
  name: z.string().min(3).max(255),
  price: z.number().positive(),
  category_id: z.number().int().positive(),
  description: z.string().optional(),
  stock: z.number().int().min(0).optional(),
  images: z.array(z.string().url()).optional(),
  is_promotion: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;

// ===== USERS =====

export const updateUserRequestSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  first_name: z.string().max(255).optional(),
  last_name: z.string().max(255).optional(),
});

export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;

// ===== PAGINATION =====

export const paginationSchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .transform((v) => (v ? parseInt(v) : 1)),
  limit: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .transform((v) => (v ? Math.min(parseInt(v), 100) : 20)),
  sort: z.enum(['asc', 'desc']).optional().default('desc'),
  sortBy: z.string().optional(),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

// ===== UTILITY =====

/**
 * Безопасная валидация данных с обработкой ошибок
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { valid: boolean; data?: T; errors?: Record<string, string> } {
  try {
    const validated = schema.parse(data);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.issues.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { valid: false, errors };
    }
    return { valid: false, errors: { _error: 'Unknown validation error' } };
  }
}
