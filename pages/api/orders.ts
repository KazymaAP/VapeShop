import type { NextApiRequest, NextApiResponse } from 'next';
import { query, transaction } from '@/lib/db';
import { getTelegramIdFromRequest, isUserBlocked, requireAuth } from '@/lib/auth';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { withCSRFProtection } from '@/lib/csrf';
import { Bot } from 'grammy';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 🔒 ВАЛИДАЦИЯ: Проверяем входные данные
    const { telegram_id, items, delivery_method, delivery_date, address, promo_code, discount } =
      req.body;

    if (!telegram_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['Missing or invalid required fields: telegram_id, items'],
      });
    }

    // 🔒 Получаем текущего пользователя и проверяем, что он создаёт заказ от себя
    // CSRF защита проверяется в middleware
    const currentTelegramId = await getTelegramIdFromRequest(req);

    if (!currentTelegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // ⚠️ ЗАЩИТА: Проверяем, не заблокирован ли пользователь
    const blocked = await isUserBlocked(currentTelegramId);
    if (blocked) {
      return res.status(403).json({ error: 'Ваш аккаунт заблокирован. Обратитесь в поддержку.' });
    }

    if (!telegram_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Проверяем, что пользователь создаёт заказ только от себя
    if (Number(telegram_id) !== currentTelegramId) {
      return res.status(403).json({ error: 'Forbidden: cannot create order for another user' });
    }

    // Валидируем, что все product_id существуют
    const productIds: string[] = items.map((i: Record<string, unknown>) => String(i.product_id));
    const productsRes = await query(
      'SELECT id, stock, price FROM products WHERE id = ANY($1::uuid[]) AND is_active = true',
      [productIds]
    );

    if (productsRes.rows.length !== items.length) {
      return res.status(400).json({ error: 'Some products not found or inactive' });
    }

    // Проверяем достаточность количества товаров
    const productMap = new Map(productsRes.rows.map((p) => [p.id, p]));
    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for product ${item.product_id}. Available: ${product?.stock || 0}`,
        });
      }
    }

    const total =
      items.reduce(
        (sum: number, item: { price: number; quantity: number }) =>
          sum + item.price * item.quantity,
        0
      ) - (discount || 0);

    if (total < 0) {
      return res.status(400).json({ error: 'Total price cannot be negative' });
    }

    // 🔄 ЗАЩИТА: Используем транзакцию для создания заказа и уменьшения остатков
    // Это предотвращает race condition, когда несколько запросов создают заказы одновременно
    const order = await transaction(async (client) => {
      // Получаем товары с блокировкой (FOR UPDATE) - запрос будет заблокирован до конца транзакции
      const lockedProducts = await client.query(
        'SELECT id, stock, price FROM products WHERE id = ANY($1::uuid[]) AND is_active = true FOR UPDATE',
        [productIds]
      );

      // Перепроверяем количество товара после получения блокировки
      const lockedProductMap = new Map(lockedProducts.rows.map((p) => [p.id, p]));
      for (const item of items) {
        const product = lockedProductMap.get(item.product_id);
        if (!product || product.stock < item.quantity) {
          throw new Error(
            `Insufficient stock for product ${item.product_id}. Available: ${product?.stock || 0}`
          );
        }
      }

      // Создаём заказ
      const orderRes = await client.query(
        `INSERT INTO orders (user_telegram_id, status, total, delivery_method, delivery_date, address, promo_code, discount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          telegram_id,
          'new',
          total,
          delivery_method,
          delivery_date,
          address,
          promo_code,
          discount || 0,
        ]
      );

      const createdOrder = orderRes.rows[0];

      // Добавляем товары в заказ и уменьшаем остаток
      for (const item of items) {
        await client.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
          [createdOrder.id, item.product_id, item.quantity, item.price]
        );

        await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [
          item.quantity,
          item.product_id,
        ]);
      }

      // Очищаем корзину
      await client.query('DELETE FROM carts WHERE user_telegram_id = $1', [telegram_id]);

      return createdOrder;
    });

    // Логируем создание заказа (используем уже проверенный currentTelegramId)
    await query(
      `INSERT INTO audit_log (user_telegram_id, action, details, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [
        currentTelegramId,
        'CREATE_ORDER',
        JSON.stringify({ order_id: order.id, total, items_count: items.length }),
      ]
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
            ],
          },
        }
      );
    } catch (err) {
      console.error('Failed to send bot notification:', err);
    }

    // Возвращаем order_id для frontend
    res.status(200).json({
      order_id: order.id,
      total,
      status: 'pending_payment',
      message: 'Заказ создан. Ожидается оплата через Telegram Stars',
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Ошибка создания заказа' });
  }
}

export default rateLimit(
  withCSRFProtection(requireAuth(handler, ['buyer', 'customer'])),
  RATE_LIMIT_PRESETS.order
);
