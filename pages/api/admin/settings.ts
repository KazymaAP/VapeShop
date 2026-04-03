import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';
import { requireAuth } from '../../../lib/auth';

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

      if (event_type !== undefined && is_enabled !== undefined) {
        await query(
          `INSERT INTO notification_settings (event_type, is_enabled)
           VALUES ($1, $2)
           ON CONFLICT (event_type) DO UPDATE SET is_enabled = $2`,
          [event_type, is_enabled]
        );
      }

      if (min_stock !== undefined) {
        await query(
          `INSERT INTO settings (key, value) VALUES ('min_stock_alert', $1)
           ON CONFLICT (key) DO UPDATE SET value = $1`,
          [min_stock]
        );
      }

      res.status(200).json({ success: true });
    } catch {
      res.status(500).json({ error: 'Ошибка обновления настроек' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { action } = req.body;

      if (action === 'clear_abandoned_carts') {
        await query('DELETE FROM abandoned_carts');
      } else if (action === 'clear_admin_logs') {
        await query('DELETE FROM admin_logs');
      } else {
        return res.status(400).json({ error: 'Invalid action' });
      }

      res.status(200).json({ success: true });
    } catch {
      res.status(500).json({ error: 'Ошибка выполнения действия' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['admin']);
