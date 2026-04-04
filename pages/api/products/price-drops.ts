import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = req.headers['x-telegram-id'] as string;

  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT DISTINCT w.product_id, p.name, p.price, p.old_price
         FROM wishlist w
         JOIN products p ON w.product_id = p.id
         WHERE w.user_id = $1 AND w.notify_on_discount = TRUE
         AND (p.old_price > p.price OR p.price < (SELECT AVG(price) FROM products WHERE category = p.category))`,
        [userId]
      );
      res.status(200).json({ data: result.rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch discounts' });
    }
  } else if (req.method === 'POST') {
    const { productId, enabled } = req.body;

    try {
      await query(
        'UPDATE wishlist SET notify_on_discount = $1 WHERE user_id = $2 AND product_id = $3',
        [enabled, userId, productId]
      );
      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update notification' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['customer']);

