import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth, getTelegramId } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/apiResponse';
import { logger } from '@/lib/logger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return apiError(res, 'Method not allowed', 405);
  }

  const userId = getTelegramId(req);

  try {
    // Получить все товары, которые купил пользователь
    const userOrdersResult = await query(
      `SELECT DISTINCT oi.product_id 
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_telegram_id = $1
       LIMIT 5`,
      [userId]
    );

    if (userOrdersResult.rows.length === 0) {
      return apiSuccess(res, [], 200);
    }

    const productIds = userOrdersResult.rows.map((r) => r.product_id);

    // Рекомендации: товары, которые покупали люди, купившие те же товары
    const recommendedResult = await query(
      `SELECT DISTINCT p.id, p.name, p.price, p.images, COUNT(*) as popularity
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.product_id != ALL($1::uuid[])
       AND EXISTS (
         SELECT 1 FROM order_items oi2
         WHERE oi2.order_id = oi.order_id
         AND oi2.product_id = ANY($1::uuid[])
       )
       GROUP BY p.id, p.name, p.price, p.images
       ORDER BY popularity DESC
       LIMIT 6`,
      [productIds]
    );

    return apiSuccess(res, recommendedResult.rows, 200);
  } catch (err) {
    logger.error(err instanceof Error ? err.message : 'Unknown error');
    return apiError(res, 'Failed to fetch recommendations', 500);
  }
}

export default requireAuth(handler, ['customer']);
