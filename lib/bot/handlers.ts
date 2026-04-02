import { Context } from 'grammy';
import { query } from '../db';
import { getMainKeyboard, getAdminKeyboard } from './keyboards';

export async function handleStart(ctx: Context) {
  const user = ctx.from;
  if (!user) return;

  const telegramId = user.id;
  const existing = await query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);

  let referralCode = '';
  let referredBy: number | undefined;

  const startParam = (ctx as any).match;
  if (startParam && startParam.startsWith('ref_')) {
    referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    referredBy = parseInt(startParam.replace('ref_', ''), 10);

    const referrer = await query('SELECT * FROM users WHERE referral_code = $1', [startParam.replace('ref_', '')]);
    if (referrer.rows.length > 0) {
      referredBy = referrer.rows[0].telegram_id;
    }
  }

  if (existing.rows.length === 0) {
    if (!referralCode) {
      referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    await query(
      `INSERT INTO users (telegram_id, first_name, last_name, username, referral_code, referred_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [telegramId, user.first_name, user.last_name || null, user.username || null, referralCode, referredBy || null]
    );
  } else {
    await query('UPDATE users SET last_seen = NOW() WHERE telegram_id = $1', [telegramId]);
  }

  const isAdmin = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(Number).includes(telegramId);

  await ctx.reply(
    `👋 Добро пожаловать, ${user.first_name}!\n\n` +
    `🛍️ Откройте наш магазин и выберите лучшие товары.\n` +
    `💰 Реферальная программа — приглашайте друзей и получайте бонусы!`,
    { reply_markup: getMainKeyboard() }
  );

  if (isAdmin) {
    await ctx.reply('🔐 У вас есть доступ к админ-панели', { reply_markup: getAdminKeyboard() });
  }
}

export async function handleMenu(ctx: Context) {
  await ctx.reply('📱 Главное меню:', { reply_markup: getMainKeyboard() });
}

export async function handleOrders(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const orders = await query(
    `SELECT * FROM orders WHERE user_telegram_id = $1 ORDER BY created_at DESC LIMIT 5`,
    [telegramId]
  );

  if (orders.rows.length === 0) {
    await ctx.reply('📭 У вас пока нет заказов.\n\nОткройте магазин, чтобы сделать первый заказ!', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛍️ Открыть магазин', web_app: { url: process.env.WEBAPP_URL || '' } }],
        ],
      },
    });
    return;
  }

  const statusLabels: Record<string, string> = {
    new: '🆕 Новый',
    confirmed: '✅ Подтверждён',
    readyship: '📦 Готов к отправке',
    shipped: '🚚 Отправлен',
    done: '✔️ Выполнен',
    cancelled: '❌ Отменён',
  };

  let message = '📋 Ваши последние заказы:\n\n';
  for (const order of orders.rows) {
    message += `#${order.id.slice(0, 8)} — ${parseFloat(order.total).toLocaleString('ru-RU')} ₽ — ${statusLabels[order.status] || order.status}\n`;
  }

  await ctx.reply(message, {
    reply_markup: {
      inline_keyboard: orders.rows.slice(0, 3).map((order) => [
        { text: `Заказ #${order.id.slice(0, 8)}`, callback_data: `order:${order.id}` },
      ]),
    },
  });
}

export async function handleReferral(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await query('SELECT referral_code FROM users WHERE telegram_id = $1', [telegramId]);
  if (user.rows.length === 0) return;

  const referralCode = user.rows[0].referral_code;
  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'your_bot';
  const link = `https://t.me/${botUsername}?start=ref_${referralCode}`;

  const stats = await query(
    `SELECT COUNT(*) as count, COALESCE(SUM(rb.amount), 0) as earned
     FROM referral_bonuses rb
     WHERE rb.user_telegram_id = $1`,
    [telegramId]
  );

  const count = stats.rows[0]?.count || 0;
  const earned = stats.rows[0]?.earned || 0;

  await ctx.reply(
    `🎁 Реферальная программа\n\n` +
    `Ваша ссылка: ${link}\n\n` +
    `👥 Приглашено: ${count}\n` +
    `💰 Заработано: ${parseFloat(earned).toLocaleString('ru-RU')} ₽\n\n` +
    `Отправьте ссылку друзьям и получайте 10% от их заказов!`
  );
}

export async function handleHelp(ctx: Context) {
  await ctx.reply(
    `❓ Помощь\n\n` +
    `📦 Как оформить заказ:\n` +
    `1. Откройте магазин\n` +
    `2. Выберите товары\n` +
    `3. Добавьте в корзину\n` +
    `4. Оформите заказ и оплатите\n\n` +
    `🚚 Доставка:\n` +
    `• Самовывоз — бесплатно\n` +
    `• Курьер — от 300 ₽\n\n` +
    `💳 Оплата через Telegram Stars\n\n` +
    `По вопросам: @support`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📖 Открыть FAQ', web_app: { url: `${process.env.WEBAPP_URL || ''}/faq` } }],
        ],
      },
    }
  );
}

export async function handleFaq(ctx: Context) {
  await ctx.reply('📖 FAQ — часто задаваемые вопросы:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📋 Открыть FAQ', web_app: { url: `${process.env.WEBAPP_URL || ''}/faq` } }],
      ],
    },
  });
}

export async function handleAdmin(ctx: Context) {
  const telegramId = ctx.from?.id;
  const allowed = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(Number);

  if (!telegramId || !allowed.includes(telegramId)) {
    await ctx.reply('❌ Недостаточно прав');
    return;
  }

  await ctx.reply('🔐 Админ-панель:', { reply_markup: getAdminKeyboard() });
}
