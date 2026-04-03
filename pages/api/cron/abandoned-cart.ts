import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';
import { notifyAbandonedCart } from '../../../lib/notifications';

/**
 * Cron API для отправки напоминаний о брошенных корзинах
 * 
 * Использование:
 * - Vercel Cron: Добавить в vercel.json: "crons": [{ "path": "/api/cron/abandoned-cart", "schedule": "0 * * * *" }]
 * - Self-hosted: curl https://yourapp.com/api/cron/abandoned-cart?token=YOUR_CRON_TOKEN
 * 
 * Что это делает:
 * 1. Находит корзины, где последнее обновление было более 2 часов назад
 * 2. Проверяет, что у пользователя нет активных заказов за последние 2 часа
 * 3. Проверяет, что напоминание ещё не отправлено
 * 4. Отправляет уведомление и обновляет статус
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Проверяем метод
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Простая защита через токен (установи в .env CRON_SECRET)
  const token = req.query.token || req.headers['x-cron-secret'];
  if (process.env.CRON_SECRET && token !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting abandoned cart reminder job...');

    // Время: 2 часа назад
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    // 1. Находим кандидатов для напоминания
    const cartsResult = await query(
      `SELECT c.user_telegram_id, c.items
       FROM carts c
       JOIN users u ON c.user_telegram_id = u.telegram_id
       WHERE c.updated_at < $1
         AND u.is_blocked = FALSE
         AND c.items IS NOT NULL
         AND c.items != '[]'
       LIMIT 100`,
      [twoHoursAgo]
    );

    console.log(`Found ${cartsResult.rows.length} candidates`);

    let processed = 0;
    let notified = 0;

    for (const cart of cartsResult.rows) {
      try {
        const telegramId = cart.user_telegram_id;
        const items = typeof cart.items === 'string' ? JSON.parse(cart.items) : cart.items;

        // 2. Проверяем, нет ли недавних активных заказов
        const recentOrdersResult = await query(
          `SELECT id FROM orders
           WHERE user_telegram_id = $1
             AND created_at > $2
             AND status IN ('pending', 'new', 'confirmed', 'readyship', 'shipped')
           LIMIT 1`,
          [telegramId, twoHoursAgo]
        );

        // Если есть активный заказ - пропускаем
        if (recentOrdersResult.rows.length > 0) {
          console.log(`User ${telegramId} has active order, skipping`);
          processed++;
          continue;
        }

        // 3. Проверяем запись в abandoned_carts
        const abandonedResult = await query(
          `SELECT id, reminder_sent FROM abandoned_carts
           WHERE user_telegram_id = $1`,
          [telegramId]
        );

        const abandoned = abandonedResult.rows[0];

        // Если напоминание уже отправлено - пропускаем
        if (abandoned && abandoned.reminder_sent) {
          console.log(`User ${telegramId} already got reminder, skipping`);
          processed++;
          continue;
        }

        // 4. Считаем товары и сумму
        let totalItems = 0;
        let totalPrice = 0;

        for (const item of items) {
          if (item.product_id) {
            const productResult = await query(
              `SELECT price FROM products WHERE id = $1`,
              [item.product_id]
            );

            if (productResult.rows.length > 0) {
              const price = parseFloat(productResult.rows[0].price);
              totalItems += (item.quantity || 1);
              totalPrice += price * (item.quantity || 1);
            }
          }
        }

        // 5. Создаём или обновляем запись в abandoned_carts
        if (!abandoned) {
          await query(
            `INSERT INTO abandoned_carts (user_telegram_id, total_items, total_price)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_telegram_id) DO UPDATE
             SET total_items = $2, total_price = $3, abandoned_at = NOW()`,
            [telegramId, totalItems, totalPrice]
          );
        } else {
          await query(
            `UPDATE abandoned_carts
             SET total_items = $1, total_price = $2, abandoned_at = NOW()
             WHERE user_telegram_id = $3`,
            [totalItems, totalPrice, telegramId]
          );
        }

        // 6. Отправляем напоминание
        const notified_success = await notifyAbandonedCart(
          telegramId,
          totalItems,
          totalPrice
        );

        if (notified_success) {
          notified++;
          console.log(`✅ Reminder sent to ${telegramId}`);
        } else {
          console.log(`❌ Failed to send reminder to ${telegramId}`);
        }

        processed++;

        // Небольшая задержка между уведомлениями
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Error processing cart for user ${cart.user_telegram_id}:`, err);
        processed++;
      }
    }

    console.log(`Job complete: processed=${processed}, notified=${notified}`);

    res.status(200).json({
      success: true,
      processed,
      notified,
      message: `Processed ${processed} carts, notified ${notified} users`,
    });
  } catch (err) {
    console.error('Abandoned cart cron error:', err);
    res.status(500).json({
      error: 'Cron job failed',
      message: String(err),
    });
  }
}
