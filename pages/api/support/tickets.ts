import { requireAuth, getTelegramId } from '@/lib/auth';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

export default requireAuth(
  async (req, res) => {
    if (req.method === 'GET') {
      try {
        const { status, user_id } = req.query;

        let whereClause = '1=1';
        const params: (string | number)[] = [];
        let paramCount = 1;

        if (status) {
          whereClause += ` AND status = $${paramCount}`;
          params.push(typeof status === 'string' ? status : status[0]);
          paramCount++;
        }

        if (user_id) {
          whereClause += ` AND user_id = $${paramCount}`;
          const userIdStr = typeof user_id === 'string' ? user_id : user_id[0];
          params.push(isNaN(Number(userIdStr)) ? userIdStr : Number(userIdStr));
          paramCount++;
        }

        const result = await query(
          `SELECT id, user_id, subject, message, status, assigned_to, related_order_id, created_at, resolved_at FROM support_tickets WHERE ${whereClause} ORDER BY created_at DESC`,
          params
        );

        res.status(200).json({ success: true, data: result.rows, timestamp: Date.now() });
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : 'Internal Server Error';
        res.status(500).json({ success: false, error, timestamp: Date.now() });
      }
    } else if (req.method === 'POST') {
      try {
        const { subject, message, related_order_id } = req.body;
        const telegramId = getTelegramId(req);

        const result = await query(
          'INSERT INTO support_tickets (user_id, subject, message, related_order_id) VALUES ($1, $2, $3, $4) RETURNING *',
          [telegramId, subject, message, related_order_id]
        );

        res.status(201).json({ data: result.rows[0] });
      } catch (err) {
        logger.error('Error creating ticket:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  },
  ['support', 'customer', 'admin']
);
