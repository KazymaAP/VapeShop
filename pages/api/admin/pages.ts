import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT slug, title, seo_description, is_published, updated_at
         FROM pages ORDER BY updated_at DESC`,
        []
      );

      res.status(200).json(result.rows);
    } catch (_err) {
      console.error('Pages list error:', _err);
      res.status(500).json({ error: 'Ошибка при получении списка страниц' });
    }
  } else if (req.method === 'POST') {
    try {
      const { slug, title, content, seo_description, is_published } = req.body;

      if (!slug || !title || !content) {
        return res.status(400).json({ error: 'Заполните обязательные поля' });
      }

      // Upsert (вставить или обновить)
      await query(
        `INSERT INTO pages (slug, title, content, seo_description, is_published, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (slug) DO UPDATE SET
         title = $2, content = $3, seo_description = $4, is_published = $5, updated_at = NOW()`,
        [slug, title, content, seo_description || null, is_published !== false]
      );

      res.status(201).json({ success: true, message: 'Страница сохранена' });
    } catch (_err) {
      console.error('Page create/update error:', _err);
      res.status(500).json({ error: 'Ошибка при сохранении страницы' });
    }
  } else {
    res.status(405).json({ error: 'Метод не разрешён' });
  }
}

export default requireAuth(handler, ['admin']);
