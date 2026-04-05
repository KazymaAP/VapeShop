import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { telegram_id } = req.query;

    if (!telegram_id) {
      return res.status(400).json({ error: 'telegram_id required' });
    }

    const ordersRes = await query(
      `SELECT o.*, json_agg(json_build_object(
         'product_id', oi.product_id,
         'name', p.name,
         'quantity', oi.quantity,
         'price', oi.price
       ) ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE o.user_telegram_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [telegram_id]
    );

    const orders = ordersRes.rows.map((order) => ({
      ...order,
      total: parseFloat(order.total),
      items: order.items.filter((i: { product_id: string | null }) => i.product_id !== null),
    }));

    res.status(200).json({ orders });
  } catch {
    res.status(500).json({ error: 'Ошибка загрузки заказов' });
  }
}


