import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getTelegramIdFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Получаем текущего пользователя для проверки принадлежности
  const currentTelegramId = await getTelegramIdFromRequest(req);

  if (req.method === 'GET') {
    try {
      const { product_id } = req.query;
      if (!product_id) return res.status(400).json({ error: 'product_id required' });

      // Проверяем, что товар существует и активен
      const productCheck = await query('SELECT id FROM products WHERE id = $1 AND is_active = true', [product_id]);
      if (productCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const result = await query(
        `SELECT r.*, u.first_name, u.username
         FROM reviews r
         LEFT JOIN users u ON r.user_telegram_id = u.telegram_id
         WHERE r.product_id = $1
         ORDER BY r.created_at DESC`,
        [product_id]
      );

      res.status(200).json({ reviews: result.rows });
    } catch (err) {
      console.error('Get reviews error:', err);
      res.status(500).json({ error: 'Ошибка загрузки отзывов' });
    }
  } else if (req.method === 'POST') {
    try {
      if (!currentTelegramId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { product_id, comment, rating } = req.body;
      if (!product_id || !comment) {
        return res.status(400).json({ error: 'Missing required fields: product_id, comment' });
      }

      // Проверяем, что товар существует и активен
      const productCheck = await query('SELECT id FROM products WHERE id = $1 AND is_active = true', [product_id]);
      if (productCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Валидируем рейтинг (если задан)
      let validRating = null;
      if (rating !== undefined && rating !== null) {
        const ratingNum = parseInt(rating);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
          return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }
        validRating = ratingNum;
      }

      // Проверяем, что пользователь может оставлять отзывы (куплил товар?)
      const orderCheck = await query(
        `SELECT 1 FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         WHERE o.user_telegram_id = $1 AND oi.product_id = $2 LIMIT 1`,
        [currentTelegramId, product_id]
      );

      if (orderCheck.rows.length === 0) {
        return res.status(403).json({ error: 'You can only review products you have purchased' });
      }

      const result = await query(
        `INSERT INTO reviews (product_id, user_telegram_id, comment, rating) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [product_id, currentTelegramId, comment, validRating]
      );

      // Логирование
      await query(
        `INSERT INTO audit_log (user_telegram_id, action, details, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [currentTelegramId, 'REVIEW_CREATED', `Product ID: ${product_id}`]
      );

      res.status(200).json({ review: result.rows[0] });
    } catch (err) {
      console.error('Create review error:', err);
      res.status(500).json({ error: 'Ошибка создания отзыва' });
    }
  } else if (req.method === 'DELETE') {
    try {
      if (!currentTelegramId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });

      // Проверяем принадлежность - пользователь может удалить только свой отзыв
      const reviewRes = await query('SELECT user_telegram_id FROM reviews WHERE id = $1', [id]);
      if (reviewRes.rows.length === 0) {
        return res.status(404).json({ error: 'Review not found' });
      }

      if (reviewRes.rows[0].user_telegram_id !== currentTelegramId) {
        return res.status(403).json({ error: 'Forbidden: you can only delete your own reviews' });
      }

      await query('DELETE FROM reviews WHERE id = $1', [id]);

      // Логирование
      await query(
        `INSERT INTO audit_log (user_telegram_id, action, details, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [currentTelegramId, 'REVIEW_DELETED', `Review ID: ${id}`]
      );

      res.status(200).json({ success: true });
    } catch (err) {
      console.error('Delete review error:', err);
      res.status(500).json({ error: 'Ошибка удаления отзыва' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

