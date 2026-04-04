/**
 * API для уведомлений о низком остатке товара
 * GET /api/admin/low-stock - получить товары с низким остатком
 * POST /api/admin/low-stock/notify - отправить уведомления
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth, getTelegramId } from '@/lib/auth';
import { ApiResponse } from '@/types/api';
import { getBot } from '@/lib/notifications';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { threshold = 10 } = req.query;

    // Получаем товары с низким остатком
    const result = await query(
      `SELECT 
        id,
        name,
        stock as current_stock,
        COALESCE(min_stock_level, 10) as min_stock_level,
        COALESCE(stock_alert_sent, false) as stock_alert_sent
       FROM products
       WHERE is_active = true
       AND stock <= COALESCE(min_stock_level, $1)
       ORDER BY stock ASC`,
      [threshold]
    );

    return res.status(200).json({
      data: result.rows,
      count: result.rows.length,
      threshold,
    });

  } catch (err) {
    console.error('GET /api/admin/low-stock error:', err);
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const telegram_id = getTelegramId(req);

    const { productIds = [] } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'productIds array required' });
    }

    try {
      const bot = getBot();

      // Получаем все админов
      const admins = await query(
        `SELECT DISTINCT telegram_id FROM users WHERE role IN ('admin', 'manager')`
      );

      // Получаем информацию о товарах
      const products = await query(
        `SELECT id, name, stock FROM products WHERE id = ANY($1::uuid[])`,
        [productIds]
      );

      // Отправляем уведомления
      for (const admin of admins.rows) {
        const message = `🚨 Низкий остаток товаров:\n\n${products.rows
          .map(p => `• ${p.name}: ${p.stock} шт.`)
          .join('\n')}\n\nПроверьте инвентарь.`;

        try {
          await bot.api.sendMessage(admin.telegram_id, message);
        } catch (err) {
          console.error(`Failed to send notification to ${admin.telegram_id}:`, err);
        }
      }

      // Обновляем флаг stock_alert_sent
      await query(
        `UPDATE products SET stock_alert_sent = true WHERE id = ANY($1::uuid[])`,
        [productIds]
      );

      // Логируем
      await query(
        `INSERT INTO audit_log (user_telegram_id, action, details)
         VALUES ($1, 'notify_low_stock', $2)`,
        [telegram_id, JSON.stringify({ count: productIds.length, adminCount: admins.rows.length })]
      );

      return res.status(200).json({
        message: `Notifications sent to ${admins.rows.length} admins`,
        productsNotified: productIds.length,
      });

    } catch (err) {
      console.error('Bot notification error:', err);
      return res.status(500).json({ error: 'Failed to send notifications' });
    }

  } catch (err) {
    console.error('POST /api/admin/low-stock error:', err);
    res.status(500).json({ error: 'Failed to process low stock notification' });
  }
}

export default requireAuth(rateLimit(handler, RATE_LIMIT_PRESETS.normal), ['admin', 'manager']);
