import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT id, question, answer, sort_order, is_active, updated_at
         FROM faq ORDER BY sort_order ASC`,
        []
      );

      res.status(200).json(result.rows);
    } catch (err) {
      console.error('FAQ list error:', err);
      res.status(500).json({ error: 'Ошибка при получении FAQ' });
    }
  } else if (req.method === 'POST') {
    try {
      const { question, answer, sort_order, is_active } = req.body;

      if (!question || !answer) {
        return res.status(400).json({ error: 'Заполните вопрос и ответ' });
      }

      const result = await query(
        `INSERT INTO faq (question, answer, sort_order, is_active)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [question, answer, sort_order || 0, is_active !== false]
      );

      res.status(201).json({ success: true, id: result.rows[0].id, message: 'Вопрос добавлен' });
    } catch (err) {
      console.error('FAQ create error:', err);
      res.status(500).json({ error: 'Ошибка при добавлении вопроса' });
    }
  } else {
    res.status(405).json({ error: 'Метод не разрешён' });
  }
}

export default requireAuth(handler, ['admin']);


