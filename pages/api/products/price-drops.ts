import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth, getTelegramId } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/apiResponse';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = getTelegramId(req);

  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT DISTINCT w.product_id, p.name, p.price, p.old_price
         FROM wishlist w
         JOIN products p ON w.product_id = p.id
         WHERE w.user_telegram_id = $1 AND w.notify_on_discount = TRUE
         AND (p.old_price > p.price OR p.price < (SELECT AVG(price) FROM products))`,
        [userId]
      );
      return apiSuccess(res, result.rows, 200);
    } catch {
      return apiError(res, 'Failed to fetch discounts', 500);
    }
  } else if (req.method === 'POST') {
    const { productId, enabled } = req.body;

    try {
      await query(
        'UPDATE wishlist SET notify_on_discount = $1 WHERE user_telegram_id = $2 AND product_id = $3',
        [enabled, userId, productId]
      );
      return apiSuccess(res, { notification_updated: true }, 200);
    } catch {
      return apiError(res, 'Failed to update notification', 500);
    }
  } else {
    return apiError(res, 'Method not allowed', 405);
  }
}

export default requireAuth(handler, ['customer']);
