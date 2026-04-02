import { Context } from 'grammy';
import { query } from '../db';

export async function handlePreCheckout(ctx: Context) {
  await ctx.answerPreCheckoutQuery(true);
}

export async function handlePaymentSuccess(ctx: Context) {
  const payment = ctx.message?.successful_payment;
  if (!payment) return;

  const orderId = payment.invoice_payload;
  const telegramId = ctx.from?.id;

  if (!orderId || !telegramId) return;

  await query(
    `UPDATE orders SET status = 'confirmed', paid_at = NOW() WHERE id = $1`,
    [orderId]
  );

  const order = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
  if (order.rows.length === 0) return;

  const total = parseFloat(order.rows[0].total);

  await ctx.reply(
    `✅ Оплата прошла успешно!\n\n` +
    `Заказ #${orderId.slice(0, 8)} на сумму ${total.toLocaleString('ru-RU')} ₽ подтверждён.\n\n` +
    `Мы уведомим вас о смене статуса.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛍️ Открыть магазин', web_app: { url: process.env.WEBAPP_URL || '' } }],
        ],
      },
    }
  );

  const orderRow = order.rows[0];
  const referredBy = await query('SELECT referred_by FROM users WHERE telegram_id = $1', [telegramId]);
  if (referredBy.rows[0]?.referred_by) {
    const bonusAmount = total * 0.1;
    await query(
      `INSERT INTO referral_bonuses (user_telegram_id, amount, source_order_id)
       VALUES ($1, $2, $3)`,
      [referredBy.rows[0].referred_by, bonusAmount, orderId]
    );
    await query(
      `UPDATE users SET bonus_balance = bonus_balance + $1 WHERE telegram_id = $2`,
      [bonusAmount, referredBy.rows[0].referred_by]
    );
  }
}
