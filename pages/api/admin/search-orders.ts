import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { q } = req.query;

    try {
      const result = await query(
        `SELECT DISTINCT o.id, o.order_number, o.total, o.status, o.created_at,
                u.first_name, u.phone,
                json_agg(
                  json_build_object('product_id', oi.product_id, 'qty', oi.quantity)
                ) FILTER (WHERE oi.id IS NOT NULL) as items
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         LEFT JOIN order_items oi ON o.id = oi.order_id
         WHERE o.order_number::text ILIKE $1
         OR u.first_name ILIKE $1
         OR u.phone ILIKE $1
         GROUP BY o.id, u.first_name, u.phone
         LIMIT 20`,
        [`%${q}%`]
      );
      res.status(200).json({ data: result.rows });
    } catch (err) {
      res.status(500).json({ error: 'Search failed' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['manager', 'admin', 'super_admin']);

