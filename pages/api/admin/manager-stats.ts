import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT u.telegram_id as id, u.first_name, u.last_name,
                COUNT(o.id) as orders_processed,
                AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at))/60)::INT as average_time
         FROM users u
         LEFT JOIN orders o ON u.telegram_id = o.user_telegram_id AND o.status != 'cancelled'
         WHERE u.role = 'manager'
         GROUP BY u.telegram_id, u.first_name, u.last_name
         ORDER BY orders_processed DESC`,
        []
      );
      res.status(200).json({ data: result.rows });
    } catch {
      res.status(500).json({ error: 'Failed to fetch manager stats' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['admin', 'super_admin']);
