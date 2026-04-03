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
      const { telegram_id } = req.query;
      if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

      const result = await query(
        `SELECT p.*, b.name as brand_name, c.name as category_name
         FROM wishlist w
         JOIN products p ON w.product_id = p.id
         LEFT JOIN brands b ON p.brand_id = b.id
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE w.user_telegram_id = $1
         ORDER BY w.added_at DESC`,
        [telegram_id]
      );

      res.status(200).json({ products: result.rows });
    } catch (err) {
      res.status(500).json({ error: 'Ошибка загрузки избранного' });
    }
  } else if (req.method === 'POST') {
    try {
      const { telegram_id, product_id } = req.body;
      if (!telegram_id || !product_id) return res.status(400).json({ error: 'Missing fields' });

      // Проверяем принадлежность
      if (telegram_id !== currentTelegramId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await query(
        `INSERT INTO wishlist (user_telegram_id, product_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [telegram_id, product_id]
      );

      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Ошибка добавления в избранное' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { telegram_id, product_id } = req.query;
      if (!telegram_id || !product_id) return res.status(400).json({ error: 'Missing fields' });

      // Проверяем принадлежность
      if (parseInt(telegram_id as string) !== currentTelegramId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await query('DELETE FROM wishlist WHERE user_telegram_id = $1 AND product_id = $2', [telegram_id, product_id]);

      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Ошибка удаления из избранного' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
