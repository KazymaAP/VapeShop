import type { NextApiRequest, NextApiResponse } from 'next';
import { query, transaction } from '../../../../lib/db';
import { requireAuth } from '../../../../lib/auth';
import { logger } from '@/lib/logger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Slug обязателен' });
  }

  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT slug, title, content, seo_description, is_published, updated_at
         FROM pages WHERE slug = $1`,
        [slug]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Страница не найдена' });
      }

      res.status(200).json(result.rows[0]);
    } catch (err) {
      logger.error('Page GET error:', err);
      res.status(500).json({ error: 'Ошибка при получении страницы' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await transaction(async (client) => {
        await client.query(`DELETE FROM pages WHERE slug = $1`, [slug]);
      });

      res.status(200).json({ success: true, message: 'Страница удалена' });
    } catch (err) {
      logger.error('Page DELETE error:', err);
      res.status(500).json({ error: 'Ошибка при удалении страницы' });
    }
  } else {
    res.status(405).json({ error: 'Метод не разрешён' });
  }
}

export default requireAuth(handler, ['admin']);
