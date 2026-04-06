/**
 * API для сравнения товаров
 * GET /api/compare - получить текущее сравнение
 * POST /api/compare - создать или обновить сравнение (max 4 товара)
 * DELETE /api/compare - очистить сравнение
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth, getTelegramIdFromRequest } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const telegramId =
    (req as Record<string, unknown>).telegramId || (await getTelegramIdFromRequest(req));

  if (!telegramId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT 
          pc.id,
          pc.product_ids,
          pc.note,
          pc.created_at,
          json_agg(json_build_object(
            'id', p.id,
            'name', p.name,
            'price', p.price,
            'image_url', p.image_url,
            'rating', p.rating,
            'specification', p.specification,
            'stock', p.stock
          )) as products
         FROM product_comparisons pc
         LEFT JOIN products p ON p.id = ANY(pc.product_ids)
         WHERE pc.user_telegram_id = $1
         GROUP BY pc.id
         ORDER BY pc.created_at DESC
         LIMIT 1`,
        [telegramId]
      );

      if (result.rows.length === 0) {
        return res.status(200).json({
          success: true,
          data: null,
          timestamp: Date.now(),
        });
      }

      res.status(200).json({
        success: true,
        data: result.rows[0],
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Failed to get comparison' });
    }
  } else if (req.method === 'POST') {
    const { product_ids, note } = req.body;

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: 'product_ids must be a non-empty array' });
    }

    if (product_ids.length > 4) {
      return res.status(400).json({ success: false, error: 'Maximum 4 products allowed' });
    }

    try {
      // Проверяем существование всех товаров
      const productsCheck = await query(
        `SELECT COUNT(*) as cnt FROM products WHERE id = ANY($1) AND is_active = true`,
        [product_ids]
      );

      // HIGH-026 FIX: cnt из pg может быть string, нужно преобразовать
      if (parseInt(productsCheck.rows[0].cnt, 10) !== product_ids.length) {
        return res.status(404).json({ success: false, error: 'One or more products not found' });
      }

      // Сохраняем сравнение
      const result = await query(
        `INSERT INTO product_comparisons (user_telegram_id, product_ids, note)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [telegramId, product_ids, note || null]
      );

      res.status(200).json({
        success: true,
        data: { id: result.rows[0]?.id },
        message: 'Comparison saved',
        timestamp: Date.now(),
      });
    } catch (_err) {
      console.error(_err);
      res.status(500).json({ success: false, error: 'Failed to save comparison' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await query(`DELETE FROM product_comparisons WHERE user_telegram_id = $1`, [telegramId]);

      res.status(200).json({
        success: true,
        message: 'Comparison cleared',
        timestamp: Date.now(),
      });
    } catch (_err) {
      console.error(_err);
      res.status(500).json({ success: false, error: 'Failed to delete comparison' });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['customer']);
