import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getTelegramId } from '@/lib/auth';
import { validatePagination } from '@/lib/validate';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Валидация пагинации
      const page = parseInt((req.query.page as string) || '1');
      const limit = Math.min(parseInt((req.query.limit as string) || '20'), 100);

      const validationErrors = validatePagination(page, limit);
      if (validationErrors.length > 0) {
        return res.status(400).json({ error: 'Invalid pagination', details: validationErrors });
      }

      const offset = (page - 1) * limit;

      // Логируем действие админа
      const adminTelegramId = getTelegramId(req);
      await query(
        `INSERT INTO audit_log (user_telegram_id, action, table_name, details)
         VALUES ($1, $2, $3, $4)`,
        [adminTelegramId, 'VIEW_ORDERS', 'orders', JSON.stringify({ page, limit })]
      ).catch(() => {}); // Игнорируем ошибки логирования

      // ⚠️ ОПТИМИЗАЦИЯ: Используем JSON агрегацию вместо N+1 запросов
      const result = await query(
        `
        SELECT 
          o.id,
          o.user_telegram_id,
          o.status,
          o.total_price,
          o.delivery_address,
          o.delivery_type,
          o.manager_note,
          o.created_at,
          o.updated_at,
          u.first_name as user_name,
          u.username,
          json_agg(json_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'quantity', oi.quantity,
            'price', oi.price,
            'name', p.name
          )) FILTER (WHERE oi.id IS NOT NULL) as items,
          json_agg(json_build_object(
            'old_status', oh.old_status,
            'new_status', oh.new_status,
            'created_at', oh.created_at,
            'note', oh.note
          ) ORDER BY oh.created_at DESC) FILTER (WHERE oh.id IS NOT NULL) as history
        FROM orders o
        LEFT JOIN users u ON o.user_telegram_id = u.telegram_id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN order_history oh ON o.id = oh.order_id
        GROUP BY o.id, u.first_name, u.username
        ORDER BY o.created_at DESC
        LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      );

      // Получаем общее количество
      const countResult = await query('SELECT COUNT(*) as total FROM orders');
      const total = parseInt(countResult.rows[0].total);

      const response = {
        success: true,
        data: {
          orders: result.rows,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
        timestamp: Date.now(),
      };

      res.status(200).json(response);
    } catch (_err) {
      console.error('Error loading orders:', _err);
      res.status(500).json({ error: 'Ошибка загрузки заказов' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, status, manager_note } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Order ID required' });
      }

      // Обновление примечания менеджера
      if (manager_note !== undefined) {
        await query('UPDATE orders SET manager_note = $1, updated_at = NOW() WHERE id = $2', [manager_note, id]);
        
        // Логируем
        const adminTelegramId = getTelegramId(req);
        await query(
          `INSERT INTO audit_log (user_telegram_id, action, table_name, details)
           VALUES ($1, $2, $3, $4)`,
          [adminTelegramId, 'UPDATE_ORDER_NOTE', 'orders', JSON.stringify({ order_id: id })]
        ).catch(() => {});

        return res.status(200).json({ success: true });
      }

      if (!status) {
        return res.status(400).json({ error: 'Status required' });
      }

      // Получаем старый статус
      const oldOrder = await query('SELECT status, user_telegram_id, total_price FROM orders WHERE id = $1', [id]);
      if (oldOrder.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const oldStatus = oldOrder.rows[0].status;
      const userTelegramId = oldOrder.rows[0].user_telegram_id;

      // Обновляем статус
      await query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);

      // Логируем в история заказа
      const adminTelegramId = getTelegramId(req);
      await query(
        `INSERT INTO order_history (order_id, user_telegram_id, old_status, new_status)
         VALUES ($1, $2, $3, $4)`,
        [id, adminTelegramId || null, oldStatus, status]
      );

      // Логируем в audit_log
      await query(
        `INSERT INTO audit_log (user_telegram_id, action, table_name, details)
         VALUES ($1, $2, $3, $4)`,
        [adminTelegramId, 'UPDATE_ORDER_STATUS', 'orders', JSON.stringify({ order_id: id, old_status: oldStatus, new_status: status })]
      ).catch(() => {});

      // Отправляем уведомление пользователю (опционально)
      if (userTelegramId) {
        // TODO: отправить через bot.api.sendMessage()
        // Требует инициализации бота
      }

      res.status(200).json({ success: true, old_status: oldStatus, new_status: status });
    } catch (_err) {
      console.error('Error updating order:', _err);
      res.status(500).json({ error: 'Ошибка обновления заказа' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(rateLimit(handler, RATE_LIMIT_PRESETS.normal), ['admin', 'manager']);

