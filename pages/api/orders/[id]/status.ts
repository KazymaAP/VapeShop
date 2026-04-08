import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../lib/db';
import { requireAuth, getTelegramId } from '../../../../lib/auth';
import { apiSuccess, apiError } from '../../../../lib/apiResponse';
import { logger } from '@/lib/logger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return apiError(res, 'Order ID is required', 400);
  }

  if (req.method === 'GET') {
    try {
      // Получить статус заказа
      const result = await query(
        `SELECT id, status, user_telegram_id, total_price, code_6digit
         FROM orders WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return apiError(res, 'Order not found', 404);
      }

      return apiSuccess(res, result.rows[0], 200);
    } catch (err) {
      logger.error('GET order status error:', err);
      return apiError(res, 'Ошибка получения статуса', 500);
    }
  } else if (req.method === 'PATCH') {
    try {
      const { status } = req.body;

      if (!status) {
        return apiError(res, 'Status is required', 400);
      }

      // Валидные статусы
      const validStatuses = ['pending', 'confirmed', 'readyship', 'shipped', 'done', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return apiError(res, 'Invalid status', 400);
      }

      // Получаем текущий заказ
      const orderResult = await query(
        `SELECT status, user_telegram_id, code_6digit FROM orders WHERE id = $1`,
        [id]
      );

      if (orderResult.rows.length === 0) {
        return apiError(res, 'Order not found', 404);
      }

      const order = orderResult.rows[0];
      const oldStatus = order.status;

      // Если статус тот же - ничего не делаем
      if (oldStatus === status) {
        return apiSuccess(res, { status_unchanged: true }, 200);
      }

      // Обновляем статус в БД
      await query(`UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`, [status, id]);

      // Логируем действие администратора
      const telegramId = getTelegramId(req);
      await query(
        `INSERT INTO audit_log (user_id, action, target_type, target_id, details, status) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          telegramId,
          'update_order_status',
          JSON.stringify({
            order_id: id,
            old_status: oldStatus,
            new_status: status,
          }),
        ]
      ).catch((err) => logger.error('Logging error:', err));

      // Отправляем уведомление покупателю
      // (убедитесь что bot инициализирован перед этим)
      try {
        // Динамический импорт чтобы избежать циклических зависимостей
        const { notifyBuyerOrderStatus: notifyStatus } =
          await import('../../../../lib/notifications');
        await notifyStatus(order.user_telegram_id, id, status, order.code_6digit);
      } catch (notifyErr) {
        logger.error('Notification error:', notifyErr);
        // Не падаем если уведомление не отправилось
      }

      return apiSuccess(
        res,
        {
          old_status: oldStatus,
          new_status: status,
        },
        200
      );
    } catch (err) {
      logger.error('PATCH order status error:', err);
      return apiError(res, 'Ошибка обновления статуса', 500);
    }
  } else {
    return apiError(res, 'Method not allowed', 405);
  }
}

// Защита: только admin и manager могут менять статусы
export default requireAuth(handler, ['admin', 'manager']);
