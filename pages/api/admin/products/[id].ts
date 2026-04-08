import { logger } from '@/lib/logger';
/**
 * API для инлайн-редактирования товаров в таблице админа
 * PATCH /api/admin/products/{id} - обновить одно поле товара
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth, getTelegramId } from '@/lib/auth';
import { ApiResponse, ApiError } from '@/types/api';

type ApiResp = ApiResponse | ApiError;

export default requireAuth(async (req: NextApiRequest, res: NextApiResponse<ApiResp>) => {
  if (req.method !== 'PATCH') {
    return res
      .status(405)
      .json({ success: false, error: 'Method not allowed', timestamp: Date.now() });
  }

  try {
    const { id } = req.query;
    const { field, value } = req.body;

    if (!id || !field) {
      return res
        .status(400)
        .json({ success: false, error: 'Product ID and field required', timestamp: Date.now() });
    }

    // Allowlist полей которые можно редактировать
    const allowedFields = [
      'name',
      'price',
      'stock',
      'category',
      'brand',
      'is_active',
      'discount_percent',
    ];

    if (!allowedFields.includes(field)) {
      return res
        .status(400)
        .json({ success: false, error: `Field ${field} cannot be edited`, timestamp: Date.now() });
    }

    // Валидируем типы
    if (field === 'price' || field === 'discount_percent') {
      if (typeof value !== 'number' || value < 0) {
        return res.status(400).json({
          success: false,
          error: `${field} must be positive number`,
          timestamp: Date.now(),
        });
      }
    }

    if (field === 'stock') {
      if (typeof value !== 'number' || value < 0) {
        return res.status(400).json({
          success: false,
          error: 'Stock must be non-negative number',
          timestamp: Date.now(),
        });
      }
    }

    if (field === 'is_active') {
      if (typeof value !== 'boolean') {
        return res
          .status(400)
          .json({ success: false, error: 'is_active must be boolean', timestamp: Date.now() });
      }
    }

    // Обновляем
    const result = await query(
      `UPDATE products 
       SET ${field} = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [value, id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: 'Product not found', timestamp: Date.now() });
    }

    // Логируем операцию
    const userTelegramId = getTelegramId(req);
    await query(
      `INSERT INTO audit_log (user_telegram_id, action, details, created_at)
       VALUES ($1, 'PRODUCT_INLINE_EDIT', $2, NOW())`,
      [userTelegramId, JSON.stringify({ product_id: id, field, new_value: value })]
    );

    return res.status(200).json({
      success: true,
      data: result.rows[0],
      message: `Field ${field} updated successfully`,
      timestamp: Date.now(),
    });
  } catch (err) {
    logger.error('Inline edit error:', err);
    res
      .status(500)
      .json({ success: false, error: 'Failed to update product', timestamp: Date.now() });
  }
});
