import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { notifyAbandonedCart } from '@/lib/notifications';
import { logger } from '@/lib/logger';
import { verifyCronSecret } from '@/lib/auth';

/**
 * Cron API для отправки напоминаний о брошенных корзинах
 *
 * Использование:
 * - Vercel Cron: Добавить в vercel.json: "crons": [{ "path": "/api/cron/abandoned-cart", "schedule": "0 * * * *" }]
 * - Self-hosted: curl https://yourapp.com/api/cron/abandoned-cart?token=YOUR_CRON_SECRET
 *
 * Что это делает:
 * 1. Находит корзины, где последнее обновление было более 2 часов назад
 * 2. Проверяет, что у пользователя нет активных заказов за последние 2 часа
 * 3. Проверяет, что напоминание ещё не отправлено
 * 4. Отправляет уведомление и обновляет статус
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Разрешены только GET и POST методы (требуется для безопасности Vercel Cron)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ⚠️ КРИТИЧНО: Проверяем CRON_SECRET с защитой от timing attacks
  if (!verifyCronSecret(req)) {
    logger.warn('Unauthorized CRON access attempt to abandoned-cart');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    logger.info('Abandoned cart reminder job started');

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

    logger.info('Abandoned cart job: found candidates', { count: cartsResult.rows.length });

    let processed = 0;
    let notified = 0;
    let errors = 0;

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
          logger.info('User has active order, skipping', { telegramId });
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
          logger.debug('User already got reminder, skipping', { telegramId });
          processed++;
          continue;
        }

        // 4. Считаем товары и сумму - ОПТИМИЗИРОВАНО: используем batch query вместо N+1
        let totalItems = 0;
        let totalPrice = 0;

        // Извлекаем все product_id сразу
        const productIds = items
          .filter((item: Record<string, unknown>) => item.product_id)
          .map((item: Record<string, unknown>) => item.product_id);

        if (productIds.length > 0) {
          // Один запрос вместо N запросов - ЗНАЧИТЕЛЬНО БЫСТРЕЕ!
          const productsResult = await query(
            `SELECT id, price FROM products WHERE id = ANY($1::uuid[])`,
            [productIds]
          );

          const productMap = new Map(productsResult.rows.map((p) => [p.id, p]));

          for (const item of items) {
            if (item.product_id && productMap.has(item.product_id)) {
              const product = productMap.get(item.product_id);
              const price = parseFloat(product.price);
              totalItems += item.quantity || 1;
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
        const notified_success = await notifyAbandonedCart(telegramId, totalItems, totalPrice);

        if (notified_success) {
          notified++;
          logger.info('Reminder sent successfully', {
            telegramId,
            items: totalItems,
            price: totalPrice,
          });
        } else {
          logger.warn('Failed to send reminder', { telegramId });
          errors++;
        }

        processed++;

        // Небольшая задержка между уведомлениями
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (err) {
        logger.error('Error processing cart for user', err, { telegramId: cart.user_telegram_id });
        errors++;
        processed++;
      }
    }

    logger.info('Abandoned cart job completed', { processed, notified, errors });

    res.status(200).json({
      success: true,
      processed,
      notified,
      errors,
      message: `Processed ${processed} carts, notified ${notified} users, ${errors} errors`,
    });
  } catch (err) {
    logger.error('Abandoned cart cron fatal error', err);
    res.status(500).json({
      error: 'Cron job failed',
      message: String(err),
    });
  }
}
