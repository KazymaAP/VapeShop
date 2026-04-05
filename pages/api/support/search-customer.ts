import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export default requireAuth(async (req, res) => {
  if (req.method === 'GET') {
    try {
      const { phone, telegram_id, order_id } = req.query;

      let whereClause = '1=1';
      const params: (string | number)[] = [];
      let paramCount = 1;

      if (phone) {
        whereClause += ` AND users.phone = $${paramCount}`;
        params.push(phone);
        paramCount++;
      }

      if (telegram_id) {
        whereClause += ` AND users.telegram_id = $${paramCount}`;
        params.push(telegram_id);
        paramCount++;
      }

      if (order_id) {
        whereClause += ` AND orders.id = $${paramCount}`;
        params.push(order_id);
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

      res.status(200).json({ data: result.rows });
    } catch (err) {
      console.error('Error searching customer:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}, ['support', 'admin']);

