import { requireAuth } from '../../../../lib/auth';
import { query } from '../../../../lib/db';
import { apiSuccess, apiError } from '../../../../lib/apiResponse';
import { logger } from '@/lib/logger';

export default requireAuth(
  async (req, res) => {
    let { id } = req.query;
    
    // Валидация id
    id = Array.isArray(id) ? id[0] : id;
    if (!id) {
      return apiError(res, 'Invalid order ID', 400);
    }

    if (req.method !== 'GET') {
      return apiError(res, 'Method not allowed', 405);
    }

    try {
      // ⚠️ ОПТИМИЗАЦИЯ: SELECT нужные поля вместо SELECT *
      const orderResult = await query(
        `SELECT id, status, courier_id, expected_delivery_date, 
                delivery_type, total_amount, delivery_address, created_at 
         FROM orders WHERE id = $1`,
        [id]
      );

      if (orderResult.rows.length === 0) {
        return apiError(res, 'Order not found', 404);
      }

      const order = orderResult.rows[0];

      // ⚠️ ОПТИМИЗАЦИЯ: SELECT конкретные поля
      const statusHistory = await query(
        `SELECT id, order_id, old_status, new_status, note, changed_at 
         FROM order_status_history WHERE order_id = $1 ORDER BY changed_at ASC`,
        [id]
      );

      const courierInfo = order.courier_id
        ? await query(
            'SELECT telegram_id, first_name, last_name FROM users WHERE telegram_id = $1',
            [order.courier_id]
          )
        : null;

      return apiSuccess(res, {
        status: order.status,
        status_history: statusHistory.rows,
        expected_delivery: order.expected_delivery_date,
        delivery_method: order.delivery_type,
        total_amount: order.total_amount,
        courier_info: courierInfo?.rows[0] || null,
        delivery_address: order.delivery_address,
        created_at: order.created_at,
      }, 200);
    } catch (err) {
      logger.error('Error fetching tracking:', err);
      return apiError(res, 'Internal Server Error', 500);
    }
  },
  ['customer', 'manager', 'admin']
);
