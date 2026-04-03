import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';
import { requireAuth } from '../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const userId = req.headers['x-telegram-id'] as string;

    try {
      const result = await query(
        'SELECT * FROM user_levels WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        await query(
          'INSERT INTO user_levels (user_id, level, experience) VALUES ($1, 1, 0)',
          [userId]
        );
        return res.status(200).json({ data: { level: 1, experience: 0, badges: [] } });
      }

      res.status(200).json({ data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch level' });
    }
  } else if (req.method === 'POST') {
    const userId = req.headers['x-telegram-id'] as string;
    const { amount } = req.body;

    try {
      const level = await query('SELECT * FROM user_levels WHERE user_id = $1', [userId]);
      const current = level.rows[0] || { level: 1, experience: 0 };
      const newExp = current.experience + amount;
      const newLevel = Math.floor(newExp / 100) + 1;

      await query(
        'INSERT INTO user_levels (user_id, level, experience) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET level = $2, experience = $3',
        [userId, newLevel, newExp % 100]
      );

      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to add experience' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['customer']);
