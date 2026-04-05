import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../lib/db';
import { requireAuth } from '../../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ticketId = req.query.ticketId as string;

  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT st.*, u.first_name as customer_name
         FROM support_tickets st
         JOIN users u ON st.user_id = u.id
         WHERE st.id = $1`,
        [ticketId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      res.status(200).json({ data: result.rows[0] });
    } catch {
      res.status(500).json({ error: 'Failed to fetch ticket' });
    }
  } else if (req.method === 'PATCH') {
    const { status } = req.body;

    try {
      await query(
        'UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, ticketId]
      );
      res.status(200).json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to update ticket' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['support', 'admin', 'super_admin', 'customer']);
