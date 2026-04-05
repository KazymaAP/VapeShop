import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../lib/db';
import { requireAuth, getTelegramId } from '../../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Order ID is required' });
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
        return res.status(404).json({ error: 'Order not found' });
      }

      res.status(200).json({ order: result.rows[0] });
    } catch (err) {
      console.error('GET order status error:', err);
      res.status(500).json({ error: 'Ошибка получения статуса' });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      // Валидные статусы
      const validStatuses = ['pending', 'confirmed', 'readyship', 'shipped', 'done', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      // Получаем текущий заказ
      const orderResult = await query(
        `SELECT status, user_telegram_id, code_6digit FROM orders WHERE id = $1`,
        [id]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orderResult.rows[0];
      const oldStatus = order.status;

      // Если статус тот же - ничего не делаем
      if (oldStatus === status) {
        return res.status(200).json({ success: true, message: 'Status unchanged' });
      }

      // Обновляем статус в БД
      await query(`UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`, [status, id]);

      // Логируем действие администратора
      const telegramId = getTelegramId(req);
      await query(
        `INSERT INTO admin_logs (user_telegram_id, action, details) VALUES ($1, $2, $3)`,
        [
          telegramId,
          'update_order_status',
          JSON.stringify({
            order_id: id,
            old_status: oldStatus,
            new_status: status,
          }),
        ]
      ).catch((err) => console.error('Logging error:', err));

      // Отправляем уведомление покупателю
      // (убедитесь что bot инициализирован перед этим)
      try {
        // Динамический импорт чтобы избежать циклических зависимостей
        const { notifyBuyerOrderStatus: notifyStatus } =
          await import('../../../../lib/notifications');
        await notifyStatus(order.user_telegram_id, id, status, order.code_6digit);
      } catch (notifyErr) {
        console.error('Notification error:', notifyErr);
        // Не падаем если уведомление не отправилось
      }

      res.status(200).json({
        success: true,
        message: `Статус заказа изменён на ${status}`,
        old_status: oldStatus,
        new_status: status,
      });
    } catch (err) {
      console.error('PATCH order status error:', err);
      res.status(500).json({ error: 'Ошибка обновления статуса' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Защита: только admin и manager могут менять статусы
export default requireAuth(handler, ['admin', 'manager']);
