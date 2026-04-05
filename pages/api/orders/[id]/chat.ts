import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../lib/db';
import { requireAuth, getTelegramId } from '../../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { orderId, text } = req.body;
    const userId = getTelegramId(req);

    try {
      await query(
        'INSERT INTO chat_messages (order_id, user_id, message_text) VALUES ($1, $2, $3)',
        [orderId, userId, text]
      );
      res.status(200).json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to send message' });
    }
  } else if (req.method === 'GET') {
    const { orderId } = req.query;

    try {
      const result = await query(
        'SELECT * FROM chat_messages WHERE order_id = $1 ORDER BY created_at ASC',
        [orderId]
      );
      res.status(200).json({ data: result.rows });
    } catch {
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['customer', 'manager', 'admin', 'super_admin']);
