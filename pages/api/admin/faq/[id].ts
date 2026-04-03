import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../lib/db';
import { requireAuth } from '../../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID вопроса обязателен' });
  }

  if (req.method === 'PUT') {
    try {
      const { question, answer, sort_order, is_active } = req.body;

      await query(
        `UPDATE faq SET 
         question = COALESCE($1, question),
         answer = COALESCE($2, answer),
         sort_order = COALESCE($3, sort_order),
         is_active = COALESCE($4, is_active),
         updated_at = NOW()
         WHERE id = $5`,
        [question, answer, sort_order, is_active, parseInt(id)]
      );

      res.status(200).json({ success: true, message: 'Вопрос обновлён' });
    } catch (err) {
      console.error('FAQ update error:', err);
      res.status(500).json({ error: 'Ошибка при обновлении вопроса' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await query(`DELETE FROM faq WHERE id = $1`, [parseInt(id)]);

      res.status(200).json({ success: true, message: 'Вопрос удалён' });
    } catch (err) {
      console.error('FAQ delete error:', err);
      res.status(500).json({ error: 'Ошибка при удалении вопроса' });
    }
  } else {
    res.status(405).json({ error: 'Метод не разрешён' });
  }
}

export default requireAuth(handler, ['admin']);
