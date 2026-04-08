import { Context } from 'grammy';
import { query, transaction } from '../db';
import { logger } from '../logger';
import { REFERRAL_BONUS_PERCENT } from '../constants';

/**
 * Обработчик pre_checkout_query — подтверждает, что заказ может быть оплачен
 */
export async function handlePreCheckout(ctx: Context) {
  try {
    const preCheckout = ctx.preCheckoutQuery;
    if (!preCheckout) return;

    const orderId = preCheckout.invoice_payload;
    const telegramId = ctx.from?.id;
    const totalAmount = preCheckout.total_amount; // в копейках (центах)

    if (!orderId || !telegramId || !totalAmount) {
      await ctx.answerPreCheckoutQuery(false, 'Ошибка: не найден заказ');
      return;
    }

    // Проверяем, что заказ существует и его статус 'pending'
    const orderRes = await query(
      'SELECT * FROM orders WHERE id = $1 AND user_telegram_id = $2 AND status = $3',
      [orderId, telegramId, 'pending']
    );

    if (orderRes.rows.length === 0) {
      await ctx.answerPreCheckoutQuery(false, 'Заказ не найден или уже оплачен');
      return;
    }

    const order = orderRes.rows[0];
    
    // 🔒 ВАЛИДАЦИЯ: Проверяем что сумма платежа совпадает с суммой заказа
    // total_amount в Telegram API в копейках/центах (в 100-ках изначальной валюты)
    const expectedAmount = Math.round((parseFloat(order.total) || 0) * 100);
    
    if (totalAmount !== expectedAmount) {
      logger.error('Payment amount mismatch', {
        orderId,
        telegramId,
        expected: expectedAmount,
        received: totalAmount,
        differenceInCents: totalAmount - expectedAmount
      });
      await ctx.answerPreCheckoutQuery(
        false, 
        `Ошибка: сумма платежа не совпадает. Ожидалось: ${(expectedAmount / 100).toFixed(2)}, получено: ${(totalAmount / 100).toFixed(2)}`
      );
      return;
    }

    // Подтверждаем возможность оплаты
    await ctx.answerPreCheckoutQuery(true);
  } catch (err) {
    logger.error('Pre-checkout error', { error: err instanceof Error ? err.message : String(err) });
    await ctx.answerPreCheckoutQuery(false, 'Технаическая ошибка');
  }
}

/**
 * Обработчик successful_payment — срабатывает после успешной оплаты
 * 🔒 С защитой от повторной обработки одного платежа (идемпотентность)
 */
export async function handlePaymentSuccess(ctx: Context) {
  try {
    const payment = ctx.message?.successful_payment;
    if (!payment) {
      logger.error('No payment data found in successful_payment');
      return;
    }

    const orderId = payment.invoice_payload;
    const telegramId = ctx.from?.id;
    const totalAmount = payment.total_amount;
    const chargeId = payment.telegram_payment_charge_id;

    if (!orderId || !telegramId || !chargeId) {
      logger.error('Missing payment parameters', { orderId: !!orderId, telegramId: !!telegramId, chargeId: !!chargeId });
      return;
    }

    // 🔒 КРИТИЧЕСКАЯ ЗАЩИТА: Используем транзакцию с SERIALIZABLE изоляцией
    // Это предотвращает race condition где несколько платежей могут обновить один заказ
    try {
      await transaction(async (client) => {
        // Устанавливаем SERIALIZABLE изоляцию для этой транзакции
        await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

        // Проверяем, не обработан ли уже этот платёж
        // Используем FOR UPDATE для блокировки строки
        const existingPayment = await client.query(
          'SELECT id FROM payment_logs WHERE telegram_payment_charge_id = $1 FOR UPDATE',
          [chargeId]
        );

        if (existingPayment.rows.length > 0) {
          logger.warn('Duplicate payment received', { chargeId });
          // Откатываем транзакцию если это дублирование
          throw new Error('DUPLICATE_PAYMENT');
        }

        // Проверяем, что заказ со статусом 'pending' (FOR UPDATE блокирует для других транзакций)
        const orderCheckRes = await client.query(
          'SELECT * FROM orders WHERE id = $1 AND user_telegram_id = $2 AND status = $3 FOR UPDATE',
          [orderId, telegramId, 'pending']
        );

        if (orderCheckRes.rows.length === 0) {
          throw new Error('ORDER_NOT_FOUND_OR_ALREADY_PAID');
        }

        const order = orderCheckRes.rows[0];

        // 🔒 ВАЛИДАЦИЯ: Проверяем что сумма платежа совпадает с суммой заказа
        // total_amount в Telegram API в копейках/центах
        const expectedAmount = Math.round((parseFloat(order.total) || 0) * 100);
        
        if (totalAmount !== expectedAmount) {
          logger.error('Payment amount mismatch in successful_payment', {
            orderId,
            telegramId,
            expected: expectedAmount,
            received: totalAmount,
            differenceInCents: totalAmount - expectedAmount
          });
          throw new Error(`PAYMENT_AMOUNT_MISMATCH: expected ${expectedAmount}, got ${totalAmount}`);
        }

        // Генерируем 6-значный код (100000-999999)
        const code6digit = Math.floor(100000 + Math.random() * 900000);
        const codeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        // Обновляем статус заказа на 'new' (активный, ожидает комплектации)
        // и сохраняем информацию об оплате
        await client.query(
          `UPDATE orders 
           SET status = $1, 
               paid_at = NOW(), 
               code_6digit = $2, 
               code_expires_at = $3 
           WHERE id = $4`,
          ['new', code6digit, codeExpiresAt, orderId]
        );

        // 🔒 Логируем платёж в payment_logs для идемпотентности
        // UNIQUE constraint на telegram_payment_charge_id предотвратит дублирование
        try {
          await client.query(
            `INSERT INTO payment_logs (telegram_id, order_id, telegram_payment_charge_id, amount_received, currency, status, processed_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [telegramId, orderId, chargeId, totalAmount, 'XTR', 'success']
          );
        } catch (insertErr: unknown) {
          const err = insertErr as { code?: string };
          if (err.code === '23505') { // UNIQUE violation
            throw new Error('DUPLICATE_PAYMENT');
          }
          throw insertErr;
        }

        // Clear the user's cart after successful payment
        await client.query('DELETE FROM carts WHERE user_telegram_id = $1', [telegramId]);

        // Обновляем реферальные бонусы
        const userRes = await client.query('SELECT referred_by FROM users WHERE telegram_id = $1 FOR UPDATE', [
          telegramId,
        ]);

        if (userRes.rows.length > 0 && userRes.rows[0].referred_by) {
          const referredBy = userRes.rows[0].referred_by;
          const bonusAmount = Math.round(parseFloat(order.total) * REFERRAL_BONUS_PERCENT);

          try {
            await client.query(
              `INSERT INTO referral_bonuses (user_telegram_id, amount, source_order_id, created_at)
               VALUES ($1, $2, $3, NOW())`,
              [referredBy, bonusAmount, orderId]
            );

            await client.query(`UPDATE users SET bonus_balance = bonus_balance + $1 WHERE telegram_id = $2`, [
              bonusAmount,
              referredBy,
            ]);

            logger.info('Referral bonus awarded', { referredUser: referredBy, bonusAmount });
          } catch (refErr) {
            logger.error('Referral bonus failed', { error: refErr instanceof Error ? refErr.message : String(refErr) });
            // Continue even if referral bonus fails
          }
        }

        // Возвращаем данные для уведомлений (выполняются после commit)
        return { order, code6digit, totalAmount, orderId };
      });

      // Если транзакция успешна, отправляем уведомления
      // Эти уведомления НЕ откатывают транзакцию если упали
      await ctx.reply(
        `✅ Спасибо! Ваш заказ оплачен\n\n` +
          `📦 Заказ #${orderId.slice(0, 8).toUpperCase()}\n` +
          `💰 Сумма: ${totalAmount / 100} ⭐️\n\n` +
          `Ожидайте готовности вашего заказа!`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛍️ Открыть магазин', web_app: { url: process.env.WEBAPP_URL || '' } }],
            ],
          },
        }
      ).catch((err) => logger.error('Failed to reply to user:', err));

      logger.info('Payment success', { orderId: orderId.slice(0, 8).toUpperCase(), telegramId });

      // Отправляем уведомление админам (асинхронно, не блокирует)
      (async () => {
        try {
          const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(Number).filter(id => id > 0);
          // HIGH-004 FIX: Send all admin notifications in parallel instead of sequentially
          const adminNotifications = adminIds.map(adminId =>
            (async () => {
              try {
                await ctx.api.sendMessage(
                  adminId,
                  `💰 Новая оплата!\n\n📦 Заказ #${orderId.slice(0, 8).toUpperCase()}\n💵 Сумма: ${totalAmount / 100} ⭐️`,
                  {
                    reply_markup: {
                      inline_keyboard: [
                        [
                          {
                            text: 'Открыть админ-панель',
                            web_app: { url: `${process.env.WEBAPP_URL}/admin/orders` || '' },
                          },
                        ],
                      ],
                    },
                  }
                );
              } catch (adminErr) {
                logger.error('Failed to notify admin', { adminId, error: adminErr instanceof Error ? adminErr.message : String(adminErr) });
              }
            })()
          );
          
          await Promise.allSettled(adminNotifications);
        } catch (notificationErr) {
          logger.error('Admin notification batch failed', { error: notificationErr instanceof Error ? notificationErr.message : String(notificationErr) });
        }
      })();

    } catch (txErr: unknown) {
      const err = txErr as { message?: string };
      if (err.message === 'DUPLICATE_PAYMENT') {
        logger.warn('Duplicate payment detected and blocked', { chargeId });
        await ctx.reply('⚠️ Этот платёж уже был обработан. Спасибо!');
        return;
      }
      if (err.message === 'ORDER_NOT_FOUND_OR_ALREADY_PAID') {
        logger.warn('Order not found or already paid', { orderId, telegramId });
        await ctx.reply('⚠️ Заказ не найден или уже был оплачен.');
        return;
      }
      throw txErr;
    }

  } catch (err) {
    logger.error('Payment success handler error', { error: err instanceof Error ? err.message : String(err) });
    await ctx.reply('❌ Ошибка обработки платежа. Пожалуйста обратитесь в поддержку.');
  }
}
