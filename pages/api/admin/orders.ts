import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';
import { requireAuth } from '../../../lib/auth';
import { Bot } from 'grammy';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

const statusLabels: Record<string, string> = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  readyship: 'Готов к отправке',
  shipped: 'Отправлен',
  done: 'Выполнен',
  cancelled: 'Отменён',
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT o.*, u.first_name as user_name
         FROM orders o
         LEFT JOIN users u ON o.user_telegram_id = u.telegram_id
         ORDER BY o.created_at DESC`
      );

      const orders = await Promise.all(result.rows.map(async (order) => {
        const [historyRes, itemsRes] = await Promise.all([
          query(
            `SELECT old_status, new_status, created_at, note FROM order_history WHERE order_id = $1 ORDER BY created_at DESC`,
            [order.id]
          ),
          query(
            `SELECT oi.*, p.name FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1`,
            [order.id]
          ),
        ]);
        return { ...order, history: historyRes.rows, items: itemsRes.rows };
      }));

      res.status(200).json({ orders });
    } catch {
      res.status(500).json({ error: 'Ошибка загрузки заказов' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, status, telegram_id, manager_note } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Order ID required' });
      }

      if (manager_note !== undefined) {
        await query('UPDATE orders SET manager_note = $1 WHERE id = $2', [manager_note, id]);
        return res.status(200).json({ success: true });
      }

      if (!status) {
        return res.status(400).json({ error: 'Status required' });
      }

      const oldOrder = await query('SELECT status FROM orders WHERE id = $1', [id]);
      const oldStatus = oldOrder.rows[0]?.status;

      await query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);

      if (oldStatus) {
        await query(
          `INSERT INTO order_history (order_id, user_telegram_id, old_status, new_status, note)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, telegram_id || null, oldStatus, status, null]
        );

        const order = await query('SELECT user_telegram_id, total FROM orders WHERE id = $1', [id]);
        if (order.rows[0]?.user_telegram_id) {
          try {
            await bot.api.sendMessage(order.rows[0].user_telegram_id,
              `📦 Заказ #${id.slice(0, 8)}\nСтатус изменён: ${statusLabels[status] || status}\nСумма: ${parseFloat(order.rows[0].total).toLocaleString('ru-RU')} ₽`
            );
          } catch {
            // Bot notification is optional
          }
        }
      }

      res.status(200).json({ success: true });
    } catch {
      res.status(500).json({ error: 'Ошибка обновления заказа' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['admin', 'manager']);
