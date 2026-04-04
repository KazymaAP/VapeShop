import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth, getTelegramId, getTelegramIdFromRequest } from '@/lib/auth';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { Bot } from 'grammy';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Получаем текущего пользователя и проверяем, что он создаёт заказ от себя
    const currentTelegramId = await getTelegramIdFromRequest(req);
    const { telegram_id, items, delivery_method, delivery_date, address, promo_code, discount } = req.body;

    if (!telegram_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Проверяем, что пользователь создаёт заказ только от себя
    if (Number(telegram_id) !== currentTelegramId) {
      return res.status(403).json({ error: 'Forbidden: cannot create order for another user' });
    }

    // Валидируем, что все product_id существуют
    const productIds = items.map((i: any) => i.product_id);
    const productsRes = await query(
      'SELECT id, stock, price FROM products WHERE id = ANY($1::uuid[]) AND is_active = true',
      [productIds]
    );

    if (productsRes.rows.length !== items.length) {
      return res.status(400).json({ error: 'Some products not found or inactive' });
    }

    // Проверяем достаточность количества товаров
    const productMap = new Map(productsRes.rows.map(p => [p.id, p]));
    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for product ${item.product_id}. Available: ${product?.stock || 0}` 
        });
      }
    }

    const total = items.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0) - (discount || 0);

    if (total < 0) {
      return res.status(400).json({ error: 'Total price cannot be negative' });
    }

    // Создаём заказ
    const orderRes = await query(
      `INSERT INTO orders (user_telegram_id, status, total, delivery_method, delivery_date, address, promo_code, discount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [telegram_id, 'new', total, delivery_method, delivery_date, address, promo_code, discount || 0]
    );

    const order = orderRes.rows[0];

    // Добавляем товары в заказ и уменьшаем остаток
    for (const item of items) {
      await query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [order.id, item.product_id, item.quantity, item.price]
      );

      await query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
    }

    // Очищаем корзину
    await query('DELETE FROM carts WHERE user_telegram_id = $1', [telegram_id]);

    // Логируем создание заказа
    const adminTelegramId = getTelegramId(req);
    await query(
      `INSERT INTO audit_log (user_telegram_id, action, table_name, record_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminTelegramId, 'CREATE_ORDER', 'orders', order.id, JSON.stringify({ total, items_count: items.length })]
    ).catch(() => {});

    // Отправляем уведомление пользователю через бота
    try {
      await bot.api.sendMessage(
        telegram_id,
        `✅ Заказ создан!\n\n` +
        `Номер заказа: #${order.id.slice(0, 8)}\n` +
        `Сумма: ${total.toLocaleString('ru-RU')} ₽\n` +
        `Способ доставки: ${delivery_method}\n\n` +
        `💳 Для оплаты нажмите кнопку ниже`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '💳 Оплатить Telegram Stars', callback_data: `pay_order:${order.id}` }],
              [{ text: '📋 Мои заказы', url: `${process.env.WEBAPP_URL || ''}/orders` }],
            ]
          }
        }
      );
    } catch (err) {
      console.error('Failed to send bot notification:', err);
    }

    // Возвращаем order_id для frontend
    // Фронтенд должен использовать bot.openInvoice() для оплаты или показать инструкцию
    res.status(200).json({
      order_id: order.id,
      total,
      status: 'pending_payment',
      message: 'Заказ создан. Ожидается оплата через Telegram Stars'
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Ошибка создания заказа' });
  }
}

export default rateLimit(requireAuth(handler, ['buyer', 'customer']), RATE_LIMIT_PRESETS.order);

