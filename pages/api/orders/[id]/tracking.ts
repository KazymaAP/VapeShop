import { requireAuth } from '../../../../lib/auth';
import { query } from '../../../../lib/db';

export default requireAuth(
  async (req, res) => {
    const { id } = req.query;

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const orderResult = await query('SELECT * FROM orders WHERE id = $1', [id]);

      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orderResult.rows[0];

      const statusHistory = await query(
        'SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY changed_at ASC',
        [id]
      );

      const courierInfo = order.courier_id
        ? await query(
            'SELECT telegram_id, first_name, last_name FROM users WHERE telegram_id = $1',
            [order.courier_id]
          )
        : null;

      res.status(200).json({
        data: {
          status: order.status,
          status_history: statusHistory.rows,
          expected_delivery: order.expected_delivery_date,
          delivery_method: order.delivery_type,
          total_amount: order.total_amount,
          courier_info: courierInfo?.rows[0] || null,
          delivery_address: order.delivery_address,
          created_at: order.created_at,
        },
      });
    } catch (err) {
      console.error('Error fetching tracking:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
  ['customer', 'manager', 'admin']
);
