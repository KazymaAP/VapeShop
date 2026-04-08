import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../lib/db';
import { requireAuth, getTelegramId } from '../../../../lib/auth';
import { apiSuccess, apiError } from '../../../../lib/apiResponse';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { orderId, text } = req.body;
    const userId = getTelegramId(req);

    try {
      await query(
        'INSERT INTO chat_messages (order_id, user_id, message_text) VALUES ($1, $2, $3)',
        [orderId, userId, text]
      );
      return apiSuccess(res, { message_sent: true }, 200);
    } catch {
      return apiError(res, 'Failed to send message', 500);
    }
  } else if (req.method === 'GET') {
    let { orderId } = req.query;
    
    // Валидация orderId
    orderId = Array.isArray(orderId) ? orderId[0] : orderId;
    if (!orderId) {
      return apiError(res, 'Invalid order ID', 400);
    }

    try {
      const result = await query(
        'SELECT * FROM chat_messages WHERE order_id = $1 ORDER BY created_at ASC',
        [orderId]
      );
      return apiSuccess(res, result.rows, 200);
    } catch {
      return apiError(res, 'Failed to fetch messages', 500);
    }
  } else {
    return apiError(res, 'Method not allowed', 405);
  }
}

export default requireAuth(handler, ['customer', 'manager', 'admin', 'super_admin']);
