/**
 * Cron job для отправки уведомлений о снижении цены на избранные товары
 * GET /api/cron/price-drop-notifications
 * Должен вызваться раз в час через Vercel Crons
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getBot } from '@/lib/notifications';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Проверяем CRON_SECRET для безопасности
  const cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
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

    for (const drop of priceDrops.rows) {
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

        // Отмечаем как отправлено
        await query(
          `UPDATE price_drop_notifications 
           SET notified = true, notified_at = NOW() 
           WHERE id = $1`,
          [drop.id]
        );

        notified++;
      } catch (err) {
        console.error(`Failed to notify user ${drop.user_telegram_id}:`, err);
      }
    }

    return res.status(200).json({
      message: `Notified ${notified} users about price drops`,
      count: notified,
    });
  } catch (err) {
    console.error('Price drop notification error:', err);
    res.status(500).json({ error: 'Failed to process price drop notifications' });
  }
}
