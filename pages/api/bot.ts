import { Bot, webhookCallback } from 'grammy';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  handleStart,
  handleMenu,
  handleOrders,
  handleReferral,
  handleHelp,
  handleAdmin,
} from '@/lib/bot/handlers';
import { handlePaymentSuccess, handlePreCheckout } from '@/lib/bot/payments';
import { setBotInstance } from '@/lib/notifications';
import { query } from '@/lib/db';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

// ⚠️ КРИТИЧНО: Инициализируем bot instance для notifications.ts
setBotInstance(bot);

// Регистрируем команды
bot.command('start', handleStart);
bot.command('menu', handleMenu);
bot.command('orders', handleOrders);
bot.command('referral', handleReferral);
bot.command('help', handleHelp);
bot.command('admin', handleAdmin);

// Обработка callback queries (кнопки в сообщениях)
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data.startsWith('order:')) {
    const orderId = data.replace('order:', '');
    try {
      // Получаем реальные данные заказа из БД
      const orderResult = await query(
        `SELECT id, status, total_price FROM orders WHERE id = $1 LIMIT 1`,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        await ctx.reply('❌ Заказ не найден');
        return;
      }

      const order = orderResult.rows[0];
      const statusText =
        {
          pending: '⏳ В ожидании',
          processing: '⚙️ В обработке',
          shipped: '📦 Отправлена',
          delivered: '✅ Доставлена',
          cancelled: '❌ Отменена',
        }[order.status as string] || order.status;

      await ctx.reply(
        `Заказ #${order.id.toString().slice(0, 8)}\nСтатус: ${statusText}\nСумма: ${order.total_price} ₽`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Повторить заказ', web_app: { url: process.env.WEBAPP_URL || '' } }],
              [{ text: '❌ Отменить', callback_data: `cancel:${orderId}` }],
              [{ text: '✉️ Написать менеджеру', url: 'https://t.me/support' }],
            ],
          },
        }
      );
      await ctx.answerCallbackQuery();
    } catch (err) {
      console.error('Error fetching order:', err);
      await ctx.reply('❌ Ошибка загрузки заказа');
    }
  } else if (data.startsWith('cancel:')) {
    const orderId = data.replace('cancel:', '');
    try {
      // Обновляем статус заказа на cancelled
      await query('UPDATE orders SET status = $1 WHERE id = $2', ['cancelled', orderId]);
      await ctx.editMessageText('❌ Заказ отменён');
      await ctx.answerCallbackQuery();
    } catch (err) {
      console.error('Error cancelling order:', err);
    }
  } else if (data.startsWith('pay_order:')) {
    const orderId = data.replace('pay_order:', '');
    try {
      const orderResult = await query(
        `SELECT id, status, total_price FROM orders WHERE id = $1 LIMIT 1`,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        await ctx.reply('❌ Заказ не найден');
        return;
      }

      const order = orderResult.rows[0];

      // Проверяем, что заказ ещё не оплачен
      if (order.status !== 'pending') {
        await ctx.reply('⚠️ Этот заказ уже был обработан');
        return;
      }

      // ⚠️ TODO: Реализовать платежи через grammy правильно
      await ctx.reply('💳 Оплата заказа: переход на платёжную страницу (в разработке)');
      await ctx.answerCallbackQuery();
    } catch (err) {
      console.error('Error creating invoice:', err);
      await ctx.reply('❌ Ошибка создания счёта');
    }
  }
});

// ⚠️ КРИТИЧНО: Обработка pre_checkout_query (обязательно для платежей!)
bot.on('pre_checkout_query', handlePreCheckout);

// ⚠️ КРИТИЧНО: Обработка успешной оплаты
bot.on('message:successful_payment', handlePaymentSuccess);

// 🔒 Middleware для верификации webhook токена и rate limiting
async function botWebhookHandler(req: NextApiRequest, res: NextApiResponse) {
  // ⚠️ КРИТИЧНО: Верифицируем секретный токен
  const secretToken = req.headers['x-telegram-bot-api-secret-token'] as string;
  const expectedSecret = process.env.TELEGRAM_BOT_SECRET;

  if (expectedSecret && secretToken !== expectedSecret) {
    console.warn('❌ Invalid Telegram bot webhook token received');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Используем встроенный webhookCallback от grammy
  const webhookHandler = webhookCallback(bot, 'http');
  return await webhookHandler(req, res);
}

// Экспорт webhook handler для Vercel с rate limiting и верификацией
export default rateLimit(botWebhookHandler, RATE_LIMIT_PRESETS.normal);
