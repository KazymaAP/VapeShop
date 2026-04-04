import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth, getTelegramId } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = getTelegramId(req);

  try {
    // Получить все товары, которые купил пользователь
    const userOrdersResult = await query(
      `SELECT DISTINCT oi.product_id 
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = $1
       LIMIT 5`,
      [userId]
    );

    if (userOrdersResult.rows.length === 0) {
      return res.status(200).json({ data: [] });
    }

    const productIds = userOrdersResult.rows.map(r => r.product_id);

    // Рекомендации: товары, которые покупали люди, купившие те же товары
    const recommendedResult = await query(
      `SELECT DISTINCT p.id, p.name, p.price, p.images, COUNT(*) as popularity
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.product_id != ANY($1::int[])
       AND EXISTS (
         SELECT 1 FROM order_items oi2
         WHERE oi2.order_id = oi.order_id
         AND oi2.product_id = ANY($1::int[])
       )
       GROUP BY p.id
       ORDER BY popularity DESC
       LIMIT 6`,
      [productIds]
    );

    res.status(200).json({ data: recommendedResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
}

export default requireAuth(handler, ['customer']);

