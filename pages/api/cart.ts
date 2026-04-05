import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getTelegramIdFromRequest } from '@/lib/auth';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  // Получаем текущего пользователя для проверки принадлежности
  const currentTelegramId = await getTelegramIdFromRequest(req);
  if (!currentTelegramId && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (method === 'GET') {
    try {
      const { telegram_id } = req.query;
      if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

      // КРИТИЧЕСКАЯ ЗАЩИТА: Проверяем, что пользователь запрашивает только свою корзину
      if (Number(telegram_id) !== currentTelegramId) {
        return res.status(403).json({ error: 'Forbidden: cannot access another user\'s cart' });
      }

      const result = await query(
        `SELECT ci.product_id, ci.quantity, p.name, p.price, p.images, p.stock
         FROM carts c
         CROSS JOIN LATERAL jsonb_array_elements(c.items) AS ci
         JOIN products p ON (ci->>'product_id')::uuid = p.id
         WHERE c.user_telegram_id = $1`,
        [telegram_id]
      );

      const items = result.rows.map((row) => ({
        product_id: row.product_id,
        name: row.name,
        price: parseFloat(row.price),
        quantity: parseInt(row.quantity, 10),
        image: row.images?.[0] || null,
        stock: row.stock,
      }));

      res.status(200).json({ items });
    } catch {
      res.status(500).json({ error: 'Ошибка загрузки корзины' });
    }
  } else if (method === 'POST') {
    try {
      const { telegram_id, product_id, quantity } = req.body;
      if (!telegram_id || !product_id) return res.status(400).json({ error: 'Missing fields' });

      // Проверяем принадлежность и валидность quantity
      if (telegram_id !== currentTelegramId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid quantity' });
      }

      const cartRes = await query('SELECT items FROM carts WHERE user_telegram_id = $1', [telegram_id]);

      if (cartRes.rows.length === 0) {
        await query(
          'INSERT INTO carts (user_telegram_id, items, updated_at) VALUES ($1, $2, NOW())',
          [telegram_id, JSON.stringify([{ product_id, quantity }])]
        );
      } else { const items = cartRes.rows[0].items || [];
        const existingIdx = items.findIndex((item: { product_id: string }) => item.product_id === product_id);

        if (existingIdx >= 0) {
          items[existingIdx].quantity += quantity;
        } else {
          items.push({ product_id, quantity });
        }

        await query(
          'UPDATE carts SET items = $1, updated_at = NOW() WHERE user_telegram_id = $2',
          [JSON.stringify(items), telegram_id]
        );
      }

      res.status(200).json({ success: true });
    } catch {
      res.status(500).json({ error: 'Ошибка добавления в корзину' });
    }
  } else if (method === 'PUT') {
    try {
      const { telegram_id, product_id, quantity } = req.body;
      if (!telegram_id || !product_id) return res.status(400).json({ error: 'Missing fields' });

      // Проверяем принадлежность и валидность quantity
      if (telegram_id !== currentTelegramId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (quantity !== undefined && (typeof quantity !== 'number' || quantity < 0)) {
        return res.status(400).json({ error: 'Invalid quantity' });
      }

      const cartRes = await query('SELECT items FROM carts WHERE user_telegram_id = $1', [telegram_id]);
      if (cartRes.rows.length === 0) return res.status(404).json({ error: 'Cart not found' });

      const items = cartRes.rows[0].items || [];
      const idx = items.findIndex((item: { product_id: string }) => item.product_id === product_id);

      if (idx >= 0) {
        if (quantity <= 0) {
          items.splice(idx, 1);
        } else {
          items[idx].quantity = quantity;
        }
      }

      await query(
        'UPDATE carts SET items = $1, updated_at = NOW() WHERE user_telegram_id = $2',
        [JSON.stringify(items), telegram_id]
      );

      res.status(200).json({ success: true });
    } catch {
      res.status(500).json({ error: 'Ошибка обновления корзины' });
    }
  } else if (method === 'DELETE') {
    try {
      const { telegram_id, product_id } = req.query;

      // Проверяем принадлежность
      if (telegram_id && Number(telegram_id) !== currentTelegramId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (!product_id) {
        await query('DELETE FROM carts WHERE user_telegram_id = $1', [telegram_id]);
        return res.status(200).json({ success: true });
      }

      const cartRes = await query('SELECT items FROM carts WHERE user_telegram_id = $1', [telegram_id]);
      if (cartRes.rows.length === 0) return res.status(404).json({ error: 'Cart not found' });

      let items = cartRes.rows[0].items || [];
      items = items.filter((item: { product_id: string }) => item.product_id !== product_id);

      await query(
        'UPDATE carts SET items = $1, updated_at = NOW() WHERE user_telegram_id = $2',
        [JSON.stringify(items), telegram_id]
      );

      res.status(200).json({ success: true });
    } catch {
      res.status(500).json({ error: 'Ошибка удаления из корзины' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default rateLimit(handler, RATE_LIMIT_PRESETS.normal);



