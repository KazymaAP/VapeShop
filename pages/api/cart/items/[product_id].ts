import { logger } from '@/lib/logger';
import type { NextApiRequest, NextApiResponse } from 'next';
import { query, transaction } from '@/lib/db';
import { getTelegramIdFromRequest } from '@/lib/auth';

/**
 * PATCH /api/cart/items/[product_id]
 * Обновить количество товара в корзине или удалить его
 *
 * Body:
 * - quantity: number (если 0, удалит товар)
 * - remove: boolean (если true, удалит товар)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const telegramId = await getTelegramIdFromRequest(req);
    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { product_id } = req.query;

    if (!product_id || typeof product_id !== 'string') {
      return res.status(400).json({ error: 'Invalid product_id' });
    }

    if (req.method === 'PATCH') {
      return handleUpdate(telegramId, product_id, req, res);
    } else if (req.method === 'DELETE') {
      return handleRemove(telegramId, product_id, res);
    }
  } catch (err) {
    logger.error('Cart item error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleUpdate(
  telegramId: number,
  productId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { quantity, remove } = req.body;

    // Если remove=true или quantity=0, удаляем товар
    if (remove || quantity === 0) {
      return handleRemove(telegramId, productId, res);
    }

    // Валидация количества
    if (typeof quantity !== 'number' || quantity < 1 || quantity > 1000) {
      return res.status(400).json({
        error: 'Invalid quantity. Must be between 1 and 1000',
      });
    }

    // Проверяем, что товар существует
    const productCheck = await query(
      `SELECT id, stock FROM products WHERE id = $1 AND is_active = true`,
      [productId]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = productCheck.rows[0];
    if (quantity > product.stock) {
      return res.status(400).json({
        error: 'Insufficient stock',
        available: product.stock,
      });
    }

    // Обновляем количество товара в корзине
    // Используем JavaScript для манипуляции JSONB вместо сложного SQL
    await transaction(async (client) => {
      // Получаем текущую корзину
      const cartResult = await client.query(`SELECT items FROM carts WHERE user_telegram_id = $1`, [
        telegramId,
      ]);

      if (cartResult.rows.length === 0) {
        throw new Error('Cart not found');
      }

      // Парсим существующие items
      let items: Array<{ product_id: string; quantity: number; [key: string]: unknown }> =
        cartResult.rows[0].items || [];
      if (typeof items === 'string') {
        items = JSON.parse(items);
      }

      // Находим и обновляем товар
      const itemIndex = items.findIndex((item) => String(item.product_id) === productId);
      if (itemIndex >= 0) {
        items[itemIndex] = {
          ...items[itemIndex],
          quantity: quantity,
          product_id: productId,
        };
      } else {
        throw new Error('Item not in cart');
      }

      // Сохраняем обновленную корзину
      await client.query(
        `UPDATE carts SET items = $1, updated_at = NOW() WHERE user_telegram_id = $2`,
        [JSON.stringify(items), telegramId]
      );
    });

    // Возвращаем обновленный товар
    const result = await query(
      `SELECT ci.product_id, ci.quantity, p.name, p.price, p.stock
       FROM carts c,
            LATERAL jsonb_array_elements(c.items) AS ci
       JOIN products p ON p.id::text = ci->>'product_id'
       WHERE c.user_telegram_id = $1 AND ci->>'product_id' = $2`,
      [telegramId, productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    const item = result.rows[0];
    res.status(200).json({
      success: true,
      data: {
        product_id: item.product_id,
        name: item.name,
        price: parseFloat(item.price),
        quantity: item.quantity,
        stock: item.stock,
      },
      message: 'Cart item updated',
    });
  } catch (err) {
    logger.error('Update cart item error:', err);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
}

async function handleRemove(telegramId: number, productId: string, res: NextApiResponse) {
  try {
    // Удаляем товар из JSONB массива используя JavaScript
    await transaction(async (client) => {
      // Получаем текущую корзину
      const cartResult = await client.query(`SELECT items FROM carts WHERE user_telegram_id = $1`, [
        telegramId,
      ]);

      if (cartResult.rows.length === 0) {
        throw new Error('Cart not found');
      }

      // Парсим существующие items
      let items: Array<{ product_id: string; quantity: number; [key: string]: unknown }> =
        cartResult.rows[0].items || [];
      if (typeof items === 'string') {
        items = JSON.parse(items);
      }

      // Фильтруем товар из массива
      items = items.filter((item) => String(item.product_id) !== productId);

      // Сохраняем обновленную корзину
      await client.query(
        `UPDATE carts SET items = $1, updated_at = NOW() WHERE user_telegram_id = $2`,
        [JSON.stringify(items), telegramId]
      );
    });

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
    });
  } catch (err) {
    logger.error('Remove cart item error:', err);
    res.status(500).json({ error: 'Failed to remove cart item' });
  }
}
