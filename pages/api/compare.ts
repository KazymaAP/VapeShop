import { logger } from '@/lib/logger';
/**
 * API для сравнения товаров
 * GET /api/compare - получить текущее сравнение
 * POST /api/compare - создать или обновить сравнение (max 4 товара)
 * DELETE /api/compare - очистить сравнение
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query, transaction } from '@/lib/db';
import { requireAuth, getTelegramIdFromRequest } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/apiResponse';

async function compareHandler(req: NextApiRequest, res: NextApiResponse) {
  const telegramId = await getTelegramIdFromRequest(req);

  if (!telegramId) {
    return apiError(res, 'Unauthorized', 401);
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
        return apiSuccess(res, null);
      }

      apiSuccess(res, result.rows[0]);
    } catch (err) {
      logger.error(err instanceof Error ? err.message : 'Unknown error');
      apiError(res, 'Failed to get comparison', 500);
    }
  } else if (req.method === 'POST') {
    const { product_ids, note } = req.body;

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return apiError(res, 'product_ids must be a non-empty array', 400);
    }

    if (product_ids.length > 4) {
      return apiError(res, 'Maximum 4 products allowed', 400);
    }

    try {
      // Проверяем существование всех товаров
      const productsCheck = await query(
        `SELECT COUNT(*) as cnt FROM products WHERE id = ANY($1) AND is_active = true`,
        [product_ids]
      );

      // HIGH-026 FIX: cnt из pg может быть string, нужно преобразовать
      if (parseInt(productsCheck.rows[0].cnt, 10) !== product_ids.length) {
        return apiError(res, 'One or more products not found', 404);
      }

      // Сохраняем сравнение в транзакции
      const result = await transaction(async (client) => {
        return await client.query(
          `INSERT INTO product_comparisons (user_telegram_id, product_ids, note)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [telegramId, product_ids, note || null]
        );
      });

      apiSuccess(res, { id: result.rows[0]?.id }, 201);
    } catch (_err) {
      logger.error(_err instanceof Error ? _err.message : 'Unknown error');
      apiError(res, 'Failed to save comparison', 500);
    }
  } else if (req.method === 'DELETE') {
    try {
      await transaction(async (client) => {
        await client.query(`DELETE FROM product_comparisons WHERE user_telegram_id = $1`, [telegramId]);
      });

      apiSuccess(res, { success: true });
    } catch (_err) {
      logger.error(_err instanceof Error ? _err.message : 'Unknown error');
      apiError(res, 'Failed to delete comparison', 500);
    }
  } else {
    apiError(res, 'Method not allowed', 405);
  }
}

export default requireAuth(compareHandler, ['customer']);