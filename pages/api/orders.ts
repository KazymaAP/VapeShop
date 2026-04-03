import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../lib/db';
import { Bot } from 'grammy';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { telegram_id, items, delivery_method, delivery_date, address, promo_code, discount } = req.body;

    if (!telegram_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const total = items.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0) - (discount || 0);

    const orderRes = await query(
      `INSERT INTO orders (user_telegram_id, status, total, delivery_method, delivery_date, address, promo_code, discount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [telegram_id, 'new', total, delivery_method, delivery_date, address, promo_code, discount || 0]
    );

    const order = orderRes.rows[0];

    for (const item of items) {
      await query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [order.id, item.product_id, item.quantity, item.price]
      );

      await query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
    }

    await query('DELETE FROM carts WHERE user_telegram_id = $1', [telegram_id]);

    const invoicePayload = order.id;
    const botId = process.env.TELEGRAM_BOT_ID || process.env.TELEGRAM_BOT_TOKEN!.split(':')[0];
    const invoiceUrl = await bot.api.createInvoiceLink(
      `Заказ #${order.id.slice(0, 8)}`,
      `Оплата заказа в VapeShop`,
      invoicePayload,
      botId,
      'XTR',
      [{ label: 'Итого', amount: Math.round(total) }]
    );

    res.status(200).json({ order_id: order.id, invoice_url: invoiceUrl });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Ошибка создания заказа' });
  }
}
