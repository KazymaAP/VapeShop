import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getTelegramIdFromRequest, hasRequiredRole } from '@/lib/auth';
import { validateProduct } from '@/lib/validate';
import { apiSuccess, apiError } from '@/lib/apiResponse';
import { logger } from '@/lib/logger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'PUT' || req.method === 'DELETE') {
    // Для PUT/DELETE требуется админ-доступ
    const telegramId = await getTelegramIdFromRequest(req);
    if (!telegramId) {
      return apiError(res, 'Unauthorized', 401);
    }

    const hasRole = await hasRequiredRole(telegramId, ['admin', 'super_admin']);
    if (!hasRole) {
      return apiError(res, 'Forbidden: admin access required', 403);
    }

    return req.method === 'PUT' ? handlePut(req, res) : handleDelete(req, res);
  } else {
    return apiError(res, 'Method not allowed', 405);
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    let { id } = req.query;

    // Валидация id
    id = Array.isArray(id) ? id[0] : id;
    if (!id) {
      return apiError(res, 'Invalid product ID', 400);
    }

    const result = await query(
      `SELECT p.*, b.name as brand_name, c.name as category_name
       FROM products p
       LEFT JOIN brands b ON p.brand_id = b.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1 AND p.is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return apiError(res, 'Товар не найден', 404);
    }

    await query('UPDATE products SET views = views + 1 WHERE id = $1', [id]);

    return apiSuccess(res, result.rows[0], 200);
  } catch {
    return apiError(res, 'Ошибка загрузки товара', 500);
  }
}

/**
 * PUT /api/products/[id]
 * Обновить товар (только для администраторов)
 */
async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  try {
    let { id } = req.query;

    // Валидация id
    id = Array.isArray(id) ? id[0] : id;
    if (!id) {
      return apiError(res, 'Invalid product ID', 400);
    }

    const updates = req.body;

    // Валидация входных данных
    const errors = validateProduct(updates);
    if (errors.length > 0) {
      return apiError(res, 'Validation failed', 400);
    }

    // Проверяем, существует ли товар
    const productCheck = await query('SELECT id FROM products WHERE id = $1', [id]);
    if (productCheck.rows.length === 0) {
      return apiError(res, 'Товар не найден', 404);
    }

    // Построение UPDATE запроса
    const updateFields: string[] = [];
    const params: (string | number | boolean)[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      params.push(updates.name);
    }
    if (updates.specification !== undefined) {
      updateFields.push(`specification = $${paramIndex++}`);
      params.push(updates.specification);
    }
    if (updates.price !== undefined) {
      updateFields.push(`price = $${paramIndex++}`);
      params.push(updates.price);
    }
    if (updates.stock !== undefined) {
      updateFields.push(`stock = $${paramIndex++}`);
      params.push(updates.stock);
    }
    if (updates.category_id !== undefined) {
      updateFields.push(`category_id = $${paramIndex++}`);
      params.push(updates.category_id);
    }
    if (updates.brand_id !== undefined) {
      updateFields.push(`brand_id = $${paramIndex++}`);
      params.push(updates.brand_id);
    }

    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 1) {
      return apiError(res, 'Не указаны поля для обновления', 400);
    }

    params.push(id);
    const updateQuery = `UPDATE products SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    const result = await query(updateQuery, params);

    return apiSuccess(res, result.rows[0], 200);
  } catch (err) {
    logger.error('Update product error:', err);
    return apiError(res, 'Ошибка при обновлении товара', 500);
  }
}

/**
 * DELETE /api/products/[id]
 * Удалить товар (только для администраторов)
 */
async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  try {
    let { id } = req.query;

    // Валидация id
    id = Array.isArray(id) ? id[0] : id;
    if (!id) {
      return apiError(res, 'Invalid product ID', 400);
    }
    const productCheck = await query('SELECT id FROM products WHERE id = $1', [id]);
    if (productCheck.rows.length === 0) {
      return apiError(res, 'Товар не найден', 404);
    }

    // Мягкое удаление: помечаем как неактивное вместо полного удаления
    await query('UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1', [id]);

    return apiSuccess(res, { deleted: true }, 200);
  } catch (err) {
    logger.error('Delete product error:', err);
    return apiError(res, 'Ошибка при удалении товара', 500);
  }
}

// ⚠️ ВАЖНО: GET - публичный эндпоинт, PUT/DELETE требуют admin
// Защита PUT/DELETE реализуется внутри handler
export default handler;
