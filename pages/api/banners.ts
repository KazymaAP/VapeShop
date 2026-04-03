import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../lib/db';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT id, image_url, link, title, description, order_index
         FROM banners WHERE is_active = true
         ORDER BY order_index ASC`,
        []
      );

      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Banners GET error:', err);
      res.status(500).json({ error: 'Ошибка при получении баннеров' });
    }
  } else {
    res.status(405).json({ error: 'Метод не разрешён' });
  }
}

export default handler;
