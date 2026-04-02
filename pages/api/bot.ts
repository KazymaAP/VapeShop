import { Bot, webhookCallback } from 'grammy';
import { NextApiRequest, NextApiResponse } from 'next';
import { handleStart, handleMenu, handleOrders, handleReferral, handleHelp, handleAdmin } from '../../lib/bot/handlers';
import { handlePaymentSuccess, handlePreCheckout } from '../../lib/bot/payments';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.command('start', handleStart);
bot.command('menu', handleMenu);
bot.command('orders', handleOrders);
bot.command('referral', handleReferral);
bot.command('help', handleHelp);
bot.command('admin', handleAdmin);

bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data.startsWith('order:')) {
    const orderId = data.replace('order:', '');
    await ctx.reply(`Заказ #${orderId.slice(0, 8)}\nСтатус: в обработке\nСумма: 1 250 ₽`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Повторить заказ', web_app: { url: process.env.WEBAPP_URL || '' } }],
          [{ text: '❌ Отменить', callback_data: `cancel:${orderId}` }],
          [{ text: '✉️ Написать менеджеру', url: 'https://t.me/support' }],
        ],
      },
    });
    await ctx.answerCallbackQuery();
  } else if (data.startsWith('cancel:')) {
    await ctx.editMessageText('Заказ отменён');
    await ctx.answerCallbackQuery();
  }
});

bot.on('pre_checkout_query', handlePreCheckout);
bot.on('message:successful_payment', handlePaymentSuccess);

export default webhookCallback(bot, 'next-js');
