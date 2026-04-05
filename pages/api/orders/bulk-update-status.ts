import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth, getTelegramId } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { orderIds, newStatus, notes } = req.body;
    const userId = getTelegramId(req);

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Invalid order IDs' });
    }

    try {
      const placeholders = orderIds.map((_, i) => `$${i + 1}`).join(',');
      const updateQuery = `
        UPDATE orders 
        SET status = $${orderIds.length + 1}, 
            manager_id = $${orderIds.length + 2},
            manager_notes = COALESCE(manager_notes || ' | ', '') || $${orderIds.length + 3},
            updated_at = NOW()
        WHERE id = ANY(ARRAY[${placeholders}]::bigint[])
      `;

      await query(updateQuery, [...orderIds, newStatus, userId, notes || '']);

      res.status(200).json({ success: true, updated: orderIds.length });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update orders' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['manager', 'admin', 'super_admin']);
