import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { buildUpdateSet } from '@/lib/sqlBuilder';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { slug } = req.query;

      if (slug) {
        const result = await query('SELECT * FROM pages WHERE slug = $1', [slug]);
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Страница не найдена' });
        }
        return res.status(200).json(result.rows[0]);
      }

      const result = await query('SELECT slug, title, updated_at FROM pages ORDER BY slug');
      res.status(200).json({ pages: result.rows });
    } catch {
      res.status(500).json({ error: 'Ошибка загрузки страниц' });
    }
  } else if (req.method === 'POST') {
    try {
      const { slug, title, content } = req.body;
      if (!slug || !title || !content) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await query(
        'INSERT INTO pages (slug, title, content) VALUES ($1, $2, $3) RETURNING *',
        [slug, title, content]
      );
      res.status(200).json({ page: result.rows[0] });
    } catch {
      res.status(500).json({ error: 'Ошибка создания страницы' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { slug, title, content } = req.body;
      if (!slug) return res.status(400).json({ error: 'slug required' });

      // 🔒 Безопасное построение SET clause с белым списком полей
      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (content !== undefined) updates.content = content;

      const [setClause, values, nextIdx] = buildUpdateSet('pages', updates);
      values.push(slug);

      await query(`UPDATE pages SET ${setClause}, updated_at = NOW() WHERE slug = $${nextIdx}`, values);
      res.status(200).json({ success: true });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Pages update error:', error);
      res.status(400).json({ error: error.message || 'Ошибка обновления страницы' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { slug } = req.query;
      if (!slug) return res.status(400).json({ error: 'slug required' });

      await query('DELETE FROM pages WHERE slug = $1', [slug]);
      res.status(200).json({ success: true });
    } catch {
      res.status(500).json({ error: 'Ошибка удаления страницы' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

