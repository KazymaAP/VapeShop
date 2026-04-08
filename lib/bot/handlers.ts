import { Context } from 'grammy';
import { query } from '../db';
import { logger } from '../logger';
import { getMainKeyboard, getAdminKeyboard } from './keyboards';

/**
 * Обработчик команды /start
 * Регистрирует нового пользователя или обновляет last_seen
 */
export async function handleStart(ctx: Context) {
  const user = ctx.from;
  if (!user) {
    logger.error('❌ ctx.from is undefined in handleStart');
    return;
  }

  const telegramId = user.id;
  if (!telegramId || telegramId <= 0) {
    logger.error('❌ Invalid telegram_id:', telegramId);
    return;
  }

  try {
    const existing = await query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);

    let referralCode = '';
    let referredBy: number | undefined;

    // ⚠️ ИСПРАВЛЕНО: Добавлена явная типизация для ctx.match
    // ctx.match может быть: string | string[] | undefined (в зависимости от regex группы)
    const startParamArray: string | string[] | undefined = ctx.match;
    const startParam: string | null = Array.isArray(startParamArray)
      ? (startParamArray[0] ?? null)
      : typeof startParamArray === 'string'
        ? startParamArray
        : null;

    if (startParam && typeof startParam === 'string' && startParam.length > 0) {
      // Проверяем, что это реферальный код (начинается с ref_)
      if (startParam.startsWith('ref_')) {
        const refCodePart = startParam.substring(4).trim(); // Удаляем 'ref_'

        // Валидируем длину кода (безопасность)
        if (refCodePart.length > 0 && refCodePart.length <= 50) {
          // Пытаемся найти по referral_code (строка)
          const referrer = await query('SELECT telegram_id FROM users WHERE referral_code = $1', [
            refCodePart,
          ]);

          if (referrer.rows.length > 0 && referrer.rows[0].telegram_id > 0) {
            referredBy = referrer.rows[0].telegram_id;
          } else {
            // Fallback: попытаемся распарсить как telegram_id (число)
            const parsedId = parseInt(refCodePart, 10);
            if (!isNaN(parsedId) && parsedId > 0) {
              const referrerById = await query(
                'SELECT telegram_id FROM users WHERE telegram_id = $1',
                [parsedId]
              );
              if (referrerById.rows.length > 0) {
                referredBy = parsedId;
              }
            }
          }
        }
      }
    }

    // Генерируем реферальный код для нового пользователя
    if (!referralCode) {
      referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    if (existing.rows.length === 0) {
      // Новый пользователь - регистрируем
      await query(
        `INSERT INTO users (telegram_id, first_name, last_name, username, referral_code, referred_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          telegramId,
          user.first_name || null,
          user.last_name || null,
          user.username || null,
          referralCode,
          referredBy || null,
        ]
      );
    } else {
      // Существующий пользователь - обновляем last_seen
      await query('UPDATE users SET last_seen = NOW() WHERE telegram_id = $1', [telegramId]);
    }

    // Проверяем, является ли пользователь администратором
    const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '')
      .split(',')
      .map((id) => {
        const parsed = parseInt(id.trim(), 10);
        return isNaN(parsed) ? 0 : parsed;
      })
      .filter((id) => id > 0);

    const isAdmin = adminIds.includes(telegramId);

    // Отправляем приветственное сообщение
    await ctx.reply(
      `👋 Добро пожаловать, ${user.first_name}!\n\n` +
        `🛍️ Откройте наш магазин и выберите лучшие товары.\n` +
        `💰 Реферальная программа — приглашайте друзей и получайте бонусы!`,
      { reply_markup: getMainKeyboard() }
    );

    // Показываем админ-меню если пользователь администратор
    if (isAdmin) {
      await ctx.reply('🔐 У вас есть доступ к админ-панели', { reply_markup: getAdminKeyboard() });
    }
  } catch (err) {
    logger.error('❌ Error in handleStart:', err);
    await ctx.reply('❌ Произошла ошибка. Пожалуйста, попробуйте снова позже.').catch(() => {});
  }
}

export async function handleMenu(ctx: Context) {
  try {
    await ctx.reply('📱 Главное меню:', { reply_markup: getMainKeyboard() });
  } catch (err) {
    logger.error('❌ Error in handleMenu:', err);
  }
}

export async function handleOrders(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId || telegramId <= 0) {
    logger.error('❌ Invalid telegram_id in handleOrders:', telegramId);
    return;
  }

  try {
    const orders = await query(
      `SELECT id, status, total, created_at FROM orders 
       WHERE user_telegram_id = $1 AND status != 'cancelled'
       ORDER BY created_at DESC LIMIT 5`,
      [telegramId]
    );

    if (orders.rows.length === 0) {
      await ctx.reply(
        '📭 У вас пока нет заказов.\n\nОткройте магазин, чтобы сделать первый заказ!',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛍️ Открыть магазин', web_app: { url: process.env.WEBAPP_URL || '' } }],
            ],
          },
        }
      );
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
        inline_keyboard: orders.rows
          .slice(0, 3)
          .map((order) => [
            { text: `Заказ #${order.id.slice(0, 8)}`, callback_data: `order:${order.id}` },
          ]),
      },
    });
  } catch (err) {
    logger.error('❌ Error in handleOrders:', err);
    await ctx.reply('❌ Ошибка при загрузке заказов. Попробуйте позже.').catch(() => {});
  }
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
