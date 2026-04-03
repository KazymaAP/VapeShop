import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../../lib/db';
import { requireAuth } from '../../../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { text } = req.body;
    const ticketId = req.query.ticketId as string;
    const userId = req.headers['x-telegram-id'] as string;

    try {
      await query(
        'INSERT INTO support_ticket_replies (ticket_id, user_id, reply_text) VALUES ($1, $2, $3)',
        [ticketId, userId, text]
      );
      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to send reply' });
    }
  } else if (req.method === 'GET') {
    const ticketId = req.query.ticketId as string;

    try {
      const result = await query(
        'SELECT * FROM support_ticket_replies WHERE ticket_id = $1 ORDER BY created_at ASC',
        [ticketId]
      );
      res.status(200).json({ data: result.rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch replies' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['support', 'admin', 'super_admin', 'customer']);
