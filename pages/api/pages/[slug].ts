import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query;

  if (req.method === 'GET') {
    try {
      if (!slug || typeof slug !== 'string') {
        return res.status(400).json({ error: 'Slug обязателен' });
      }

      const result = await query(
        `SELECT slug, title, content, seo_description, is_published, updated_at
         FROM pages WHERE slug = $1 AND is_published = true`,
        [slug]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Страница не найдена' });
      }

      res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error('Page GET error:', err);
      res.status(500).json({ error: 'Ошибка при получении страницы' });
    }
  } else {
    res.status(405).json({ error: 'Метод не разрешён' });
  }
}

export default handler;
