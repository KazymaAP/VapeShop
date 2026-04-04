import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const [revenueRes, ordersRes, usersRes, lowStockRes] = await Promise.all([
        query("SELECT COALESCE(SUM(total), 0) as revenue FROM orders WHERE status != 'cancelled' AND created_at >= NOW() - INTERVAL '30 days'"),
        query("SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '30 days'"),
        query('SELECT COUNT(*) FROM users'),
        query('SELECT COUNT(*) FROM products WHERE stock < 5 AND is_active = true'),
      ]);

      res.status(200).json({
        revenue: parseFloat(revenueRes.rows[0].revenue),
        orders: parseInt(ordersRes.rows[0].count, 10),
        users: parseInt(usersRes.rows[0].count, 10),
        lowStock: parseInt(lowStockRes.rows[0].count, 10),
      });
    } catch {
      res.status(200).json({ revenue: 0, orders: 0, users: 0, lowStock: 0 });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['admin']);

