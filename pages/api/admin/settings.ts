import type { NextApiRequest, NextApiResponse } from 'next';
import { query, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const [settingsRes, minStockRes] = await Promise.all([
        query('SELECT * FROM notification_settings ORDER BY event_type'),
        query("SELECT value FROM settings WHERE key = 'min_stock_alert'"),
      ]);

      res.status(200).json({
        settings: settingsRes.rows,
        min_stock: minStockRes.rows[0]?.value || 5,
      });
    } catch {
      res.status(200).json({ settings: [], min_stock: 5 });
    }
  } else if (req.method === 'PUT') {
    try {
      const { event_type, is_enabled, min_stock } = req.body;

      await transaction(async (client) => {
        if (event_type !== undefined && is_enabled !== undefined) {
          await client.query(
            `INSERT INTO notification_settings (event_type, is_enabled)
             VALUES ($1, $2)
             ON CONFLICT (event_type) DO UPDATE SET is_enabled = $2`,
            [event_type, is_enabled]
          );
        }

        if (min_stock !== undefined) {
          await client.query(
            `INSERT INTO settings (key, value) VALUES ('min_stock_alert', $1)
             ON CONFLICT (key) DO UPDATE SET value = $1`,
            [min_stock]
          );
        }
      });

      res.status(200).json({ success: true });
    } catch {
      res.status(500).json({ error: 'Ошибка обновления настроек' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { action } = req.body;

      // Требуем явное подтверждение через дополнительный параметр для безопасности
      const confirmToken = req.body.confirmToken;
      if (!confirmToken || confirmToken !== `${action}_confirmed_${new Date().toDateString()}`) {
        return res.status(400).json({
          error: 'Требуется подтверждение. Передайте confirmToken для подтверждения удаления.',
        });
      }

      await transaction(async (client) => {
        if (action === 'clear_abandoned_carts') {
          // Добавляем WHERE условие - удаляем только заказы старше 7 дней (не используемые)
          await client.query("DELETE FROM abandoned_carts WHERE created_at < NOW() - INTERVAL '7 days'", []);
        } else if (action === 'clear_admin_logs') {
          // Добавляем WHERE условие - удаляем только логи старше 90 дней
          await client.query("DELETE FROM admin_logs WHERE created_at < NOW() - INTERVAL '90 days'", []);
        } else {
          throw new Error('Invalid action: unknown settings operation');
        }
      });

      // Логируем это действие как критическое
      logger.warn(`[ADMIN ACTION] ${action} executed by admin`);

      res.status(200).json({ success: true, message: `${action} completed successfully` });
    } catch (err) {
      logger.error('Error in DELETE handler:', err);
      res.status(500).json({ error: 'Ошибка выполнения действия' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['admin']);
