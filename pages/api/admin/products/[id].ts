/**
 * API для инлайн-редактирования товаров в таблице админа
 * PATCH /api/admin/products/{id} - обновить одно поле товара
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth, getTelegramId } from '@/lib/auth';
import { ApiResponse } from '@/types/api';

export default requireAuth(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) => {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { field, value } = req.body;

    if (!id || !field) {
      return res.status(400).json({ error: 'Product ID and field required' });
    }

    // Allowlist полей которые можно редактировать
    const allowedFields = ['name', 'price', 'stock', 'category', 'brand', 'is_active', 'discount_percent'];
    
    if (!allowedFields.includes(field)) {
      return res.status(400).json({ error: `Field ${field} cannot be edited` });
    }

    // Валидируем типы
    if (field === 'price' || field === 'discount_percent') {
      if (typeof value !== 'number' || value < 0) {
        return res.status(400).json({ error: `${field} must be positive number` });
      }
    }

    if (field === 'stock') {
      if (typeof value !== 'number' || value < 0) {
        return res.status(400).json({ error: 'Stock must be non-negative number' });
      }
    }

    if (field === 'is_active') {
      if (typeof value !== 'boolean') {
        return res.status(400).json({ error: 'is_active must be boolean' });
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
      return res.status(404).json({ error: 'Product not found' });
    }

    // Логируем операцию
    const userTelegramId = getTelegramId(req);
    await query(
      `INSERT INTO audit_log (user_telegram_id, action, details, created_at)
       VALUES ($1, 'PRODUCT_INLINE_EDIT', $2, NOW())`,
      [
        userTelegramId,
        JSON.stringify({ product_id: id, field, new_value: value }),
      ]
    );

    return res.status(200).json({
      data: result.rows[0],
      message: `Field ${field} updated successfully`,
    });
  } catch (err) {
    console.error('Inline edit error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});
