import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await query(
      `SELECT u.id, u.first_name, u.last_name,
              ul.level, ul.experience,
              COUNT(o.id) as orders_count,
              COALESCE(SUM(o.total), 0) as total_spent
       FROM users u
       LEFT JOIN user_levels ul ON u.id = ul.user_id
       LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'completed'
       WHERE u.role = 'customer'
       GROUP BY u.id, ul.level, ul.experience
       ORDER BY ul.level DESC, ul.experience DESC
       LIMIT 50`,
      []
    );

    res.status(200).json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
}

export default handler;

