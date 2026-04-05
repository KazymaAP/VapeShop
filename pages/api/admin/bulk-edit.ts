/**
 * API для массового редактирования товаров
 * POST /api/admin/bulk-edit - обновить несколько товаров
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { ApiResponse, ApiError } from '@/types/api';

interface BulkEditItem {
  productId: string;
  fields: {
    price?: number;
    category?: string;
    is_active?: boolean;
    discount_percent?: number;
  };
}

export default requireAuth(async (req: NextApiRequest, res: NextApiResponse<ApiResponse | ApiError>) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed', timestamp: Date.now() });
  }

  try {
    const { items } = req.body as { items: BulkEditItem[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Items array required', timestamp: Date.now() });
    }

    if (items.length > 100) {
      return res.status(400).json({ success: false, error: 'Maximum 100 items per request', timestamp: Date.now() });
    }

    const results = [];

    for (const item of items) {
      const { productId, fields } = item;

      if (!productId) continue;

      // Построили динамический UPDATE запрос
      const updates: string[] = [];
      const values: (string | number | boolean)[] = [productId];
      let paramIndex = 2;

      if (fields.price !== undefined) {
        updates.push(`price = $${paramIndex}`);
        values.push(fields.price);
        paramIndex++;
      }

      if (fields.category !== undefined) {
        updates.push(`category = $${paramIndex}`);
        values.push(fields.category);
        paramIndex++;
      }

      if (fields.is_active !== undefined) {
        updates.push(`is_active = $${paramIndex}`);
        values.push(fields.is_active);
        paramIndex++;
      }

      if (fields.discount_percent !== undefined) {
        updates.push(`discount_percent = $${paramIndex}`);
        values.push(fields.discount_percent);
        paramIndex++;
      }

      updates.push(`updated_at = NOW()`);

      if (updates.length === 1) continue; // Нечего обновлять

      const sql = `UPDATE products SET ${updates.join(', ')} WHERE id = $1 RETURNING id, price, category, is_active`;

      const result = await query(sql, values);
      results.push(result.rows[0]);
    }

    return res.status(200).json({
      success: true,
      data: results,
      timestamp: Date.now(),
      message: `Successfully updated ${results.length} products`,
    });
  } catch (err) {
    console.error('Bulk edit error:', err);
    res.status(500).json({ success: false, error: 'Failed to update products', timestamp: Date.now() });
  }
});
