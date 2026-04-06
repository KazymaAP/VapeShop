import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../lib/db';
import { requireAuth } from '../../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const orderId = req.query.id as string;

  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT o.id, o.status, o.updated_at, u.first_name as changed_by,
                o.manager_notes, o.delivery_method
         FROM orders o
         LEFT JOIN users u ON o.user_telegram_id = u.telegram_id
         WHERE o.id = $1
         ORDER BY o.updated_at DESC`,
        [orderId]
      );
      res.status(200).json({ data: result.rows });
    } catch {
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['manager', 'admin', 'super_admin', 'customer']);
