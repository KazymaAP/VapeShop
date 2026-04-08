/**
 * Cron job для отправки уведомлений о снижении цены на избранные товары
 * GET /api/cron/price-drop-notifications
 * Должен вызваться раз в час через Vercel Crons
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getBot } from '@/lib/notifications';
import { logger } from '@/lib/logger';
import { verifyCronSecret } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only GET and POST methods allowed
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ⚠️ КРИТИЧНО: Проверяем CRON_SECRET с защитой от timing attacks
  if (!verifyCronSecret(req)) {
    logger.warn('Unauthorized CRON access attempt to price-drop-notifications');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    logger.info('Price drop notifications cron job started');
    // Находим товары, цена на которых упала на 10% или больше за последний час
    const priceDrops = await query(
      `SELECT 
         pdn.id,
         pdn.user_telegram_id,
         pdn.product_id,
         p.name,
         p.price,
         pdn.original_price,
         pdn.discount_percent
       FROM price_drop_notifications pdn
       JOIN products p ON pdn.product_id = p.id
       WHERE pdn.notified = false
       AND pdn.discount_percent >= 10
       AND pdn.created_at > NOW() - INTERVAL '1 hour'
       LIMIT 100`,
      []
    );

    let notified = 0;
    const bot = getBot();
    const notifiedIds: string[] = [];

    // HIGH-004 FIX: Send all messages in parallel (Promise.allSettled) instead of sequential
    const sendPromises = priceDrops.rows.map(async (drop) => {
      try {
        const message = `
💰 *Цена упала на избранный товар!*

📦 ${drop.name}
💵 Было: ${drop.original_price}₽
💰 Теперь: ${drop.price}₽
⬇️ Скидка: ${drop.discount_percent}%

[Посмотреть товар](https://your-app.com/product/${drop.product_id})
        `.trim();

        // Отправляем уведомление в Telegram
        await bot.api.sendMessage(drop.user_telegram_id, message, {
          parse_mode: 'Markdown',
        });

        // Track successful notifications for batch update
        notifiedIds.push(drop.id);
        return true;
      } catch (err) {
        logger.error(`Failed to notify user ${drop.user_telegram_id}:`, err);
        return false;
      }
    });

    // Wait for all notifications to complete (parallel)
    const results = await Promise.allSettled(sendPromises);
    notified = results.filter(r => r.status === 'fulfilled' && r.value === true).length;

    // HIGH-004 FIX: Batch update only successful notifications (single query instead of N queries)
    if (notifiedIds.length > 0) {
      try {
        await query(
          `UPDATE price_drop_notifications 
           SET notified = true, notified_at = NOW() 
           WHERE id = ANY($1)`,
          [notifiedIds]
        );
      } catch (err) {
        logger.error('Failed to mark notifications as sent:', err);
        // Don't fail the request - notifications were sent, just couldn't mark them
      }
    }

    return res.status(200).json({
      message: `Notified ${notified} users about price drops`,
      count: notified,
    });
  } catch (err) {
    logger.error('Price drop notification error:', err);
    res.status(500).json({ error: 'Failed to process price drop notifications' });
  }
}
