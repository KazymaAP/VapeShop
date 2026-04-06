import { InlineKeyboard } from 'grammy';

// Ensure WEBAPP_URL is configured
const WEBAPP_URL = process.env.WEBAPP_URL;
if (!WEBAPP_URL) {
  throw new Error('WEBAPP_URL environment variable is required for bot keyboards');
}

export function getMainKeyboard() {
  return {
    keyboard: [
      [
        {
          text: '🛍️ Открыть магазин',
          web_app: { url: WEBAPP_URL },
        },
      ],
      [{ text: '📋 Мои заказы' }, { text: '🎁 Реферальная ссылка' }],
      [{ text: '❓ Помощь' }, { text: '📖 FAQ' }],
    ],
    resize_keyboard: true,
  };
}

export function getAdminKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📊 Статистика', callback_data: 'admin:stats' },
        { text: '📦 Товары', callback_data: 'admin:products' },
      ],
      [
        { text: '📋 Заказы', callback_data: 'admin:orders' },
        { text: '👥 Пользователи', callback_data: 'admin:users' },
      ],
      [
        { text: '📁 Импорт CSV', callback_data: 'admin:import' },
        { text: '📢 Рассылка', callback_data: 'admin:broadcast' },
      ],
      [
        {
          text: '🌐 Открыть админку',
          web_app: { url: `${WEBAPP_URL}/admin` },
        },
      ],
    ],
  };
}

export function getOrderKeyboard(orderId: string) {
  return new InlineKeyboard()
    .text('🔄 Повторить заказ', `repeat:${orderId}`)
    .row()
    .text('❌ Отменить', `cancel:${orderId}`)
    .row()
    .url('✉️ Написать менеджеру', 'https://t.me/support');
}
