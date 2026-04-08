import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getTelegramIdFromRequest } from '@/lib/auth';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { apiSuccess, apiError } from '@/lib/apiResponse';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return apiError(res, 'Method not allowed', 405);
  }

  try {
    // ⚠️ SECURITY: Получаем и верифицируем telegram_id из подписанных данных Telegram
    // Никогда не доверяем query параметрам без верификации!
    const telegramId = await getTelegramIdFromRequest(req);

    if (!telegramId) {
      return apiError(res, 'Unauthorized', 401);
    }

    const ordersRes = await query(
      `SELECT o.*, json_agg(json_build_object(
         'product_id', oi.product_id,
         'name', p.name,
         'quantity', oi.quantity,
         'price', oi.price
       ) ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE o.user_telegram_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [telegramId]
    );

    const orders = ordersRes.rows.map((order) => ({
      ...order,
      total: parseFloat(order.total),
      items: order.items.filter((i: { product_id: string | null }) => i.product_id !== null),
    }));

    return apiSuccess(res, { orders }, 200);
  } catch {
    return apiError(res, 'Ошибка загрузки заказов', 500);
  }
}

export default rateLimit(handler, RATE_LIMIT_PRESETS.normal);
