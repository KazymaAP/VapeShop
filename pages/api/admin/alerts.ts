import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {

  if (req.method === 'GET') {
    try {
      const alerts = [];

      // Заказы, ждущие подтверждения более 1 часа
      const pendingResult = await query(
        `SELECT COUNT(*) as count FROM orders 
         WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 hour'`,
        []
      );
      if (parseInt(pendingResult.rows[0].count) > 0) {
        alerts.push({
          type: 'pending_orders',
          count: pendingResult.rows[0].count,
          message: `${pendingResult.rows[0].count} заказов ждут подтверждения более часа`
        });
      }

      // Товары с низким складом
      const lowStockResult = await query(
        `SELECT id, name, stock FROM products WHERE stock < 5 LIMIT 5`,
        []
      );
      if (lowStockResult.rows.length > 0) {
        alerts.push({
          type: 'low_stock',
          count: lowStockResult.rows.length,
          items: lowStockResult.rows,
          message: `${lowStockResult.rows.length} товаров заканчиваются`
        });
      }

      res.status(200).json({ data: alerts });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['manager', 'admin', 'super_admin']);

