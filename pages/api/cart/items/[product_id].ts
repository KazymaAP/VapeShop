import { logger } from '@/lib/logger';
import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
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
    // Корзина хранится в JSONB массиве items: [{ product_id, quantity, ... }]
    await query(
      `UPDATE carts
       SET items = jsonb_set(
         COALESCE(items, '[]'::jsonb),
         ARRAY(
           SELECT DISTINCT idx::text[]
           FROM jsonb_array_elements(COALESCE(items, '[]'::jsonb)) WITH ORDINALITY arr(elem, idx)
           WHERE elem->>'product_id' = $2
         ),
         jsonb_build_object('product_id', $2, 'quantity', $3, 'added_at', (items->(
           SELECT idx - 1 FROM jsonb_array_elements(COALESCE(items, '[]'::jsonb)) WITH ORDINALITY arr(elem, idx)
           WHERE elem->>'product_id' = $2 LIMIT 1
         ))->>'added_at')
       ),
       updated_at = NOW()
       WHERE user_telegram_id = $1`,
      [telegramId, productId, quantity]
    );

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

async function handleRemove(
  telegramId: number,
  productId: string,
  res: NextApiResponse
) {
  try {
    // Удаляем товар из JSONB массива
    await query(
      `UPDATE carts
       SET items = items - (
         SELECT idx FROM jsonb_array_elements(items) WITH ORDINALITY arr(elem, idx)
         WHERE elem->>'product_id' = $2
       ),
       updated_at = NOW()
       WHERE user_telegram_id = $1`,
      [telegramId, productId]
    );

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
    });
  } catch (err) {
    logger.error('Remove cart item error:', err);
    res.status(500).json({ error: 'Failed to remove cart item' });
  }
}
