import { Bot, webhookCallback } from 'grammy';
import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
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
import { query, transaction } from '@/lib/db';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

// ⚠️ ВАЛИДАЦИЯ: Проверяем что TELEGRAM_BOT_TOKEN установлен
const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken || botToken.trim() === '') {
  const errorMsg = '🚨 CRITICAL: TELEGRAM_BOT_TOKEN is not set in environment variables!';
  logger.error(errorMsg);
  logger.error('Bot initialization failed', { reason: 'Missing TELEGRAM_BOT_TOKEN' });
  throw new Error(errorMsg);
}

// Валидируем формат токена (должен содержать :)
if (!botToken.includes(':')) {
  const errorMsg =
    '🚨 CRITICAL: TELEGRAM_BOT_TOKEN has invalid format! Expected format: <bot_id>:<token>';
  logger.error(errorMsg);
  logger.error('Bot initialization failed', {
    reason: 'Invalid token format',
    token: botToken.substring(0, 5) + '...',
  });
  throw new Error(errorMsg);
}

const bot = new Bot(botToken);

// ⚠️ КРИТИЧНО: Инициализируем bot instance для notifications.ts
setBotInstance(bot);

// Глобальный обработчик ошибок бота
bot.catch((err) => {
  logger.error('❌ Bot error:', err);
  // Не выбрасываем ошибку - просто логируем и продолжаем
});

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
      logger.error('Error fetching order:', err);
      await ctx.reply('❌ Ошибка загрузки заказа');
    }
  } else if (data.startsWith('cancel:')) {
    const orderId = data.replace('cancel:', '');
    try {
      // Обновляем статус заказа на cancelled в транзакции
      await transaction(async (client) => {
        await client.query('UPDATE orders SET status = $1 WHERE id = $2', ['cancelled', orderId]);
      });
      await ctx.editMessageText('❌ Заказ отменён');
      await ctx.answerCallbackQuery();
    } catch (err) {
      logger.error('Error cancelling order:', err);
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
      logger.error('Error creating invoice:', err);
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
  // HIGH-010 FIX: Verify Telegram webhook IP address
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    (req.headers['cf-connecting-ip'] as string)?.trim() ||
    req.socket?.remoteAddress;

  // Telegram's official IP ranges (as of 2024)
  // Source: https://core.telegram.org/bots/webhooks
  const telegramIpRanges = [
    '91.108.4.0/22',
    '91.108.8.0/22',
    '91.108.12.0/22',
    '91.108.16.0/22',
    '91.108.20.0/22',
    '91.108.56.0/22',
    '149.154.160.0/22',
    '149.154.164.0/22',
    '149.154.168.0/22',
    '149.154.172.0/22',
    '149.154.176.0/22',
  ];

  // Функция для проверки IP в CIDR диапазоне (точная проверка)
  const ipInCidr = (ip: string, cidr: string): boolean => {
    try {
      const [range, bits] = cidr.split('/');
      const maskBits = parseInt(bits, 10);
      if (maskBits < 0 || maskBits > 32) return false;

      const mask = maskBits === 0 ? 0 : ~(2 ** (32 - maskBits) - 1);

      const ipInt = ip.split('.').reduce((acc, oct) => {
        const num = parseInt(oct, 10);
        if (num < 0 || num > 255 || isNaN(num)) return -1;
        return (acc << 8) + num;
      }, 0);

      const rangeInt = range.split('.').reduce((acc, oct) => {
        const num = parseInt(oct, 10);
        if (num < 0 || num > 255 || isNaN(num)) return -1;
        return (acc << 8) + num;
      }, 0);

      if (ipInt === -1 || rangeInt === -1) return false;
      return (ipInt & mask) === (rangeInt & mask);
    } catch {
      return false;
    }
  };

  const isAllowedIp = clientIp && telegramIpRanges.some((range) => ipInCidr(clientIp, range));

  if (process.env.NODE_ENV === 'production' && !isAllowedIp && clientIp) {
    logger.warn(`[SECURITY] Webhook from unauthorized IP: ${clientIp}`);
    // Don't return error immediately - only if secret verification also fails
  }

  // ⚠️ КРИТИЧНО: Верифицируем секретный токен
  const secretToken = req.headers['x-telegram-bot-api-secret-token'] as string;
  const expectedSecret = process.env.TELEGRAM_BOT_SECRET;

  if (expectedSecret && secretToken) {
    // HIGH-011 FIX: Use timing-safe comparison to prevent timing attacks
    try {
      const secretBuffer = Buffer.from(secretToken);
      const expectedBuffer = Buffer.from(expectedSecret);

      // Check length first (same length check as constant-time comparison)
      if (secretBuffer.length !== expectedBuffer.length) {
        logger.warn('❌ Invalid Telegram bot webhook secret length', { clientIp });
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Use timing-safe comparison
      if (!crypto.timingSafeEqual(secretBuffer, expectedBuffer)) {
        logger.warn('❌ Invalid Telegram bot webhook token received', { clientIp });
        return res.status(401).json({ error: 'Unauthorized' });
      }
    } catch (err) {
      logger.warn('❌ Error comparing Telegram webhook secret', {
        clientIp,
        error: err instanceof Error ? err.message : String(err),
      });
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // If no secret token configured, use IP verification as fallback
  if (!expectedSecret && !isAllowedIp && process.env.NODE_ENV === 'production') {
    logger.warn('❌ Webhook from unauthorized IP and no secret token configured', { clientIp });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Используем встроенный webhookCallback от grammy
  const webhookHandler = webhookCallback(bot, 'http');
  return await webhookHandler(req, res);
}

// Экспорт webhook handler для Vercel с rate limiting и верификацией
export default rateLimit(botWebhookHandler, RATE_LIMIT_PRESETS.normal);
