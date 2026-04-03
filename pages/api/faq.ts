import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../lib/db';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT id, question, answer, sort_order
         FROM faq WHERE is_active = true
         ORDER BY sort_order ASC`,
        []
      );

      res.status(200).json(result.rows);
    } catch (err) {
      console.error('FAQ GET error:', err);
      res.status(500).json({ error: 'Ошибка при получении FAQ' });
    }
  } else {
    res.status(405).json({ error: 'Метод не разрешён' });
  }
}

export default handler;
