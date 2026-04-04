/**
 * API для отложенной корзины (Save for later)
 * GET /api/saved-for-later - получить сохранённые товары
 * POST /api/saved-for-later - добавить товар в отложенное
 * DELETE /api/saved-for-later?product_id=X - удалить товар из отложенного
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const telegramId = (req as any).telegramId || req.headers['x-telegram-id'];

  if (!telegramId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT 
          sf.id,
          sf.product_id,
          sf.quantity,
          sf.notes,
          sf.saved_at,
          p.name,
          p.price,
          p.image_url,
          p.stock
         FROM saved_for_later sf
         JOIN products p ON sf.product_id = p.id
         WHERE sf.user_telegram_id = $1 AND p.is_active = true
         ORDER BY sf.saved_at DESC`,
        [telegramId]
      );

      res.status(200).json({
        success: true,
        data: result.rows,
        count: result.rows.length,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Failed to get saved items' });
    }
  } else if (req.method === 'POST') {
    const { product_id, quantity = 1, notes } = req.body;

    if (!product_id) {
      return res.status(400).json({ success: false, error: 'product_id is required' });
    }

    try {
      // Проверяем существование товара
      const productCheck = await query(
        `SELECT id FROM products WHERE id = $1 AND is_active = true`,
        [product_id]
      );

      if (productCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }

      // Добавляем или обновляем в saved_for_later
      const result = await query(
        `INSERT INTO saved_for_later (user_telegram_id, product_id, quantity, notes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_telegram_id, product_id) DO UPDATE SET
           quantity = $3,
           notes = $4
         RETURNING id, product_id, quantity`,
        [telegramId, product_id, quantity, notes || null]
      );

      res.status(200).json({
        success: true,
        data: result.rows[0],
        message: 'Item saved for later',
        timestamp: Date.now()
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Failed to save item' });
    }
  } else if (req.method === 'DELETE') {
    const { product_id } = req.query;

    if (!product_id) {
      return res.status(400).json({ success: false, error: 'product_id is required' });
    }

    try {
      await query(
        `DELETE FROM saved_for_later 
         WHERE user_telegram_id = $1 AND product_id = $2`,
        [telegramId, product_id]
      );

      res.status(200).json({
        success: true,
        message: 'Item removed from saved',
        timestamp: Date.now()
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Failed to remove item' });
    }
  } else if (req.method === 'PUT') {
    // Перенести в корзину
    const { product_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({ success: false, error: 'product_id is required' });
    }

    try {
      await query('BEGIN');
      try {
        // Добавляем в корзину
        await query(
          `INSERT INTO cart_items (user_telegram_id, product_id, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_telegram_id, product_id) DO UPDATE SET
             quantity = cart_items.quantity + $3`,
          [telegramId, product_id, quantity]
        );

        // Удаляем из saved_for_later
        await query(
          `DELETE FROM saved_for_later 
           WHERE user_telegram_id = $1 AND product_id = $2`,
          [telegramId, product_id]
        );

        await query('COMMIT');

        res.status(200).json({
          success: true,
          message: 'Item moved to cart',
          timestamp: Date.now()
        });
      } catch (err) {
        await query('ROLLBACK');
        throw err;
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Failed to move item' });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['customer']);
