import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../lib/db';
import { getTelegramIdFromRequest } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Получаем текущего пользователя для проверки принадлежности
  const currentTelegramId = await getTelegramIdFromRequest(req);
  if (!currentTelegramId && (req.method === 'POST' || req.method === 'DELETE')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { product_id } = req.query;
      if (!product_id) return res.status(400).json({ error: 'product_id required' });

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
      res.status(500).json({ error: 'Ошибка загрузки отзывов' });
    }
  } else if (req.method === 'POST') {
    try {
      const { product_id, user_telegram_id, comment } = req.body;
      if (!product_id || !user_telegram_id || !comment) {
        return res.status(400).json({ error: 'Missing fields' });
      }

      // Проверяем принадлежность - пользователь не может оставить отзыв от имени другого
      if (user_telegram_id !== currentTelegramId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const result = await query(
        `INSERT INTO reviews (product_id, user_telegram_id, comment) VALUES ($1, $2, $3) RETURNING *`,
        [product_id, user_telegram_id, comment]
      );

      res.status(200).json({ review: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: 'Ошибка создания отзыва' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });

      // Проверяем принадлежность - пользователь может удалить только свой отзыв
      const reviewRes = await query('SELECT user_telegram_id FROM reviews WHERE id = $1', [id]);
      if (!reviewRes.rows[0] || reviewRes.rows[0].user_telegram_id !== currentTelegramId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await query('DELETE FROM reviews WHERE id = $1', [id]);

      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Ошибка удаления отзыва' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
