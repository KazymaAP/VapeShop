import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await query('SELECT * FROM faq ORDER BY sort_order, id');
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
        'INSERT INTO faq (question, answer, sort_order) VALUES ($1, $2, $3) RETURNING *',
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

      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (question !== undefined) { fields.push(`question = $${idx++}`); values.push(question); }
      if (answer !== undefined) { fields.push(`answer = $${idx++}`); values.push(answer); }
      if (sort_order !== undefined) { fields.push(`sort_order = $${idx++}`); values.push(sort_order); }

      values.push(id);
      await query(`UPDATE faq SET ${fields.join(', ')} WHERE id = $${idx}`, values);
      res.status(200).json({ success: true });
    } catch {
      res.status(500).json({ error: 'Ошибка обновления FAQ' });
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

