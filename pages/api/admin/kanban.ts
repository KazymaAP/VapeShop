import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth, getTelegramId } from '@/lib/auth';
import { logger } from '@/lib/logger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = getTelegramId(req);

  if (req.method === 'GET') {
    try {
      // Оптимизация: один запрос вместо 6, затем группируем в памяти
      const result = await query(
        `SELECT 
          o.id, 
          o.order_number, 
          o.total, 
          o.status, 
          o.created_at,
          u.first_name, 
          u.phone,
          json_agg(
            json_build_object('name', oi.product_id, 'qty', oi.quantity)
          ) FILTER (WHERE oi.id IS NOT NULL) as items
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.order_id
         LEFT JOIN users u ON o.user_telegram_id = u.telegram_id
         WHERE (o.manager_id = $1 OR $1::bigint IS NULL)
         GROUP BY o.id, o.order_number, o.total, o.status, o.created_at, u.first_name, u.phone
         ORDER BY o.status ASC, o.created_at DESC`,
        [userId]
      );

      // Группируем по статусам в памяти приложения
      const statuses = [
        'pending',
        'confirmed',
        'in_progress',
        'ready_for_pickup',
        'on_delivery',
        'completed',
      ];
      const orders: Record<string, Array<Record<string, unknown>>> = {};

      statuses.forEach((status) => {
        orders[status] = [];
      });

      result.rows.forEach((order) => {
        const status = order.status || 'pending';
        if (orders[status]) {
          orders[status].push(order);
        }
      });

      res.status(200).json({ data: orders });
    } catch (err) {
      console.error('kanban error:', err);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  } else if (req.method === 'PUT') {
    const { orderId, newStatus, notes } = req.body;

    // Валидация статуса - предотвращаем SQL injection
    const VALID_STATUSES = [
      'pending',
      'confirmed',
      'in_progress',
      'ready_for_pickup',
      'on_delivery',
      'completed',
      'cancelled',
    ];

    if (!VALID_STATUSES.includes(newStatus)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    try {
      await query(
        'UPDATE orders SET status = $1, manager_id = $2, manager_notes = $3, updated_at = NOW() WHERE id = $4',
        [newStatus, userId, notes || '', orderId]
      );

      res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Kanban update error', error);
      res.status(500).json({ error: 'Failed to update order' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['manager', 'admin', 'super_admin']);
