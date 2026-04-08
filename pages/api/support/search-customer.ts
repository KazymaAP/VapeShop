import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export default requireAuth(
  async (req, res) => {
    if (req.method === 'GET') {
      try {
        const { phone, telegram_id, order_id } = req.query;

        let whereClause = '1=1';
        const params: (string | number)[] = [];
        let paramCount = 1;

        if (phone) {
          whereClause += ` AND users.phone = $${paramCount}`;
          params.push(typeof phone === 'string' ? phone : phone[0]);
          paramCount++;
        }

        if (telegram_id) {
          whereClause += ` AND users.telegram_id = $${paramCount}`;
          const telegramIdStr = typeof telegram_id === 'string' ? telegram_id : telegram_id[0];
          params.push(isNaN(Number(telegramIdStr)) ? telegramIdStr : Number(telegramIdStr));
          paramCount++;
        }

        if (order_id) {
          whereClause += ` AND orders.id = $${paramCount}`;
          params.push(typeof order_id === 'string' ? order_id : order_id[0]);
          paramCount++;
        }

        const result = await query(
          `SELECT DISTINCT users.*, COUNT(orders.id) as order_count
         FROM users
         LEFT JOIN orders ON users.telegram_id = orders.user_id
         WHERE ${whereClause}
         GROUP BY users.telegram_id`,
          params
        );

        res.status(200).json({ success: true, data: result.rows, timestamp: Date.now() });
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : 'Internal Server Error';
        res.status(500).json({ success: false, error, timestamp: Date.now() });
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  },
  ['support', 'admin']
);
