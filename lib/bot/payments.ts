import { Context } from 'grammy';
import { query } from '../db';

/**
 * Обработчик pre_checkout_query — подтверждает, что заказ может быть оплачен
 */
export async function handlePreCheckout(ctx: Context) {
  try {
    const preCheckout = ctx.preCheckoutQuery;
    if (!preCheckout) return;

    const orderId = preCheckout.invoice_payload;
    const telegramId = ctx.from?.id;

    if (!orderId || !telegramId) {
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

    // Подтверждаем возможность оплаты
    await ctx.answerPreCheckoutQuery(true);
  } catch (err) {
    console.error('Pre-checkout error:', err);
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
      console.error('No payment data found');
      return;
    }

    const orderId = payment.invoice_payload;
    const telegramId = ctx.from?.id;
    const totalAmount = payment.total_amount;
    const chargeId = payment.telegram_payment_charge_id;

    if (!orderId || !telegramId || !chargeId) {
      console.error('Missing orderId, telegramId, or chargeId');
      return;
    }

    // 🔒 ЗАЩИТА: Проверяем, не обработан ли уже этот платёж
    const existingPayment = await query(
      'SELECT id FROM payment_logs WHERE telegram_payment_charge_id = $1',
      [chargeId]
    );

    if (existingPayment.rows.length > 0) {
      console.warn(`Duplicate payment received: ${chargeId}. Skipping.`);
      await ctx.reply('⚠️ Этот платёж уже был обработан. Спасибо!');
      return;
    }

    // Проверяем, что заказ со статусом 'pending'
    const orderCheckRes = await query(
      'SELECT * FROM orders WHERE id = $1 AND user_telegram_id = $2 AND status = $3',
      [orderId, telegramId, 'pending']
    );

    if (orderCheckRes.rows.length === 0) {
      await ctx.reply('⚠️ Заказ не найден или уже был оплачен.');
      return;
    }

    // Генерируем 6-значный код (100000-999999)
    const code6digit = Math.floor(100000 + Math.random() * 900000);
    const codeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Обновляем статус заказа на 'new' (активный, ожидает комплектации)
    // и сохраняем информацию об оплате
    await query(
      `UPDATE orders 
       SET status = $1, 
           paid_at = NOW(), 
           code_6digit = $2, 
           code_expires_at = $3 
       WHERE id = $4`,
      ['new', code6digit, codeExpiresAt, orderId]
    );

    // 🔒 Логируем платёж в payment_logs для идемпотентности
    await query(
      `INSERT INTO payment_logs (telegram_id, order_id, telegram_payment_charge_id, amount_received, currency, status, processed_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [telegramId, orderId, chargeId, totalAmount, 'XTR', 'success']
    ).catch((err) => console.error('Failed to log payment:', err));

    const order = orderCheckRes.rows[0];
    const total = parseFloat(order.total);

    // Clear the user's cart after successful payment
    await query('DELETE FROM carts WHERE user_telegram_id = $1', [telegramId]).catch((err) =>
      console.warn('Failed to clear cart after payment:', err)
    );

    // Отправляем уведомление пользователю
    await ctx.reply(
      `✅ Спасибо! Ваш заказ оплачен\n\n` +
        `📦 Заказ #${orderId.slice(0, 8).toUpperCase()}\n` +
        `💰 Сумма: ${totalAmount / 100} ⭐️\n` +
        `📍 Способ доставки: ${order.delivery_method === 'pickup' ? 'Самовывоз' : 'Курьер'}\n\n` +
        `🔐 Код доставки: <code>${code6digit}</code>\n` +
        `⏰ Действителен 24 часа\n\n` +
        `Ожидайте готовности вашего заказа!`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🛍️ Открыть магазин', web_app: { url: process.env.WEBAPP_URL || '' } }],
            [{ text: '❓ Помощь', callback_data: 'help' }],
          ],
        },
      }
    );

    // Логируем успешный платёж
    console.log(
      `[PAYMENT SUCCESS] Order #${orderId.slice(0, 8).toUpperCase()} paid by user ${telegramId}`
    );

    // Отправляем уведомление админам
    // ⚠️ HIGH-004 FIX: Отделяем уведомленияот основной логики платежа
    // Если уведомление не отправится, оно не откатит обновление БД
    (async () => {
      try {
        const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(Number);
        for (const adminId of adminIds) {
          if (adminId) {
            try {
              await ctx.api.sendMessage(
                adminId,
                `💰 Новая оплата!\n\n` +
                  `📦 Заказ #${orderId.slice(0, 8).toUpperCase()}\n` +
                  `👤 Пользователь: ${ctx.from?.first_name} (@${ctx.from?.username || 'N/A'})\n` +
                  `💵 Сумма: ${totalAmount / 100} ⭐️\n` +
                  `📦 Код доставки: ${code6digit}`,
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
              console.error(`Failed to notify admin ${adminId}:`, adminErr);
            }
          }
        }
      } catch (notificationErr) {
        console.error('Admin notification batch failed:', notificationErr);
      }
    })();

    // Обновляем реферальные бонусы
    const userRes = await query('SELECT referred_by FROM users WHERE telegram_id = $1', [
      telegramId,
    ]);

    if (userRes.rows.length > 0 && userRes.rows[0].referred_by) {
      const referredBy = userRes.rows[0].referred_by;
      const bonusAmount = Math.round(total * 0.1); // 10% от суммы заказа

      try {
        await query(
          `INSERT INTO referral_bonuses (user_telegram_id, amount, source_order_id, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [referredBy, bonusAmount, orderId]
        );

        await query(`UPDATE users SET bonus_balance = bonus_balance + $1 WHERE telegram_id = $2`, [
          bonusAmount,
          referredBy,
        ]);

        console.log(`[REFERRAL] User ${referredBy} received ${bonusAmount} bonus for referral`);
      } catch (refErr) {
        console.error('Referral bonus error:', refErr);
      }
    }
  } catch (err) {
    console.error('Payment success handler error:', err);
    await ctx.reply(
      '❌ Произошла ошибка при обработке платежа. Пожалуйста, свяжитесь с поддержкой.'
    );
  }
}
