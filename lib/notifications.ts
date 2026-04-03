import { Bot } from 'grammy';
import { query } from './db';

/**
 * Система уведомлений для VapeShop
 * 
 * Функционал:
 * - Отправка уведомлений через Telegram
 * - Управление настройками уведомлений
 * - Логирование всех отправленных сообщений
 * - Поддержка разных типов событий (заказ, статус, корзина)
 */

// Импортируем bot из api/bot.ts
// В runtime это будет инстанс grammY Bot
let botInstance: Bot | null = null;

export function setBotInstance(bot: Bot) {
  botInstance = bot;
}

export function getBot(): Bot {
  if (!botInstance) {
    throw new Error('Bot instance not initialized. Call setBotInstance first.');
  }
  return botInstance;
}

/**
 * Проверяет, включено ли уведомление для данного типа события
 */
export async function isNotificationEnabled(eventType: string): Promise<boolean> {
  try {
    const result = await query(
      'SELECT is_enabled FROM notification_settings WHERE event_type = $1',
      [eventType]
    );

    if (result.rows.length === 0) {
      return true; // По умолчанию включено
    }

    return result.rows[0].is_enabled === true;
  } catch (err) {
    console.error('isNotificationEnabled error:', err);
    return true; // На случай ошибки - включено
  }
}

/**
 * Получает целевую роль для типа события
 */
export async function getNotificationTargetRole(eventType: string): Promise<string | null> {
  try {
    const result = await query(
      'SELECT target_role FROM notification_settings WHERE event_type = $1',
      [eventType]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].target_role;
  } catch (err) {
    console.error('getNotificationTargetRole error:', err);
    return null;
  }
}

/**
 * Отправляет уведомление конкретному пользователю
 * 
 * @param telegramId ID пользователя в Telegram
 * @param text Текст сообщения
 * @param extra Дополнительные параметры (reply_markup, parse_mode и т.д.)
 * @param eventType Тип события (для логирования)
 * @returns true если успешно, false если ошибка
 */
export async function sendNotification(
  telegramId: number,
  text: string,
  extra?: any,
  eventType?: string
): Promise<boolean> {
  try {
    if (!botInstance) {
      console.error('Bot instance not initialized');
      return false;
    }

    // Отправляем сообщение
    await botInstance.api.sendMessage(telegramId, text, {
      parse_mode: 'HTML',
      ...extra,
    });

    // Логируем в БД
    if (eventType) {
      await query(
        `INSERT INTO notification_history (user_telegram_id, event_type, message_text, status)
         VALUES ($1, $2, $3, $4)`,
        [telegramId, eventType, text, 'sent']
      ).catch(err => console.error('Logging notification error:', err));
    }

    return true;
  } catch (err) {
    console.error(`sendNotification error (${telegramId}):`, err);

    // Логируем ошибку в БД
    if (eventType) {
      await query(
        `INSERT INTO notification_history (user_telegram_id, event_type, message_text, status, error_message)
         VALUES ($1, $2, $3, $4, $5)`,
        [telegramId, eventType, text, 'failed', String(err)]
      ).catch(logErr => console.error('Logging error notification error:', logErr));
    }

    return false;
  }
}

/**
 * Отправляет уведомление всем пользователям с определённой ролью
 * 
 * @param role Роль пользователей (admin, manager, seller, buyer)
 * @param text Текст сообщения
 * @param extra Дополнительные параметры
 * @param eventType Тип события
 * @returns Объект с статистикой отправки
 */
export async function broadcastNotification(
  role: string,
  text: string,
  extra?: any,
  eventType?: string
): Promise<{ sent: number; failed: number }> {
  try {
    // Получаем всех пользователей с этой ролью
    const result = await query(
      'SELECT telegram_id FROM users WHERE role = $1 AND is_blocked = false',
      [role]
    );

    let sent = 0;
    let failed = 0;

    // Отправляем каждому
    for (const row of result.rows) {
      const success = await sendNotification(
        row.telegram_id,
        text,
        extra,
        eventType
      );

      if (success) {
        sent++;
      } else {
        failed++;
      }

      // Добавляем небольшую задержку чтобы не заспамить Telegram
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Broadcast complete: sent=${sent}, failed=${failed}`);
    return { sent, failed };
  } catch (err) {
    console.error('broadcastNotification error:', err);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Отправляет уведомление о новом заказе админам
 */
export async function notifyAdminsNewOrder(
  orderId: string,
  totalPrice: number,
  username: string,
  itemsCount: number
): Promise<boolean> {
  try {
    // Проверяем включено ли уведомление
    if (!(await isNotificationEnabled('order_new_admin'))) {
      return false;
    }

    const shortId = orderId.substring(0, 8).toUpperCase();
    const text = `🆕 <b>Новый заказ #${shortId}</b>\n\n` +
      `👤 От: @${username}\n` +
      `💰 Сумма: ${totalPrice} ⭐️\n` +
      `📦 Товаров: ${itemsCount} шт.\n\n` +
      `<a href="${process.env.WEBAPP_URL}/admin/orders">Просмотреть заказ →</a>`;

    const result = await broadcastNotification(
      'admin',
      text,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Просмотреть заказ', web_app: { url: `${process.env.WEBAPP_URL}/admin/orders` } }],
          ],
        },
      },
      'order_new_admin'
    );

    return result.sent > 0;
  } catch (err) {
    console.error('notifyAdminsNewOrder error:', err);
    return false;
  }
}

/**
 * Отправляет уведомление покупателю о принятом заказе
 */
export async function notifyBuyerOrderCreated(
  telegramId: number,
  orderId: string,
  totalPrice: number
): Promise<boolean> {
  try {
    if (!(await isNotificationEnabled('order_status_changed_buyer'))) {
      return false;
    }

    const shortId = orderId.substring(0, 8).toUpperCase();
    const text = `✅ <b>Заказ #${shortId} оплачен</b>\n\n` +
      `Спасибо за покупку! 🎉\n` +
      `💰 Сумма: ${totalPrice} ⭐️\n\n` +
      `Ваш заказ принят в обработку и вскоре будет подтверждён.\n` +
      `Мы уведомим вас о любых изменениях.`;

    return await sendNotification(
      telegramId,
      text,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Мой заказ', web_app: { url: `${process.env.WEBAPP_URL}/orders/${orderId}` } }],
          ],
        },
      },
      'order_status_changed_buyer'
    );
  } catch (err) {
    console.error('notifyBuyerOrderCreated error:', err);
    return false;
  }
}

/**
 * Отправляет уведомление о изменении статуса заказа
 */
export async function notifyBuyerOrderStatus(
  telegramId: number,
  orderId: string,
  newStatus: string,
  code6digit?: string
): Promise<boolean> {
  try {
    if (!(await isNotificationEnabled('order_status_changed_buyer'))) {
      return false;
    }

    const shortId = orderId.substring(0, 8).toUpperCase();
    let text = '';
    let eventType = 'order_status_changed_buyer';

    switch (newStatus) {
      case 'confirmed':
        text = `📦 <b>Заказ #${shortId} подтверждён</b>\n\n` +
          `Спасибо! Ваш заказ начал обработку.\n` +
          `Мы свяжемся с вами для уточнения деталей доставки.`;
        break;

      case 'readyship':
        eventType = 'order_ready_ship';
        text = `🚀 <b>Заказ #${shortId} готов к выдаче</b>\n\n` +
          `Ваш заказ подготовлен и ждёт передачи курьеру.\n\n` +
          `🔐 <b>Ваш код подтверждения:</b> <code>${code6digit || 'N/A'}</code>\n\n` +
          `Передайте этот код курьеру при получении.`;
        break;

      case 'shipped':
        text = `🚚 <b>Заказ #${shortId} передан курьеру</b>\n\n` +
          `Ваш заказ в пути! 📍\n` +
          `Курьер свяжется с вами для уточнения времени доставки.`;
        break;

      case 'done':
        text = `✅ <b>Заказ #${shortId} выполнен</b>\n\n` +
          `Спасибо за покупку! 🎉\n\n` +
          `Оставьте отзыв, чтобы помочь нам улучшиться.\n` +
          `Ваше мнение очень важно!`;
        break;

      default:
        return false;
    }

    return await sendNotification(
      telegramId,
      text,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Мой заказ', web_app: { url: `${process.env.WEBAPP_URL}/orders/${orderId}` } }],
          ],
        },
      },
      eventType
    );
  } catch (err) {
    console.error('notifyBuyerOrderStatus error:', err);
    return false;
  }
}

/**
 * Отправляет напоминание о брошенной корзине
 */
export async function notifyAbandonedCart(
  telegramId: number,
  itemsCount: number,
  totalPrice: number
): Promise<boolean> {
  try {
    if (!(await isNotificationEnabled('abandoned_cart'))) {
      return false;
    }

    const text = `💔 <b>У вас остались товары в корзине</b>\n\n` +
      `📦 Товаров: ${itemsCount} шт.\n` +
      `💰 Сумма: ${totalPrice} ⭐️\n\n` +
      `Не потеряйте идеальную покупку! Оформите заказ прямо сейчас.`;

    const success = await sendNotification(
      telegramId,
      text,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🛒 Перейти в корзину', web_app: { url: `${process.env.WEBAPP_URL}/cart` } }],
          ],
        },
      },
      'abandoned_cart'
    );

    // Если успешно, обновляем статус в БД
    if (success) {
      await query(
        `UPDATE abandoned_carts
         SET reminder_sent = true, reminder_sent_at = NOW()
         WHERE user_telegram_id = $1`,
        [telegramId]
      ).catch(err => console.error('Update abandoned cart error:', err));
    }

    return success;
  } catch (err) {
    console.error('notifyAbandonedCart error:', err);
    return false;
  }
}

/**
 * Получает статистику уведомлений
 */
export async function getNotificationStats(
  daysBack: number = 7
): Promise<{
  total_sent: number;
  total_failed: number;
  by_event: Array<{ event_type: string; count: number }>;
}> {
  try {
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    // Всего отправлено
    const totalResult = await query(
      `SELECT COUNT(*) as count FROM notification_history
       WHERE sent_at >= $1 AND status = 'sent'`,
      [since]
    );
    const total_sent = parseInt(totalResult.rows[0]?.count || 0);

    // Всего ошибок
    const failedResult = await query(
      `SELECT COUNT(*) as count FROM notification_history
       WHERE sent_at >= $1 AND status = 'failed'`,
      [since]
    );
    const total_failed = parseInt(failedResult.rows[0]?.count || 0);

    // По типам событий
    const byEventResult = await query(
      `SELECT event_type, COUNT(*) as count FROM notification_history
       WHERE sent_at >= $1 AND status = 'sent'
       GROUP BY event_type
       ORDER BY count DESC`,
      [since]
    );
    const by_event = byEventResult.rows || [];

    return {
      total_sent,
      total_failed,
      by_event,
    };
  } catch (err) {
    console.error('getNotificationStats error:', err);
    return {
      total_sent: 0,
      total_failed: 0,
      by_event: [],
    };
  }
}

/**
 * Экспортируем публичный интерфейс
 */
export default {
  sendNotification,
  broadcastNotification,
  notifyAdminsNewOrder,
  notifyBuyerOrderCreated,
  notifyBuyerOrderStatus,
  notifyAbandonedCart,
  isNotificationEnabled,
  getNotificationTargetRole,
  getNotificationStats,
};
