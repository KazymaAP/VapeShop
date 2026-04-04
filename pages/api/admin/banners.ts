import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT id, image_url, link, title, description, order_index, is_active, updated_at
         FROM banners ORDER BY order_index ASC`,
        []
      );

      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Banners list error:', err);
      res.status(500).json({ error: 'Ошибка при получении баннеров' });
    }
  } else if (req.method === 'POST') {
    try {
      const { image_url, link, title, description, order_index, is_active } = req.body;

      if (!image_url) {
        return res.status(400).json({ error: 'URL изображения обязателен' });
      }

      const result = await query(
        `INSERT INTO banners (image_url, link, title, description, order_index, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [image_url, link || null, title || null, description || null, order_index || 0, is_active !== false]
      );

      res.status(201).json({ success: true, id: result.rows[0].id, message: 'Баннер создан' });
    } catch (err) {
      console.error('Banner create error:', err);
      res.status(500).json({ error: 'Ошибка при создании баннера' });
    }
  } else {
    res.status(405).json({ error: 'Метод не разрешён' });
  }
}

export default requireAuth(handler, ['admin']);

