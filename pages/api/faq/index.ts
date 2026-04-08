import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { buildUpdateSet } from '@/lib/sqlBuilder';
import { logger } from '@/lib/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // ⚠️ ОПТИМИЗАЦИЯ: SELECT конкретные поля вместо SELECT *
      const result = await query(
        'SELECT id, question, answer, sort_order, created_at, updated_at FROM faq ORDER BY sort_order, id'
      );
      res.status(200).json({ faq: result.rows });
    } catch {
      res.status(500).json({ error: 'Ошибка загрузки FAQ' });
    }
  } else if (req.method === 'POST') {
    try {
      const { question, answer, sort_order } = req.body;
      if (!question || !answer) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await query(
        'INSERT INTO faq (question, answer, sort_order) VALUES ($1, $2, $3) RETURNING id, question, answer, sort_order, created_at, updated_at',
        [question, answer, sort_order || 0]
      );
      res.status(200).json({ faq: result.rows[0] });
    } catch {
      res.status(500).json({ error: 'Ошибка создания FAQ' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, question, answer, sort_order } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });

      // 🔒 Безопасное построение SET clause с белым списком полей
      const updates: Record<string, unknown> = {};
      if (question !== undefined) updates.question = question;
      if (answer !== undefined) updates.answer = answer;
      if (sort_order !== undefined) updates.sort_order = sort_order;

      const [setClause, values, nextIdx] = buildUpdateSet('faq', updates);
      const queryValues: (string | number | boolean | string[] | number[] | null)[] = [
        ...values,
        id,
      ];

      await query(`UPDATE faq SET ${setClause} WHERE id = $${nextIdx}`, queryValues);
      res.status(200).json({ success: true });
    } catch (_e: unknown) {
      logger.error('FAQ update error:', _e);
      res.status(400).json({ error: _e instanceof Error ? _e.message : 'Ошибка обновления FAQ' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });

      await query('DELETE FROM faq WHERE id = $1', [id]);
      res.status(200).json({ success: true });
    } catch {
      res.status(500).json({ error: 'Ошибка удаления FAQ' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
