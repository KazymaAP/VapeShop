import type { NextApiRequest, NextApiResponse } from 'next';
import { transaction } from '@/lib/db';
import { getTelegramIdFromRequest, hasRequiredRole } from '@/lib/auth';
import { validateProduct } from '@/lib/validate';
import { apiSuccess, apiError } from '@/lib/apiResponse';
import { logger } from '@/lib/logger';

/**
 * POST /api/products/bulk
 * Массовое создание/импорт товаров
 * Требует admin доступ
 *
 * Body: {
 *   products: [
 *     { name, price, stock, category_id, brand_id, specification?, images? },
 *     ...
 *   ]
 * }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return apiError(res, 'Method not allowed', 405);
  }

  try {
    // Проверяем аутентификацию
    const telegramId = await getTelegramIdFromRequest(req);
    if (!telegramId) {
      return apiError(res, 'Unauthorized', 401);
    }

    // Проверяем роль
    const hasRole = await hasRequiredRole(telegramId, ['admin', 'super_admin']);
    if (!hasRole) {
      return apiError(res, 'Forbidden: admin access required', 403);
    }

    const { products } = req.body;

    // Валидация входных данных
    if (!Array.isArray(products)) {
      return apiError(res, 'products must be an array', 400);
    }

    if (products.length === 0) {
      return apiError(res, 'products array is empty', 400);
    }

    if (products.length > 1000) {
      return apiError(res, 'Maximum 1000 products per request', 400);
    }

    // Валидируем каждый товар
    const validationErrors: Record<number, Record<string, string>> = {};
    for (let i = 0; i < products.length; i++) {
      const errors = validateProduct(products[i]);
      if (errors.length > 0) {
        validationErrors[i] = Object.fromEntries(
          errors.map((e) => [e.field, e.message])
        );
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      return apiError(res, 'Validation failed', 400);
    }

    // Используем транзакцию для атомарности
    const result = await transaction(async (client) => {
      const created: string[] = [];
      const errors: Array<{ index: number; name: string; error: string }> = [];

      for (let i = 0; i < products.length; i++) {
        try {
          const product = products[i];

          // Вставляем товар с RETURNING для получения ID
          const insertResult = await client.query(
            `INSERT INTO products (
              name, price, stock, category_id, brand_id, 
              specification, images, is_active, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, TRUE, NOW(), NOW()
            ) RETURNING id`,
            [
              product.name,
              product.price || 0,
              product.stock || 0,
              product.category_id || null,
              product.brand_id || null,
              product.specification || '',
              product.images || [],
            ]
          );

          if (insertResult.rows.length > 0) {
            created.push(insertResult.rows[0].id);
          }
        } catch (err) {
          logger.error(`Bulk import error for product ${i}`, err);
          errors.push({
            index: i,
            name: products[i].name,
            error: String(err),
          });
        }
      }

      return { created, errors };
    });

    logger.info('Bulk product import completed', {
      telegramId,
      created: result.created.length,
      failed: result.errors.length,
    });

    return apiSuccess(res, {
      created: result.created.length,
      failed: result.errors.length,
      product_ids: result.created,
      errors: result.errors.length > 0 ? result.errors : undefined,
    }, 201, { total: result.created.length });
  } catch (err) {
    logger.error('Bulk product import error', err);
    return apiError(res, 'Failed to import products', 500);
  }
}
