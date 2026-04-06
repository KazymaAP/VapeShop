import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../lib/db';
import { requireAuth } from '../../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const customerId = req.query.id as string;

  try {
    const customerResult = await query('SELECT * FROM users WHERE telegram_id = $1', [customerId]);

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const ordersResult = await query(
      'SELECT * FROM orders WHERE user_telegram_id = $1 ORDER BY created_at DESC',
      [customerId]
    );

    res.status(200).json({
      customer: customerResult.rows[0],
      orders: ordersResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
}

export default requireAuth(handler, ['support', 'admin', 'super_admin']);
