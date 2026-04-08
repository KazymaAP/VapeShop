import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../lib/db';
import { requireAuth } from '../../../../lib/auth';
import { apiSuccess, apiError } from '../../../../lib/apiResponse';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const orderId = req.query.id as string;

  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT o.id, o.status, o.updated_at, u.first_name as changed_by,
                o.manager_notes, o.delivery_method
         FROM orders o
         LEFT JOIN users u ON o.user_telegram_id = u.telegram_id
         WHERE o.id = $1
         ORDER BY o.updated_at DESC`,
        [orderId]
      );
      return apiSuccess(res, result.rows, 200);
    } catch {
      return apiError(res, 'Failed to fetch history', 500);
    }
  } else {
    return apiError(res, 'Method not allowed', 405);
  }
}

export default requireAuth(handler, ['manager', 'admin', 'super_admin', 'customer']);
