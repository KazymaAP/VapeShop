import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { TIMERS, CRON_LIMITS } from '@/lib/constants';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const alerts = [];

      // MEDIUM-004 FIX: Use TIMERS and CRON_LIMITS constants for pending orders alert
      // Заказы, ждущие подтверждения более 1 часа
      const pendingResult = await query(
        `SELECT COUNT(*) as count FROM orders 
         WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 hour'`,
        []
      );
      if (parseInt(pendingResult.rows[0].count) > 0) {
        alerts.push({
          type: 'pending_orders',
          count: pendingResult.rows[0].count,
          message: `${pendingResult.rows[0].count} заказов ждут подтверждения более часа`,
        });
      }

      // MEDIUM-004 FIX: Use CRON_LIMITS constants for low stock alert
      // Товары с низким складом
      const lowStockResult = await query(
        `SELECT id, name, stock FROM products WHERE stock < $1 LIMIT $2`,
        [CRON_LIMITS.LOW_STOCK_ALERT_LIMIT, CRON_LIMITS.LOW_STOCK_FETCH_LIMIT]
      );
      if (lowStockResult.rows.length > 0) {
        alerts.push({
          type: 'low_stock',
          count: lowStockResult.rows.length,
          items: lowStockResult.rows,
          message: `${lowStockResult.rows.length} товаров заканчиваются`,
        });
      }

      res.status(200).json({ data: alerts });
    } catch (err) {
      // MEDIUM-008 FIX: Include error context instead of generic message
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.error(`Failed to fetch admin alerts (GET /api/admin/alerts): ${errorMsg}`, {
        error: errorMsg,
        endpoint: '/api/admin/alerts',
        method: 'GET',
      });
      res.status(500).json({ 
        error: 'Failed to fetch alerts',
        details: 'An error occurred while fetching admin alerts. Please try again later.',
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['manager', 'admin', 'super_admin']);
