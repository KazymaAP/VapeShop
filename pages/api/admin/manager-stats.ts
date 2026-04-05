import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT u.id, u.first_name, u.last_name,
                COUNT(o.id) as orders_processed,
                AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at))/60)::INT as average_time,
                AVG(COALESCE(o.manager_rating, 5)) as satisfaction
         FROM users u
         LEFT JOIN orders o ON u.id = o.manager_id AND o.status IN ('completed', 'cancelled')
         WHERE u.role = 'manager'
         GROUP BY u.id
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


