import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export default requireAuth(async (req, res) => {
  const telegramId = req.headers['x-telegram-id'] as string;

  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT cd.*, o.delivery_address, o.total_amount, u.first_name, u.last_name, u.phone
         FROM courier_deliveries cd
         JOIN orders o ON cd.order_id = o.id
         LEFT JOIN users u ON o.user_id = u.telegram_id
         WHERE cd.courier_id = $1 AND cd.status IN ('assigned', 'in_progress')
         ORDER BY cd.assigned_at ASC`,
        [telegramId]
      );
      res.status(200).json({ data: result.rows });
    } catch (err) {
      console.error('Error fetching deliveries:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}, ['courier', 'admin']);

